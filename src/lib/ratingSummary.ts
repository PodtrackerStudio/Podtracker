import { db } from "./db";
import { episodeKeyFromGuid } from "./episodeKey";
import { summariseTierCounts, EMPTY_SUMMARY, type RatingSummary, type Tier } from "./ratingScale";

/**
 * The average rating and the distribution bars, for one show or one episode.
 *
 * This module is only the database half — the scale and the arithmetic live in
 * `ratingScale.ts`, which imports nothing, so the numbers can be checked without
 * a database and a client component can take a label without taking `pg`.
 *
 * **Reads the current rating, never `LogEntry.tier`.** The schema is explicit
 * about this: a diary entry keeps a snapshot of what you thought at the time, so
 * averaging those would count someone who relistened three times three times
 * over. `PodcastRating`/`EpisodeRating` is one row per person per thing.
 *
 * **Never throws.** A show page whose details came from Apple renders perfectly
 * well without its ratings, so a database blip degrades to "no ratings yet"
 * rather than 500ing the page — the same bargain `getPodcastCommunityStats`
 * makes.
 */

export type { RatingSummary, RatingDistributionRow } from "./ratingScale";

export async function getPodcastRatingSummary(externalId: string): Promise<RatingSummary> {
  if (!externalId) return EMPTY_SUMMARY;

  try {
    const podcast = await db.podcast.findUnique({ where: { externalId }, select: { id: true } });
    // No local row means nobody has ever acted on this show — `ensurePodcast`
    // only writes on a write — so there is nothing to count.
    if (!podcast) return EMPTY_SUMMARY;

    const rows = await db.podcastRating.groupBy({
      by: ["tier"],
      where: { podcastId: podcast.id },
      _count: { _all: true },
    });

    return summariseTierCounts(new Map(rows.map((r) => [r.tier as Tier, r._count._all])));
  } catch {
    return EMPTY_SUMMARY;
  }
}

/** The episode equivalent, taking the `Episode` row's own id. */
export async function getEpisodeRatingSummary(episodeId: string | null): Promise<RatingSummary> {
  if (!episodeId) return EMPTY_SUMMARY;

  try {
    const rows = await db.episodeRating.groupBy({
      by: ["tier"],
      where: { episodeId },
      _count: { _all: true },
    });

    return summariseTierCounts(new Map(rows.map((r) => [r.tier as Tier, r._count._all])));
  } catch {
    return EMPTY_SUMMARY;
  }
}

/**
 * The same, from what an episode page actually has: the show's iTunes id and
 * the episode key in its URL.
 *
 * **Why this isn't one query.** `Episode.externalId` is the feed's GUID, and
 * the route carries `episodeKeyFromGuid(guid)` — a hash of it. Nothing can
 * match that in SQL, so the show's stored episodes are read and matched here.
 *
 * That list is small by construction: `ensureEpisode` only writes a row when
 * somebody rates, logs or lists an episode, so this holds the handful anyone has
 * touched, not the show's whole back catalogue. **It deliberately does not parse
 * the feed** — `getTrendingEpisodes` showed what that costs, and an episode
 * nobody has rated has nothing to count anyway.
 */
export async function getEpisodeRatingSummaryByKey(
  podcastExternalId: string,
  episodeKey: string,
): Promise<RatingSummary> {
  if (!podcastExternalId || !episodeKey) return EMPTY_SUMMARY;

  try {
    const podcast = await db.podcast.findUnique({
      where: { externalId: podcastExternalId },
      select: { id: true },
    });
    if (!podcast) return EMPTY_SUMMARY;

    const episodes = await db.episode.findMany({
      where: { podcastId: podcast.id, externalId: { not: null } },
      select: { id: true, externalId: true },
    });

    const match = episodes.find((e) => e.externalId && episodeKeyFromGuid(e.externalId) === episodeKey);
    if (!match) return EMPTY_SUMMARY;

    return await getEpisodeRatingSummary(match.id);
  } catch {
    return EMPTY_SUMMARY;
  }
}
