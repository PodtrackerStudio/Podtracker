import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { siteOrigin } from "@/lib/siteUrl";
import { rateLimit, clientKey, AUTH_LIMIT, RATE_LIMITED_MESSAGE } from "@/lib/rateLimit";

/**
 * Send the confirmation email again.
 *
 * **Why this has to exist.** With confirmation switched on, an account is
 * unusable until the link is clicked — and the first email lands in spam, gets
 * deleted, or expires often enough that without a resend the only way out is
 * asking an administrator to delete the account. The email is already taken, so
 * signing up again fails too. That is a dead end a real person will hit in the
 * first week.
 *
 * **The response never says whether the address exists.** Telling an anonymous
 * caller "no account with that email" turns this route into a way to test
 * whether someone has registered here — which is exactly the kind of thing a
 * podcast-review site should not leak about its users. Supabase's own errors
 * are logged but not returned.
 */
export async function POST(request: Request) {
  const { email } = await request.json().catch(() => ({}));

  if (!email?.trim()) {
    return NextResponse.json({ error: "Please enter your email address." }, { status: 400 });
  }
  const cleanEmail = email.trim();

  // Keyed on the address as well as the caller, so one person cannot use this
  // to mail-bomb someone else's inbox by resending over and over.
  const limited = rateLimit(clientKey(request, "resend-confirmation", cleanEmail), AUTH_LIMIT);
  if (!limited.allowed) {
    return NextResponse.json({ error: RATE_LIMITED_MESSAGE }, {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSeconds) },
    });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: true });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: cleanEmail,
    options: { emailRedirectTo: `${siteOrigin(request)}/auth/callback?next=/home` },
  });

  if (error) {
    // Logged, never returned — see the note above. The common cases here are a
    // confirmed account (nothing to resend) and an address that was never
    // registered, and both should look identical from outside.
    console.error("[resend-confirmation] supabase rejected:", error.status, error.message);
  }

  return NextResponse.json({ ok: true });
}
