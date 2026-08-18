import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getCurrentUser, verifyPassword, hashPassword, hashToken, SESSION_COOKIE_NAME } from "@/lib/auth";

/**
 * Change the signed-in user's password (Account Settings → Authentication).
 *
 * Unlike the podcast write layer, this is fully wired: auth already runs on
 * bcrypt + Postgres sessions, so nothing here is deferred.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { currentPassword, newPassword, confirmPassword } = await request.json();

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: "Please fill in every field." }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "The new passwords don't match." }, { status: 400 });
  }
  // Same minimum the signup form enforces.
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "New password needs 6+ characters." }, { status: 400 });
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: "That's already your password." }, { status: 400 });
  }

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  // Sign out everywhere else. If the password was changed because someone else
  // had it, leaving their session alive would defeat the point. The current
  // session is kept so the user isn't kicked out of the page they're on.
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  await db.session.deleteMany({
    where: {
      userId: user.id,
      ...(currentToken ? { NOT: { tokenHash: hashToken(currentToken) } } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
