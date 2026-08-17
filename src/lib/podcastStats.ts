import { db } from "./db";

export type PodcastCommunityStats = {
  /** People who have logged listening to this show. */
  listens: number;
  /** People who have favorited it. */
  likes: number;
};

const ZERO: PodcastCommunityStats = { listens: 0, likes: 0 };

/**
 * Real listen/like counts for a podcast page, derived from this app's own data
 * rather than any external API — no podcast API exposes them, and they are the
 * community's numbers, not the show's.
 *
 * These read 0 today and climb as people use the site. That is correct, not a
 * bug: there is no user base yet.
 *
 * Note the lookup goes through `Podcast.externalId`. The podcast pages route on
 * iTunes ids, and nothing currently writes a `Podcast` row, so no page has a
 * local record to match and every call returns zeros. The moment podcasts start
 * being persisted with the same id the route uses, these light up with no change
 * here.
 *
 * Never throws — a database outage degrades to zeros rather than 500ing a page
 * whose show data came from the API and is perfectly renderable.
 */
export async function getPodcastCommunityStats(externalId: string): Promise<PodcastCommunityStats> {
  if (!externalId) return ZERO;

  try {
    const podcast = await db.podcast.findUnique({
      where: { externalId },
      select: { id: true },
    });
    if (!podcast) return ZERO;

    const [listens, likes] = await Promise.all([
      db.logEntry.count({ where: { podcastId: podcast.id } }),
      db.favorite.count({ where: { podcastId: podcast.id } }),
    ]);

    return { listens, likes };
  } catch {
    return ZERO;
  }
}

/**
 * 0 → "0", 950 → "950", 1_500 → "1.5k", 980_000 → "980k", 2_400_000 → "2.4M".
 * Small counts stay exact — rounding "3 listens" to "0k" would be absurd while
 * the numbers are still small, which is exactly where they are now.
 */
export function formatCount(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1_000;
    return `${k < 10 ? k.toFixed(1).replace(/\.0$/, "") : Math.round(k)}k`;
  }
  const m = n / 1_000_000;
  return `${m < 10 ? m.toFixed(1).replace(/\.0$/, "") : Math.round(m)}M`;
}
