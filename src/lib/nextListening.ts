import { db } from "./db";
import { episodeKeyFromGuid } from "./episodeKey";

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

export type NextListeningItem = {
  itemId: string;
  title: string;
  coverUrl: string | null;
  href: string;
  kind: "show" | "episode";
};

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
        orderBy: { position: "desc" },
        include: { podcast: true, episode: { include: { podcast: true } } },
      },
    },
  });
  if (!list) return [];

  return list.items.flatMap((item): NextListeningItem[] => {
    if (item.episode) {
      const show = item.episode.podcast;
      return [
        {
          itemId: item.id,
          title: item.episode.title,
          coverUrl: item.episode.coverUrl ?? show.coverUrl,
          // Episode routes take the HASHED feed guid. Episode.externalId holds
          // the raw guid, so it must be hashed here — using it directly
          // produces a link that resolves to nothing.
          href: item.episode.externalId
            ? `/podcast/${show.externalId}/episode/${episodeKeyFromGuid(item.episode.externalId)}`
            : `/podcast/${show.externalId}`,
          kind: "episode" as const,
        },
      ];
    }
    if (item.podcast) {
      return [
        {
          itemId: item.id,
          title: item.podcast.title,
          coverUrl: item.podcast.coverUrl,
          href: `/podcast/${item.podcast.externalId}`,
          kind: "show" as const,
        },
      ];
    }
    // A ListItem with neither target is malformed; skip rather than render a
    // broken tile.
    return [];
  });
}
