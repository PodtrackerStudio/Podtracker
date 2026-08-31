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

/**
 * Remove one item from a list.
 *
 * Takes the **`ListItem` id**, not an externalId — every page that renders an
 * item already has it (`ListItemView.itemId`), and it identifies the row
 * exactly, so a list holding the same show twice can't lose the wrong one.
 *
 * Unlike `POST`, this **does not exclude the watchlist**. Next listening is a
 * `List` too, and its tiles need the same remove control; ownership is what
 * matters here, not which kind of list it is.
 *
 * `position` is deliberately left alone on the surviving rows. It only has to
 * order them, not be contiguous, and renumbering would rewrite a curator's
 * ranking every time they removed something.
 */
export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { itemId } = await request.json().catch(() => ({}));
  if (!itemId) return NextResponse.json({ error: "Missing itemId." }, { status: 400 });

  const item = await db.listItem.findUnique({
    where: { id: String(itemId) },
    select: { id: true, list: { select: { userId: true } } },
  });
  // Already gone is a success: two clicks on the same tile shouldn't error.
  if (!item) return NextResponse.json({ ok: true, removed: false });
  if (item.list.userId !== user.id) return NextResponse.json({ error: "That isn't your list." }, { status: 403 });

  await db.listItem.delete({ where: { id: item.id } });
  return NextResponse.json({ ok: true, removed: true });
}
