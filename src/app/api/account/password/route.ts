import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getCurrentUser, verifyPassword, hashPassword, hashToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { checkPassword } from "@/lib/passwordPolicy";
import { rateLimit, resetRateLimit, clientKey, AUTH_LIMIT, RATE_LIMITED_MESSAGE } from "@/lib/rateLimit";
import { reportDatabaseFailure } from "@/lib/dbError";

/**
 * Change the signed-in user's password (Account Settings → Authentication).
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  // Limited like login, because it takes the current password: without this,
  // anyone who got hold of a session could guess the password here as fast as
  // they liked. Keyed on the account, so it follows the user rather than the IP.
  const limitKey = clientKey(request, "password", user.id);
  const limited = rateLimit(limitKey, AUTH_LIMIT);
  if (!limited.allowed) {
    return NextResponse.json({ error: RATE_LIMITED_MESSAGE }, {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSeconds) },
    });
  }

  const { currentPassword, newPassword, confirmPassword } = await request.json();

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

  try {
    // Fetched deliberately, and only the hash. `getCurrentUser` no longer
    // returns it — see the note there.
    const credentials = await db.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!credentials) {
      return NextResponse.json({ error: "Not logged in." }, { status: 401 });
    }

    const ok = await verifyPassword(currentPassword, credentials.passwordHash);
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

    // They proved they know the password, so the failed-attempt count is stale.
    resetRateLimit(limitKey);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: reportDatabaseFailure("password-change", error) }, { status: 503 });
  }
}
