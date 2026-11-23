import { db } from "./db";
import { avatarSrc } from "./avatar";
import { findStoredEpisodeId } from "./storedEpisode";
import { TIER_CLASS, TIER_LABEL, type Tier } from "./ratingScale";

/**
 * The reviews written about one show, or one episode.
 *
 * **Replaces three invented people.** Until 2026-11-23 the "Popular reviews"
 * section on the show and episode pages rendered a hardcoded array — JohnJam,
 * Phillip Neiman and Peter Prokhorov, with review text nobody wrote — behind
 * `HAS_COMMUNITY_DATA`. The flag being false is the only reason that fiction
 * never shipped, and flipping it would have published all three.
 *
 * So a real review, written about a real show, appeared nowhere on that show's
 * page. It reached the home feed, its author's profile and its own permalink,
 * and not the one place a person deciding what to listen to would look. On a
 * site whose whole argument is "what did listeners think of this", that was
 * the gap that mattered.
 *
 * **Gated on its own data**, the pattern CLAUDE.md records for retiring
 * `HAS_COMMUNITY_DATA` section by section: the caller renders nothing when the
 * list is empty, rather than consulting a site-wide switch. Two reviews show
 * two reviews.
 *
 * **"Popular" is likes, then recency** — the same ordering as the home feed,
 * and for the same reason: with no likes yet a like-ranked list *is* a recency
 * list, which is honest, where inventing a score would not be.
 */

export type SubjectReview = {
  id: string;
  href: string;
  text: string;
  authorName: string;
  authorUsername: string;
  authorAvatarUrl: string;
  /** Null when the author has since removed their rating; the review stands alone. */
  tierClass: string | null;
  tierLabel: string | null;
  dateLabel: string;
  likeCount: number;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  // Pinned, like every other date formatter here: without it the server's zone
  // decides, and the same review shows one date on the show page and another
  // on its own.
  timeZone: "UTC",
});

type Target =
  | { kind: "podcast"; podcastId: string }
  | { kind: "episode"; episodeId: string };

async function load(target: Target, limit: number): Promise<SubjectReview[]> {
  const where =
    target.kind === "podcast"
      ? // `podcastId` only, never the show behind an episode: a review of one
        // episode is not a review of the show, and mixing them would put
        // "episode 412 dragged" under a verdict on the whole series.
        { reviewText: { not: null }, podcastId: target.podcastId, episodeId: null }
      : { reviewText: { not: null }, episodeId: target.episodeId };

  const entries = await db.logEntry.findMany({
    where,
    include: {
      // `id`, not `avatarUrl` — the picture comes from `avatarSrc`. Selecting
      // the data URI put megabytes per card into the page.
      user: { select: { id: true, username: true, displayName: true } },
      _count: { select: { likes: true } },
    },
    orderBy: [{ likes: { _count: "desc" } }, { listenedDate: "desc" }],
    take: limit,
  });

  if (entries.length === 0) return [];

  // The author's **current** rating of this same thing, not `LogEntry.tier`,
  // matching the home feed and `/review/[id]`: a diary entry keeps what
  // somebody thought at the time, and the badge should say what they think now.
  const ratings =
    target.kind === "podcast"
      ? await db.podcastRating.findMany({
          where: { podcastId: target.podcastId, userId: { in: entries.map((e) => e.userId) } },
          select: { userId: true, tier: true },
        })
      : await db.episodeRating.findMany({
          where: { episodeId: target.episodeId, userId: { in: entries.map((e) => e.userId) } },
          select: { userId: true, tier: true },
        });

  return entries.map((entry) => {
    const tier = (ratings.find((r) => r.userId === entry.userId)?.tier ?? entry.tier ?? null) as
      | Tier
      | null;

    return {
      id: entry.id,
      href: `/review/${entry.id}`,
      text: entry.reviewText ?? "",
      authorName: entry.user.displayName || entry.user.username,
      authorUsername: entry.user.username,
      authorAvatarUrl: avatarSrc(entry.user.id),
      tierClass: tier ? TIER_CLASS[tier] : null,
      tierLabel: tier ? TIER_LABEL[tier] : null,
      dateLabel: dateFormatter.format(entry.listenedDate ?? entry.createdAt),
      likeCount: entry._count.likes,
    };
  });
}

/**
 * Never throws. A show page renders perfectly well without its reviews, so a
 * database blip costs the section rather than the page — the same bargain the
 * ratings summary makes.
 */
export async function getPodcastReviews(externalId: string, limit = 3): Promise<SubjectReview[]> {
  if (!externalId) return [];
  try {
    const podcast = await db.podcast.findUnique({
      where: { externalId },
      select: { id: true },
    });
    // No local row means nobody has ever acted on this show, so there is
    // nothing written about it either.
    if (!podcast) return [];
    return await load({ kind: "podcast", podcastId: podcast.id }, limit);
  } catch (error) {
    console.error("[reviews] could not read a show's reviews:", error);
    return [];
  }
}

export async function getEpisodeReviews(
  podcastExternalId: string,
  episodeKey: string,
  limit = 3,
): Promise<SubjectReview[]> {
  if (!podcastExternalId || !episodeKey) return [];
  try {
    const podcast = await db.podcast.findUnique({
      where: { externalId: podcastExternalId },
      select: { id: true },
    });
    if (!podcast) return [];

    // The route key is a hash of the feed guid, so the episode row is found by
    // hashing candidates rather than by id — `findStoredEpisodeId` is the one
    // place that knows how, and it also handles the `pt-show:` scoped copies.
    const episodeId = await findStoredEpisodeId(podcast.id, episodeKey);
    if (!episodeId) return [];

    return await load({ kind: "episode", episodeId }, limit);
  } catch (error) {
    console.error("[reviews] could not read an episode's reviews:", error);
    return [];
  }
}
