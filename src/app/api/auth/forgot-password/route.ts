import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit, clientKey, AUTH_LIMIT, RATE_LIMITED_MESSAGE } from "@/lib/rateLimit";
import { siteOrigin } from "@/lib/siteUrl";

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

  // See `siteOrigin` — behind Vercel's proxy the request the handler sees can
  // carry http:// and an internal host, which would put a downgraded, rejected
  // link in somebody's inbox.
  const origin = siteOrigin(request);

  await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // The result is ignored on purpose: an error here would reveal whether the
  // address exists, which is exactly what this route refuses to disclose.
  return sameAnswer;
}
