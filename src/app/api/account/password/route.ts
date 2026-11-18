import { NextResponse } from "next/server";
import { getCurrentUser, authErrorMessage } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkPassword } from "@/lib/passwordPolicy";
import { rateLimitDurable, resetRateLimitDurable, tooManyRequests, AUTH_LIMIT } from "@/lib/rateLimit";

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

  // Per account only: the caller is already signed in, so the account is the
  // thing being guessed at, whatever address the guesses come from.
  const limitKey = `password:acct:${user.id}`;
  const limited = await rateLimitDurable(limitKey, AUTH_LIMIT);
  if (!limited.allowed) return tooManyRequests(limited);

  const { currentPassword, newPassword, confirmPassword } = (await request.json().catch(() => null)) ?? {};

  if (typeof currentPassword !== "string" || typeof newPassword !== "string" || typeof confirmPassword !== "string" || !currentPassword || !newPassword || !confirmPassword) {
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

  // The address Supabase holds, not the profile's copy. They can differ while an
  // email change waits for its confirmation link, and before 2026-11-06 Settings
  // could make them differ permanently. Signing in with the profile's copy then
  // failed every time, reported as "Current password is incorrect".
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser?.email) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  // Proves they know the current password. This re-issues the session cookies
  // for the same user, which is harmless — they are already that user.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: authUser.email,
    password: currentPassword,
  });
  if (verifyError) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    console.error("[password-change] supabase rejected:", updateError.message);
    return NextResponse.json({ error: authErrorMessage(updateError.message) }, { status: 400 });
  }

  await resetRateLimitDurable(limitKey);
  return NextResponse.json({ ok: true });
}
