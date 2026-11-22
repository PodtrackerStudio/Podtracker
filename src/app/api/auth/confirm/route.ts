import { NextResponse, after } from "next/server";
import { track } from "@vercel/analytics/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { siteOrigin } from "@/lib/siteUrl";
import { PENDING_CONFIRMATION_COOKIE, parsePendingConfirmations } from "@/lib/pendingConfirmation";

/**
 * Spends the token from an emailed link — and only ever on a POST.
 *
 * The matching GET page renders a button and verifies nothing, so the link in
 * somebody's inbox survives being fetched by Outlook Safe Links, antivirus,
 * and chat-app link previewers. Those issue GETs; none of them submit a form.
 * See `src/app/auth/confirm/page.tsx` for the full reasoning.
 *
 * A POST is also the honest verb here: this changes server state, by consuming
 * a one-time token and creating a session.
 */

/**
 * `magiclink` is not here: the site never sends one, and anyone can request a
 * magic link for their own address from Supabase's public API — a ready-made
 * token for signing a victim into the attacker's account.
 */
const ALLOWED_TYPES = new Set<EmailOtpType>([
  "recovery",
  "signup",
  "invite",
  "email",
  "email_change",
]);

/**
 * Links that sign the clicker in, and that a stranger can mint for an account
 * of their own. Only honoured as a sign-in when this browser asked for one —
 * see `src/lib/pendingConfirmation.ts`.
 *
 * `recovery` is left out because opening a reset email on a phone is normal
 * and must keep working; `/reset-password` names the account instead. `invite`
 * needs the service-role key to create, so a stranger cannot make one.
 */
const SIGN_IN_ONLY_IF_REQUESTED = new Set<EmailOtpType>(["signup", "email", "email_change"]);

/** Where each kind of link should land once the token has been spent. */
function destinationFor(type: EmailOtpType, requested: string | null): string {
  // A recovery link proves control of an inbox, not knowledge of the password,
  // so it goes to the form that sets a new one — never to the signed-in site,
  // and never anywhere the link itself asked for.
  if (type === "recovery") return "/reset-password";

  // Must be a relative path, and not "//evil.com", which a browser reads as a
  // protocol-relative URL to another host.
  if (requested && requested.startsWith("/") && !requested.startsWith("//")) return requested;
  return "/home";
}

export async function POST(request: Request) {
  const origin = siteOrigin(request);
  const form = await request.formData().catch(() => null);

  const tokenHash = form?.get("token_hash");
  const type = form?.get("type");
  const next = form?.get("next");

  if (typeof tokenHash !== "string" || typeof type !== "string" || !ALLOWED_TYPES.has(type as EmailOtpType)) {
    return NextResponse.redirect(`${origin}/login?error=bad-link`, { status: 303 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    type: type as EmailOtpType,
    token_hash: tokenHash,
  });

  if (error) {
    console.error("[auth/confirm] verifyOtp failed:", type, error.status, error.message);
    return NextResponse.redirect(`${origin}/login?error=link-expired`, { status: 303 });
  }

  // An address that was signed up for more than once before being confirmed
  // may be carrying a password chosen by somebody who never had the inbox —
  // see `must_set_password` in the signup route. Clicking the link is the
  // proof of the inbox, so the person who clicked chooses the password now.
  if (type !== "recovery") {
    const { data } = await supabase.auth.getUser();
    if (data.user?.app_metadata?.must_set_password) {
      return NextResponse.redirect(`${origin}/reset-password`, { status: 303 });
    }

    // A link this browser did not ask for: the address is confirmed (the token
    // was good), but nobody is signed in on the strength of it.
    if (SIGN_IN_ONLY_IF_REQUESTED.has(type as EmailOtpType)) {
      const pending = parsePendingConfirmations((await cookies()).get(PENDING_CONFIRMATION_COOKIE)?.value);
      const addresses = [data.user?.email, data.user?.new_email]
        .filter((e): e is string => typeof e === "string")
        .map((e) => e.toLowerCase());
      if (!addresses.some((a) => pending.includes(a))) {
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
        return NextResponse.redirect(`${origin}/login?confirm=done`, { status: 303 });
      }
    }
  }

  // The last step of the signup funnel, as a Vercel custom event. Our own
  // funnel reads confirmation from Supabase directly (src/lib/funnel.ts).
  if (type === "signup" || type === "email") {
    after(() => track("Email Confirmed", {}, { request }).catch(() => {}));
  }

  // 303 so the browser follows with a GET rather than re-POSTing to the
  // destination, which is what a plain redirect after a form submit would do.
  return NextResponse.redirect(
    `${origin}${destinationFor(type as EmailOtpType, typeof next === "string" ? next : null)}`,
    { status: 303 },
  );
}
