import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  verifyPassword,
  createSession,
  SESSION_COOKIE_NAME,
  TIMING_EQUALISER_HASH,
} from "@/lib/auth";
import { rateLimit, resetRateLimit, clientKey, AUTH_LIMIT, RATE_LIMITED_MESSAGE } from "@/lib/rateLimit";
import { reportDatabaseFailure } from "@/lib/dbError";

export async function POST(request: Request) {
  const { email, password, remember } = await request.json();

  if (!email?.trim() || !password) {
    return NextResponse.json({ error: "Please enter both an email and a password." }, { status: 400 });
  }

  // Each request here is a password guess. Without a limit an attacker could
  // try them as fast as the network allowed; this is the single most important
  // change in this file.
  const limitKey = clientKey(request, "login", email);
  const limited = rateLimit(limitKey, AUTH_LIMIT);
  if (!limited.allowed) {
    return NextResponse.json({ error: RATE_LIMITED_MESSAGE }, {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSeconds) },
    });
  }

  // See the note in the signup route: past validation this is all database
  // work, and an outage must not be reported as a wrong password.
  try {
    const user = await db.user.findUnique({
      where: { email: email.trim() },
      // Only what this route needs. The hash is required here, which is exactly
      // why it is fetched explicitly rather than coming along for the ride.
      select: { id: true, username: true, passwordHash: true },
    });

    // Always run bcrypt, even when no account exists, comparing against a
    // throwaway hash. Previously this was skipped for unknown emails, so they
    // answered in milliseconds while real ones took ~300ms — a difference
    // measurable from outside, which let anyone test whether a given address has
    // an account here. The result for an unknown email is discarded.
    const matches = await verifyPassword(password, user?.passwordHash ?? TIMING_EQUALISER_HASH);
    const valid = Boolean(user) && matches;

    if (!user || !valid) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    const token = await createSession(user.id);

    // Signed in successfully, so the failed-attempt count is stale — otherwise a
    // shared office IP could lock out the next person to log in.
    resetRateLimit(limitKey);

    const response = NextResponse.json({ id: user.id, username: user.username });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      // "Remember me" unchecked -> session-only cookie (cleared when the browser closes).
      // The underlying Session row still lasts 30 days either way (see createSession).
      ...(remember ? { maxAge: 60 * 60 * 24 * 30 } : {}),
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: reportDatabaseFailure("login", error) }, { status: 503 });
  }
}
