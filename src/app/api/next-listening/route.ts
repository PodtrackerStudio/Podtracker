import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensurePodcast, ensureEpisode } from "@/lib/ensureRecords";
import { getOrCreateWatchlist } from "@/lib/nextListening";
import { appendListItem } from "@/lib/lists";

/**
 * Add a show or episode to the user's Next listening.
 *
 * Direct, like Follow — no picker. `episodeKey` present means the episode is
 * being added; absent means the show itself.
 *
 * `ensurePodcast` / `ensureEpisode` materialise the rows the ListItem
 * foreign-keys to, same as every other write on this site.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { externalId, episodeKey } = await request.json().catch(() => ({}));
  if (!externalId) return NextResponse.json({ error: "Missing externalId." }, { status: 400 });

  try {
    let podcastId: string | null = null;
    let episodeId: string | null = null;

    if (episodeKey) {
      episodeId = await ensureEpisode(String(externalId), String(episodeKey));
      if (!episodeId) {
        return NextResponse.json({ error: "That episode could not be found in the show's feed." }, { status: 404 });
      }
    } else {
      podcastId = await ensurePodcast(String(externalId));
    }

    const listId = await getOrCreateWatchlist(user.id);

    // Shared with /api/lists/items: adding the same thing twice is a no-op
    // rather than a duplicate tile, and ListItem.position has no default so
    // the next position is read and incremented.
    const { added } = await appendListItem(listId, { podcastId, episodeId });

    return NextResponse.json({ ok: true, added: true, alreadyThere: !added });
  } catch {
    return NextResponse.json({ error: "Could not add that." }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { externalId, episodeKey } = await request.json().catch(() => ({}));
  if (!externalId) return NextResponse.json({ error: "Missing externalId." }, { status: 400 });

  // No ensure* here: you cannot have added something whose rows were never
  // created, so a missing row just means there is nothing to remove.
  const list = await db.list.findFirst({ where: { userId: user.id, isWatchlist: true }, select: { id: true } });
  if (!list) return NextResponse.json({ ok: true, added: false });

  const podcast = await db.podcast.findUnique({ where: { externalId: String(externalId) }, select: { id: true } });
  if (!podcast) return NextResponse.json({ ok: true, added: false });

  if (episodeKey) {
    const episodes = await db.episode.findMany({ where: { podcastId: podcast.id }, select: { id: true, externalId: true } });
    const { episodeKeyFromGuid } = await import("@/lib/episodeKey");
    const match = episodes.find((e) => e.externalId && episodeKeyFromGuid(e.externalId) === String(episodeKey));
    if (match) await db.listItem.deleteMany({ where: { listId: list.id, episodeId: match.id } });
  } else {
    await db.listItem.deleteMany({ where: { listId: list.id, podcastId: podcast.id } });
  }

  return NextResponse.json({ ok: true, added: false });
}
