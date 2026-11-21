import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Where Supabase's emailed links land — password resets and email confirmation.
 *
 * Turning the link into a session has to happen in a Route Handler: it writes
 * cookies, which a Server Component cannot.
 *
 * **Supabase sends two different link shapes and this has to accept both.**
 * That was a real bug, not a theoretical one: password reset links arrived
 * carrying `token_hash` and `type`, this route looked only for `code`, found
 * none, and bounced everyone to `/login?error=missing-code`. From the outside
 * it looked like clicking the link simply returned you to the login page.
 *
 *   - `?code=…` — the PKCE flow. Exchanged with `exchangeCodeForSession`, and
 *     it only works in the same browser that made the request, because the
 *     matching verifier is in a cookie there.
 *   - `?token_hash=…&type=recovery` — what the default email templates
 *     produce. Verified with `verifyOtp`, and works in any browser, which is
 *     what someone opening a reset link on their phone needs.
 *
 * `next` decides where to send them afterwards; it is checked to be a path on
 * this site, because an unchecked redirect target is an open redirect — an
 * attacker could mail a genuine-looking Podtracker link that bounces the victim
 * to their own page.
 */

/** The link types Supabase can send here. Anything else is not ours to verify. */
const ALLOWED_TYPES = new Set<EmailOtpType>([
  "recovery",
  "signup",
  "invite",
  "email",
  "email_change",
]);

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const requested = searchParams.get("next") ?? "/";

  // Must be a relative path, and not "//evil.com" — which a browser reads as a
  // protocol-relative URL to another host.
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";

  // **A `token_hash` is never spent on a GET.** This route used to verify it
  // right here, which had two problems. Anyone could mail a victim a link
  // carrying *their own* token: opening it silently signed the victim into the
  // attacker's account, and whatever they then logged or reviewed landed there.
  // And a mail scanner fetching the link burned it before the person clicked.
  // `/auth/confirm` exists to fix both — it shows a button, and only the POST
  // behind it (which refuses cross-site requests) spends the token. Old emails
  // that still point here are forwarded to it rather than broken.
  if (tokenHash && type && ALLOWED_TYPES.has(type as EmailOtpType)) {
    const forward = new URLSearchParams({ token_hash: tokenHash, type });
    if (next !== "/") forward.set("next", next);
    return NextResponse.redirect(`${origin}/auth/confirm?${forward}`);
  }

  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // Usually an expired or already-used link — both are one-time — or the
      // link being opened in a different browser from the one that asked.
      console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
      return NextResponse.redirect(`${origin}/login?error=link-expired`);
    }
    return NextResponse.redirect(`${origin}${next}`);
  }

  console.error("[auth/callback] link carried neither code nor token_hash:", request.url);
  return NextResponse.redirect(`${origin}/login?error=bad-link`);
}
