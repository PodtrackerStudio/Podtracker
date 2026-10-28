import { db } from "./db";
import { getCurrentUser } from "./auth";
import { episodeKeyFromGuid } from "./episodeKey";

/** UI tier keys, matching RatingWidget's. */
export type TierKey = "highly" | "recommend" | "ok" | "dont" | "didnt";

// A tier missing here maps to null, so the mic shows unrated for a rating that
// does exist — which is what happened to DIDNT_FINISH until it became settable.
const API_TO_TIER: Record<string, TierKey> = {
  HIGHLY_RECOMMEND: "highly",
  RECOMMEND: "recommend",
  OK: "ok",
  DONT_RECOMMEND: "dont",
  DIDNT_FINISH: "didnt",
};

export type ViewerPodcastState = {
  following: boolean;
  tier: TierKey | null;
  inNextListening: boolean;
};

const NONE: ViewerPodcastState = { following: false, tier: null, inNextListening: false };

/**
 * What the signed-in viewer has already done to this show.
 *
 * Without this the Follow button and the Rate mic start blank on every load, so
 * following something and refreshing showed "Follow" again — the state existed
 * only in the browser. Reading it server-side is what makes those controls
 * reflect the database.
 *
 * Never throws: a database blip should leave the controls at their default, not
 * take down a page whose content came from the API.
 */
export async function getViewerPodcastState(externalId: string): Promise<ViewerPodcastState> {
  try {
    const user = await getCurrentUser();
    if (!user) return NONE;

    const podcast = await db.podcast.findUnique({ where: { externalId }, select: { id: true } });
    if (!podcast) return NONE;

    const [follow, rating, watchItem] = await Promise.all([
      db.podcastFollow.findUnique({
        where: { userId_podcastId: { userId: user.id, podcastId: podcast.id } },
        select: { userId: true },
      }),
      db.podcastRating.findUnique({
        where: { userId_podcastId: { userId: user.id, podcastId: podcast.id } },
        select: { tier: true },
      }),
      // Already in their Next listening? Keeps the button from resetting to
      // "Add" on every refresh, the same bug Follow used to have.
      db.listItem.findFirst({
        where: { podcastId: podcast.id, list: { userId: user.id, isWatchlist: true } },
        select: { id: true },
      }),
    ]);

    return {
      following: Boolean(follow),
      tier: rating ? API_TO_TIER[rating.tier] ?? null : null,
      inNextListening: Boolean(watchItem),
    };
  } catch {
    return NONE;
  }
}

/** No `following`: you follow a show, not an episode. */
export type ViewerEpisodeState = {
  tier: TierKey | null;
  inNextListening: boolean;
};

const NONE_EPISODE: ViewerEpisodeState = { tier: null, inNextListening: false };

/**
 * The episode equivalent, from what an episode page has: the show's iTunes id
 * and the episode key in its URL.
 *
 * **Without this the episode page's controls were write-only.** The page
 * rendered `RatingWidget` and `NextListeningButton` with no initial state, so
 * both fell back to their defaults on every load: you rated an episode, the
 * rating saved and moved the average, and the mic was still grey when you came
 * back to it. The show page had passed its state in since the controls were
 * built; the episode page never did.
 *
 * The episode is resolved the same way `getEpisodeRatingSummaryByKey` does, and
 * for the same reason: `Episode.externalId` is the feed's GUID while the route
 * carries a hash of it, so nothing can match in SQL. Matching the summary's
 * resolution exactly is the point — if these two disagreed about which row the
 * episode is, the average would count a rating the mic doesn't show, which is
 * the bug this fixes wearing a different hat.
 *
 * Never throws, like its show-page twin: a database blip leaves the controls at
 * their defaults rather than 500ing a page whose content came from the feed.
 */
export async function getViewerEpisodeState(
  podcastExternalId: string,
  episodeKey: string,
): Promise<ViewerEpisodeState> {
  if (!podcastExternalId || !episodeKey) return NONE_EPISODE;

  try {
    const user = await getCurrentUser();
    if (!user) return NONE_EPISODE;

    const podcast = await db.podcast.findUnique({
      where: { externalId: podcastExternalId },
      select: { id: true },
    });
    if (!podcast) return NONE_EPISODE;

    // Small by construction: `ensureEpisode` only writes a row once somebody
    // rates, logs or lists an episode, so this is the handful anyone has
    // touched rather than the show's whole back catalogue.
    const episodes = await db.episode.findMany({
      where: { podcastId: podcast.id, externalId: { not: null } },
      select: { id: true, externalId: true },
    });

    const match = episodes.find((e) => e.externalId && episodeKeyFromGuid(e.externalId) === episodeKey);
    if (!match) return NONE_EPISODE;

    const [rating, watchItem] = await Promise.all([
      db.episodeRating.findUnique({
        where: { userId_episodeId: { userId: user.id, episodeId: match.id } },
        select: { tier: true },
      }),
      db.listItem.findFirst({
        where: { episodeId: match.id, list: { userId: user.id, isWatchlist: true } },
        select: { id: true },
      }),
    ]);

    return {
      tier: rating ? API_TO_TIER[rating.tier] ?? null : null,
      inNextListening: Boolean(watchItem),
    };
  } catch {
    return NONE_EPISODE;
  }
}
