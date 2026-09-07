import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Where Supabase's emailed links land — password resets today, email
 * confirmation too once that is switched on.
 *
 * The link carries a one-time `code`. Exchanging it here, in a Route Handler,
 * is what turns it into a session: this is one of the few places cookies are
 * writable, which a Server Component is not.
 *
 * `next` decides where to send them afterwards; it is checked to be a path on
 * this site, because an unchecked redirect target is an open redirect — an
 * attacker could mail a genuine-looking Podtracker link that bounces the victim
 * to their own page.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requested = searchParams.get("next") ?? "/";

  // Must be a relative path, and not "//evil.com" — which a browser reads as a
  // protocol-relative URL to another host.
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing-code`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Usually an expired or already-used link — both are one-time.
    return NextResponse.redirect(`${origin}/login?error=link-expired`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
