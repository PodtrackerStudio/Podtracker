import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { podcastId } = await request.json();
  if (!podcastId) return NextResponse.json({ error: "Missing podcastId." }, { status: 400 });

  await db.favorite.upsert({
    where: { userId_podcastId: { userId: user.id, podcastId } },
    create: { userId: user.id, podcastId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { podcastId } = await request.json();
  if (!podcastId) return NextResponse.json({ error: "Missing podcastId." }, { status: 400 });

  await db.favorite.deleteMany({ where: { userId: user.id, podcastId } });

  return NextResponse.json({ ok: true });
}
