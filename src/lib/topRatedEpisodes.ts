import { db } from "./db";
import { episodeHref } from "./episodeKey";
import { summariseTierCounts, type RatingSummary, type Tier } from "./ratingScale";
import { tierFromScore, type RatingTierKey } from "./ratingTier";

/**
 * A show's episodes, ranked by what listeners made of them.
 *
 * **This is the reason the site exists.** A 2,700-episode feed is never
 * uniformly good, and no podcast app tells you which parts to skip. Everything
 * else here is bookkeeping; this is the answer.
 *
 * **Replaces a mock.** Until 2026-11-21 `/podcast/[id]/top-rated` rendered
 * `TopRatedClient`, which generated episodes from random topic and guest
 * lists starting at a hardcoded counter of 476, linked every row to episode
 * 1109 of a different show, and was unreachable anyway because the link to it
 * was gated behind `HAS_COMMUNITY_DATA`. None of it was real.
 *
 * **Gated on its own data, not on the global flag.** CLAUDE.md records the
 * policy: a section that can stand up on real data stops consulting
 * `HAS_COMMUNITY_DATA` and asks whether *it* has anything to show. Here that
 * is `countRatedEpisodes() >= 2` — one rated episode is not a ranking.
 */

export type TopRatedEpisode = {
  /** The database id, for React keys. Never put this in a URL — see `href`. */
  id: string;
  title: string;
  coverUrl: string | null;
  publishedAt: Date;
  /**
   * The episode page, built from the show's and episode's external ids the way
   * `trendingReviews` does. Null when the episode has no stored guid, which
   * means no episode page can be addressed for it — the row then renders
   * unlinked rather than pointing somewhere wrong.
   */
  href: string | null;
  summary: RatingSummary;
  /** The average expressed as a tier, for the badge. Null if nothing scored. */
  tier: RatingTierKey | null;
  tierLabel: string | null;
};

/**
 * How many of a show's episodes anyone has rated.
 *
 * Its own query because the podcast page needs the number and not the list —
 * it decides whether to offer the link at all, and loading every rated episode
 * to count them would be absurd on a page that may not show the link.
 */
export async function countRatedEpisodes(podcastExternalId: string): Promise<number> {
  if (!podcastExternalId) return 0;

  try {
    const podcast = await db.podcast.findUnique({
      where: { externalId: podcastExternalId },
      select: { id: true },
    });
    // No local row means nobody has ever acted on this show — `ensurePodcast`
    // only writes on a write — so nothing of it has been rated.
    if (!podcast) return 0;

    return await db.episode.count({
      where: { podcastId: podcast.id, ratings: { some: {} } },
    });
  } catch (error) {
    // A podcast page renders perfectly well without the link, so a database
    // blip costs the link rather than the page. Same bargain the ratings
    // summary makes.
    console.error("[top-rated] could not count rated episodes:", error);
    return 0;
  }
}

/**
 * The ranked list.
 *
 * **Ordering, and why each tiebreak is there:**
 *
 * 1. **Average score**, high to low. Episodes nobody scored — everyone pressed
 *    "Didn't finish" — have no average and sort last, because there is no
 *    verdict to rank them by. They are not failures, they are unrated.
 * 2. **Number of scored ratings.** Two episodes both averaging 4.0 are not
 *    equally established if one has nine ratings and the other has one.
 * 3. **Newest first**, so the order is stable and not arbitrary.
 */
export async function getTopRatedEpisodes(
  podcastExternalId: string,
  limit = 100,
): Promise<TopRatedEpisode[]> {
  if (!podcastExternalId) return [];

  try {
    const podcast = await db.podcast.findUnique({
      where: { externalId: podcastExternalId },
      select: { id: true, externalId: true },
    });
    if (!podcast) return [];

    // One round trip. `ratings: { some: {} }` keeps unrated episodes out
    // rather than fetching the whole show and filtering in memory — on a feed
    // the size of JRE's that difference is the whole query.
    const episodes = await db.episode.findMany({
      where: { podcastId: podcast.id, ratings: { some: {} } },
      select: {
        id: true,
        title: true,
        coverUrl: true,
        publishedAt: true,
        externalId: true,
        ratings: { select: { tier: true } },
      },
    });

    const ranked = episodes.map((episode) => {
      const counts = new Map<Tier, number>();
      for (const rating of episode.ratings) {
        const tier = rating.tier as Tier;
        counts.set(tier, (counts.get(tier) ?? 0) + 1);
      }
      const summary = summariseTierCounts(counts);
      const scored = summary.average === null ? null : tierFromScore(summary.average);

      return {
        id: episode.id,
        title: episode.title,
        coverUrl: episode.coverUrl,
        publishedAt: episode.publishedAt,
        href: episodeHref(podcast.externalId, episode.externalId),
        summary,
        tier: scored?.tier ?? null,
        tierLabel: scored?.tierLabel ?? null,
      };
    });

    ranked.sort((a, b) => {
      // Unscored last, whichever way round the pair arrives.
      if (a.summary.average === null && b.summary.average === null) return 0;
      if (a.summary.average === null) return 1;
      if (b.summary.average === null) return -1;

      if (b.summary.average !== a.summary.average) return b.summary.average - a.summary.average;
      if (b.summary.scored !== a.summary.scored) return b.summary.scored - a.summary.scored;
      return b.publishedAt.getTime() - a.publishedAt.getTime();
    });

    return ranked.slice(0, limit);
  } catch (error) {
    console.error("[top-rated] could not read the ranked episodes:", error);
    return [];
  }
}
