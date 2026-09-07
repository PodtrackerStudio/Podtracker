import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit, clientKey, AUTH_LIMIT, RATE_LIMITED_MESSAGE } from "@/lib/rateLimit";

/**
 * Send a password-reset email.
 *
 * **Always answers the same, whether or not the address has an account.** Saying
 * "no account with that email" would turn this form into a way of testing which
 * addresses are registered — the enumeration problem that signup still has and
 * this one does not have to inherit.
 */
export async function POST(request: Request) {
  const { email } = await request.json().catch(() => ({}));

  // Deliberately identical to the success response.
  const sameAnswer = NextResponse.json({
    ok: true,
    message: "If there's an account with that email, a reset link is on its way.",
  });

  if (!email?.trim()) {
    return NextResponse.json({ error: "Please enter your email address." }, { status: 400 });
  }

  const limited = rateLimit(clientKey(request, "forgot", email), AUTH_LIMIT);
  if (!limited.allowed) {
    return NextResponse.json({ error: RATE_LIMITED_MESSAGE }, {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSeconds) },
    });
  }

  const supabase = await createSupabaseServerClient();

  // Built from the incoming request rather than a hardcoded host, so this works
  // on localhost and in production without a second env var. The address must
  // also be listed under Redirect URLs in the Supabase dashboard, or the link in
  // the email refuses to open.
  const origin = new URL(request.url).origin;

  await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // The result is ignored on purpose: an error here would reveal whether the
  // address exists, which is exactly what this route refuses to disclose.
  return sameAnswer;
}
