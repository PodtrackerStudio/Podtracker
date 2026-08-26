import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensurePodcast, ensureEpisode } from "@/lib/ensureRecords";
import { appendListItem } from "@/lib/lists";

/**
 * Add one show or episode to a list the user already made.
 *
 * This is what the "Add podcasts…" bar on `/list/[id]` posts to — the same bar
 * Next listening uses, pointed at a different endpoint. Next listening keeps
 * its own route because it has no id: there is exactly one per user and it is
 * created on first add.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { listId, externalId, episodeKey } = await request.json().catch(() => ({}));
  if (!listId || !externalId) return NextResponse.json({ error: "Missing listId or externalId." }, { status: 400 });

  const list = await db.list.findUnique({
    where: { id: String(listId) },
    select: { id: true, userId: true, isWatchlist: true },
  });
  if (!list) return NextResponse.json({ error: "That list no longer exists." }, { status: 404 });
  if (list.userId !== user.id) return NextResponse.json({ error: "That isn't your list." }, { status: 403 });
  // Next listening is a List too; it has its own endpoint and its own page.
  if (list.isWatchlist) return NextResponse.json({ error: "Use /api/next-listening for that." }, { status: 400 });

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

    const { added } = await appendListItem(list.id, { podcastId, episodeId });
    return NextResponse.json({ ok: true, added: true, alreadyThere: !added });
  } catch {
    return NextResponse.json({ error: "Could not add that." }, { status: 502 });
  }
}
