import { NextResponse } from "next/server";
import { authErrorMessage } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { checkPassword } from "@/lib/passwordPolicy";
import { rateLimitDurable, tooManyRequests, AUTH_LIMIT } from "@/lib/rateLimit";

/**
 * Set a new password after following a reset link.
 *
 * No current password is asked for, and that is correct here: the reset link
 * itself was the proof. **So this route has to check that a link is how the
 * session began.** It used to check only that somebody was signed in, which
 * made it a way round the current-password check on `/api/account/password`:
 * anyone at an unattended signed-in browser, or holding a stolen session, could
 * POST here and take the account.
 *
 * The proof is the session's `amr` claim — how it was authenticated. A session
 * that came from an emailed link carries `recovery` or `otp`; one from typing
 * a password carries `password`. It must also be recent: a link is good for
 * setting a password now, not next month.
 */

/** How long after clicking the link the form stays usable. */
const LINK_SESSION_MAX_AGE_SECONDS = 60 * 60;

/** `amr` methods that mean "came through an emailed link". */
const LINK_METHODS = new Set(["recovery", "otp", "magiclink", "invite", "email/signup", "email_change"]);

export async function POST(request: Request) {
  const { newPassword, confirmPassword } = (await request.json().catch(() => null)) ?? {};

  if (typeof newPassword !== "string" || typeof confirmPassword !== "string" || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: "Please fill in both fields." }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "The passwords don't match." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const expired = NextResponse.json(
    { error: "That reset link has expired. Please request a new one." },
    { status: 401 },
  );
  if (!user) return expired;

  const limited = await rateLimitDurable(`reset-password:acct:${user.id}`, AUTH_LIMIT);
  if (!limited.allowed) return tooManyRequests(limited);

  const { data: claimsData } = await supabase.auth.getClaims();
  // Normally `{ method, timestamp }` entries. A custom access-token hook can
  // make them bare strings, which carry no time to check.
  const amr = (claimsData?.claims?.amr ?? []) as ({ method?: string; timestamp?: number } | string)[];
  const now = Math.floor(Date.now() / 1000);
  const cameFromLink = amr.some((entry) => {
    if (typeof entry === "string") return LINK_METHODS.has(entry);
    return (
      typeof entry?.method === "string" &&
      LINK_METHODS.has(entry.method) &&
      typeof entry.timestamp === "number" &&
      now - entry.timestamp <= LINK_SESSION_MAX_AGE_SECONDS
    );
  });
  if (!cameFromLink) {
    // Signed in, but not by a recent link. Settings is where a signed-in
    // person changes their password, and it asks for the current one.
    console.warn("[reset-password] refused: session did not come from a recent emailed link", amr.map((a) => (typeof a === "string" ? a : a?.method)));
    return expired;
  }

  const policy = checkPassword(newPassword, [user.email]);
  if (!policy.ok) {
    return NextResponse.json({ error: policy.error }, { status: 400 });
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    console.error("[reset-password] supabase rejected:", error.message);
    return NextResponse.json({ error: authErrorMessage(error.message) }, { status: 400 });
  }

  // Set by signup when an address was signed up for more than once before
  // being confirmed — see `must_set_password` there. Cleared now that the
  // person holding the inbox has chosen the password. Best effort.
  if (user.app_metadata?.must_set_password && isSupabaseAdminConfigured) {
    await createSupabaseAdminClient()
      .auth.admin.updateUserById(user.id, { app_metadata: { must_set_password: false } })
      .catch((e) => console.error("[reset-password] could not clear must_set_password:", e?.message));
  }

  return NextResponse.json({ ok: true });
}
