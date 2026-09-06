import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createSession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { reportDatabaseFailure } from "@/lib/dbError";

export async function POST(request: Request) {
  const { email, username, password } = await request.json();

  if (!email?.trim() || !username?.trim() || !password || password.length < 6) {
    return NextResponse.json({ error: "Please fill in every field (password needs 6+ characters)." }, { status: 400 });
  }

  // Everything past validation is a database call, so anything thrown here is a
  // database problem. Without this the route 500s with an empty body and the
  // form falls back to "Something went wrong", which reads as a rejected
  // password rather than an outage.
  try {
    const existing = await db.user.findFirst({
      where: { OR: [{ email: email.trim() }, { username: username.trim() }] },
    });
    if (existing) {
      return NextResponse.json({ error: "An account with that email or username already exists." }, { status: 409 });
    }

    const user = await db.user.create({
      data: {
        email: email.trim(),
        username: username.trim(),
        displayName: username.trim(),
        passwordHash: await hashPassword(password),
      },
    });

    const token = await createSession(user.id);

    const response = NextResponse.json({ id: user.id, username: user.username });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    // 503, not 500: the request was fine, the dependency is down.
    return NextResponse.json({ error: reportDatabaseFailure("signup", error) }, { status: 503 });
  }
}
