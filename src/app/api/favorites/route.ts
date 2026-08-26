import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensurePodcast } from "@/lib/ensureRecords";

/**
 * Favourite a show — and follow it at the same time.
 *
 * **Favouriting follows.** Sasha's call: `/following` lists the shows you
 * follow, so a show added through "Add Favorites" has to be followed or it
 * would be added to a page it then doesn't appear on. The `Favorite` row is
 * kept alongside, so "things I picked as favourites" stays distinguishable from
 * "everything I follow" if that distinction is ever wanted.
 *
 * **This used to take a database `podcastId`**, which no client ever has — the
 * browser only ever sees iTunes ids — so it could not be called from anywhere.
 * It now takes `externalId` and materialises the row itself, exactly like
 * `/api/follow`.
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

  // One transaction: a favourite that failed to follow would sit in the table
  // invisible to the only page that reads either of them.
  await db.$transaction([
    db.favorite.upsert({
      where: { userId_podcastId: { userId: user.id, podcastId } },
      create: { userId: user.id, podcastId },
      update: {},
    }),
    db.podcastFollow.upsert({
      where: { userId_podcastId: { userId: user.id, podcastId } },
      create: { userId: user.id, podcastId },
      update: {},
    }),
  ]);

  return NextResponse.json({ ok: true, favorited: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { externalId } = await request.json().catch(() => ({}));
  if (!externalId) return NextResponse.json({ error: "Missing externalId." }, { status: 400 });

  // No ensurePodcast here: you cannot have favourited a show whose row was
  // never created, so a missing row means there is nothing to remove.
  const podcast = await db.podcast.findUnique({ where: { externalId: String(externalId) }, select: { id: true } });
  if (podcast) {
    // Symmetric with POST — un-favouriting takes it off the page it was added
    // to, rather than leaving a followed show behind with no favourite.
    await db.$transaction([
      db.favorite.deleteMany({ where: { userId: user.id, podcastId: podcast.id } }),
      db.podcastFollow.deleteMany({ where: { userId: user.id, podcastId: podcast.id } }),
    ]);
  }

  return NextResponse.json({ ok: true, favorited: false });
}
