import { db } from "./db";
import { episodeKeyFromGuid } from "./episodeKey";

/** One rendered row of a list — either a whole show or a single episode. */
export type ListItemView = {
  itemId: string;
  title: string;
  coverUrl: string | null;
  href: string;
  kind: "show" | "episode";
  /** The curator's order, straight from `ListItem.position`. */
  position: number;
  /**
   * Release date as ISO, for the date sorts. **Only episodes have one** — a
   * show has no single release date, and inventing one (its `createdAt`, say)
   * would silently mislabel "Earliest first". Shows carry null and sort last.
   */
  publishedAt: string | null;
};

/**
 * The shape `toListItemViews` needs. Written structurally rather than as a
 * Prisma payload type so both callers can pass their own richer query result.
 */
type RawListItem = {
  id: string;
  position: number;
  podcast: { title: string; coverUrl: string | null; externalId: string | null } | null;
  episode: {
    title: string;
    coverUrl: string | null;
    externalId: string | null;
    publishedAt: Date;
    podcast: { externalId: string | null; coverUrl: string | null };
  } | null;
};

/**
 * Shapes `ListItem` rows for rendering.
 *
 * Shared with Next listening, which is a `List` too (`isWatchlist: true`), so
 * the hashed-guid gotcha below only has to be right in one place. Ordering is
 * deliberately left to the query — Next listening is newest-first, a curated
 * list is in the curator's order.
 */
export function toListItemViews(items: RawListItem[]): ListItemView[] {
  return items.flatMap((item): ListItemView[] => {
    if (item.episode) {
      const show = item.episode.podcast;
      // Without the show's iTunes id there is no route to link to.
      if (!show.externalId) return [];
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
          position: item.position,
          publishedAt: item.episode.publishedAt.toISOString(),
        },
      ];
    }
    if (item.podcast?.externalId) {
      return [
        {
          itemId: item.id,
          title: item.podcast.title,
          coverUrl: item.podcast.coverUrl,
          href: `/podcast/${item.podcast.externalId}`,
          kind: "show" as const,
          position: item.position,
          publishedAt: null,
        },
      ];
    }
    // A ListItem with neither target is malformed; skip rather than render a
    // broken tile.
    return [];
  });
}

export type ListView = {
  id: string;
  title: string;
  description: string | null;
  isRanked: boolean;
  /** True for Next listening, which has its own page and must not render here. */
  isWatchlist: boolean;
  ownerId: string;
  ownerUsername: string;
  ownerName: string;
  items: ListItemView[];
};

/** One user-made list with everything `/list/[id]` renders. */
export async function getListForView(id: string): Promise<ListView | null> {
  const list = await db.list.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, displayName: true } },
      items: {
        orderBy: { position: "asc" },
        include: { podcast: true, episode: { include: { podcast: true } } },
      },
    },
  });
  if (!list) return null;

  return {
    id: list.id,
    title: list.title,
    description: list.description,
    isRanked: list.isRanked,
    isWatchlist: list.isWatchlist,
    ownerId: list.user.id,
    ownerUsername: list.user.username,
    ownerName: list.user.displayName,
    items: toListItemViews(list.items),
  };
}

/**
 * Appends one already-materialised podcast/episode row to a list.
 *
 * Adding the same thing twice is a no-op rather than a duplicate tile, and
 * `ListItem.position` has no default so the next position is read and
 * incremented. Both `/api/lists` and `/api/lists/items` need this, and Next
 * listening does the same thing inline.
 */
export async function appendListItem(
  listId: string,
  target: { podcastId: string | null; episodeId: string | null },
): Promise<{ added: boolean }> {
  const existing = await db.listItem.findFirst({
    where: { listId, ...(target.episodeId ? { episodeId: target.episodeId } : { podcastId: target.podcastId }) },
    select: { id: true },
  });
  if (existing) return { added: false };

  const last = await db.listItem.findFirst({
    where: { listId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await db.listItem.create({
    data: { listId, position: (last?.position ?? 0) + 1, ...target },
  });
  return { added: true };
}
