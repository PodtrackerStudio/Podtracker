import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { username, email, displayName, externalLink, bio, avatarUrl } = await request.json();

  if (!username?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Username and email can't be empty." }, { status: 400 });
  }

  const existing = await db.user.findFirst({
    where: {
      id: { not: user.id },
      OR: [{ username: username.trim() }, { email: email.trim() }],
    },
  });
  if (existing) {
    return NextResponse.json({ error: "That username or email is already taken." }, { status: 409 });
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      username: username.trim(),
      email: email.trim(),
      displayName: displayName?.trim() || username.trim(),
      externalLink: externalLink?.trim() || null,
      bio: bio?.trim() || null,
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    },
  });

  return NextResponse.json({ username: updated.username });
}
