import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensurePodcast } from "@/lib/ensureRecords";

/**
 * Follow / unfollow a show.
 *
 * Takes the **iTunes id** (what the route uses), not a database id — the client
 * never sees internal ids. `ensurePodcast` materialises the row on the way in,
 * which is what makes the foreign key resolve.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { externalId } = await request.json().catch(() => ({}));
  if (!externalId) return NextResponse.json({ error: "Missing externalId." }, { status: 400 });

  let podcastId: string;
  try {
    podcastId = await ensurePodcast(String(externalId));
  } catch {
    return NextResponse.json({ error: "Could not look up that podcast." }, { status: 502 });
  }

  await db.podcastFollow.upsert({
    where: { userId_podcastId: { userId: user.id, podcastId } },
    create: { userId: user.id, podcastId },
    update: {},
  });

  return NextResponse.json({ ok: true, following: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { externalId } = await request.json().catch(() => ({}));
  if (!externalId) return NextResponse.json({ error: "Missing externalId." }, { status: 400 });

  // No ensurePodcast here: you cannot be following a show that was never
  // created, so a missing row simply means there is nothing to remove.
  const podcast = await db.podcast.findUnique({
    where: { externalId: String(externalId) },
    select: { id: true },
  });
  if (podcast) {
    await db.podcastFollow.deleteMany({ where: { userId: user.id, podcastId: podcast.id } });
  }

  return NextResponse.json({ ok: true, following: false });
}
