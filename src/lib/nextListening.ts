import { db } from "./db";
import { toListItemViews, type ListItemView } from "./lists";

export const NEXT_LISTENING_TITLE = "Next listening";

/**
 * The user's single Next listening collection, created on first use.
 *
 * Stored as a `List` with `isWatchlist: true` rather than its own table, so it
 * reuses `ListItem` and everything that already understands list items. The
 * flag is what keeps it out of the places real lists are shown — see the
 * schema comment.
 */
export async function getOrCreateWatchlist(userId: string): Promise<string> {
  const existing = await db.list.findFirst({ where: { userId, isWatchlist: true }, select: { id: true } });
  if (existing) return existing.id;

  const created = await db.list.create({
    data: { userId, title: NEXT_LISTENING_TITLE, isWatchlist: true },
    select: { id: true },
  });
  return created.id;
}

/** Same shape as any other list row — see `toListItemViews`. */
export type NextListeningItem = ListItemView;

/**
 * What's in the user's Next listening, newest first.
 *
 * Returns [] when they have no watchlist yet — reading must never create one,
 * or simply viewing a profile would write to the database.
 */
export async function getNextListening(userId: string): Promise<NextListeningItem[]> {
  const list = await db.list.findFirst({
    where: { userId, isWatchlist: true },
    select: {
      items: {
        // Newest first, unlike a curated list, which keeps the curator's order.
        orderBy: { position: "desc" },
        include: { podcast: true, episode: { include: { podcast: true } } },
      },
    },
  });
  if (!list) return [];

  return toListItemViews(list.items);
}
