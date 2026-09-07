import { NextResponse } from "next/server";
import { authErrorMessage } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkPassword } from "@/lib/passwordPolicy";

/**
 * Set a new password after following a reset link.
 *
 * No current password is asked for, and that is correct here: the reset link
 * itself was the proof, exchanged for a session by `/auth/callback`. If there is
 * no session, the person did not come through a valid link and gets nothing.
 */
export async function POST(request: Request) {
  const { newPassword, confirmPassword } = await request.json().catch(() => ({}));

  if (!newPassword || !confirmPassword) {
    return NextResponse.json({ error: "Please fill in both fields." }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "The passwords don't match." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "That reset link has expired. Please request a new one." },
      { status: 401 },
    );
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

  return NextResponse.json({ ok: true });
}
