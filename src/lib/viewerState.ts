import { db } from "./db";
import { getCurrentUser } from "./auth";

/** UI tier keys, matching RatingWidget's. */
export type TierKey = "highly" | "recommend" | "ok" | "dont";

const API_TO_TIER: Record<string, TierKey> = {
  HIGHLY_RECOMMEND: "highly",
  RECOMMEND: "recommend",
  OK: "ok",
  DONT_RECOMMEND: "dont",
};

export type ViewerPodcastState = {
  following: boolean;
  tier: TierKey | null;
};

const NONE: ViewerPodcastState = { following: false, tier: null };

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

    const [follow, rating] = await Promise.all([
      db.podcastFollow.findUnique({
        where: { userId_podcastId: { userId: user.id, podcastId: podcast.id } },
        select: { userId: true },
      }),
      db.podcastRating.findUnique({
        where: { userId_podcastId: { userId: user.id, podcastId: podcast.id } },
        select: { tier: true },
      }),
    ]);

    return {
      following: Boolean(follow),
      tier: rating ? API_TO_TIER[rating.tier] ?? null : null,
    };
  } catch {
    return NONE;
  }
}
