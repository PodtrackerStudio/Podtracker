import { NextResponse } from "next/server";
import { getCurrentUser, authErrorMessage } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkPassword } from "@/lib/passwordPolicy";
import { rateLimit, resetRateLimit, clientKey, AUTH_LIMIT, RATE_LIMITED_MESSAGE } from "@/lib/rateLimit";

/**
 * Change the signed-in user's password (Account Settings → Authentication).
 *
 * The current password is still required even though Supabase's `updateUser`
 * does not ask for it. Without that check, anyone who got hold of an unattended
 * signed-in browser could change the password and take the account outright.
 * It is verified by attempting a sign-in with it.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const limitKey = clientKey(request, "password", user.id);
  const limited = rateLimit(limitKey, AUTH_LIMIT);
  if (!limited.allowed) {
    return NextResponse.json({ error: RATE_LIMITED_MESSAGE }, {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSeconds) },
    });
  }

  const { currentPassword, newPassword, confirmPassword } = await request.json().catch(() => ({}));

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: "Please fill in every field." }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "The new passwords don't match." }, { status: 400 });
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: "That's already your password." }, { status: 400 });
  }

  const policy = checkPassword(newPassword, [user.email, user.username]);
  if (!policy.ok) {
    return NextResponse.json({ error: policy.error }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  // Proves they know the current password. This re-issues the session cookies
  // for the same user, which is harmless — they are already that user.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    return NextResponse.json({ error: authErrorMessage(updateError.message) }, { status: 400 });
  }

  resetRateLimit(limitKey);
  return NextResponse.json({ ok: true });
}
