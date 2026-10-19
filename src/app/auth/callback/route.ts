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
  "magiclink",
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

  const supabase = await createSupabaseServerClient();

  if (tokenHash && type && ALLOWED_TYPES.has(type as EmailOtpType)) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });
    if (error) {
      console.error("[auth/callback] verifyOtp failed:", type, error.message);
      return NextResponse.redirect(`${origin}/login?error=link-expired`);
    }
    // A recovery link proves control of the inbox, not knowledge of the
    // password, so it lands on the form that sets a new one rather than on the
    // signed-in site.
    return NextResponse.redirect(`${origin}${type === "recovery" ? "/reset-password" : next}`);
  }

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
