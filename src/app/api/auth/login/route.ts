import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSession, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  const { email, password, remember } = await request.json();

  if (!email?.trim() || !password) {
    return NextResponse.json({ error: "Please enter both an email and a password." }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email: email.trim() } });
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !valid) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const token = await createSession(user.id);

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
}
