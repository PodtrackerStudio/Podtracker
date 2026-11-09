import { db } from "./db";
import { episodeKeyFromGuid } from "./episodeKey";

/**
 * The stored `Episode` row for a route key (the hashed guid), or null.
 *
 * One shared copy of a lookup that used to be written out by hand in four
 * places (rate GET, next-listening DELETE, viewerState, ratingSummary). They
 * must agree exactly, or a rating saves and then doesn't show.
 *
 * The key is a hash, so it can't be queried directly: the show's stored
 * episodes are read and hashed here. That set is small by construction, since
 * `ensureEpisode` only writes a row once somebody rates, logs or lists an
 * episode. If it ever isn't, the fix is a stored, indexed key column.
 */
export async function findStoredEpisodeId(podcastId: string, episodeKey: string): Promise<string | null> {
  const episodes = await db.episode.findMany({
    where: { podcastId, externalId: { not: null } },
    select: { id: true, externalId: true },
  });
  return episodes.find((e) => e.externalId && episodeKeyFromGuid(e.externalId) === episodeKey)?.id ?? null;
}
