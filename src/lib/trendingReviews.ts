import { db } from "./db";
import { episodeHref } from "./episodeKey";
import { TIER_LABEL, TIER_CLASS, type Tier } from "./ratingScale";

/**
 * Reviews to show on the home page.
 *
 * **"Trending" is ranked by likes, then recency.** With the site's current
 * handful of users almost nothing has a like, so in practice this is "the
 * newest reviews" today and becomes genuinely popularity-ranked on its own as
 * likes accumulate. That is the intended behaviour, not a placeholder: a
 * like-ranked list with no likes *is* a recency list, and pretending otherwise
 * would mean inventing a score.
 *
 * **A review is a `LogEntry` carrying `reviewText`** — there is no separate
 * table — so this filters on that, exactly as `/user/[username]/reviews` does.
 *
 * The tier shown is the author's **current** rating of the same target rather
 * than `LogEntry.tier`, matching `/review/[id]` and the profile reviews tab: a
 * review can exist without a rating and vice versa.
 */

export type TrendingReview = {
  id: string;
  href: string;
  text: string;
  authorName: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  /** The artwork. Its title is reachable by hovering — never printed as text. */
  coverUrl: string;
  /** What was reviewed, for the hover popup only. */
  subjectTitle: string;
  subjectHref: string;
  subjectSubtitle?: string;
  tierLabel: string | null;
  tierClass: string | null;
  likeCount: number;
  dateLabel: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  // Pinned, like every other date formatter here: without it this renders in
  // the server's zone and the same entry shows one date on the home page and
  // another on the review itself.
  timeZone: "UTC",
});

export async function getTrendingReviews(limit = 3): Promise<TrendingReview[]> {
  try {
    const entries = await db.logEntry.findMany({
      where: { reviewText: { not: null } },
      include: {
        user: { select: { username: true, displayName: true, avatarUrl: true } },
        podcast: { select: { externalId: true, title: true, coverUrl: true } },
        episode: {
          select: {
            externalId: true,
            title: true,
            coverUrl: true,
            podcast: { select: { externalId: true, title: true, coverUrl: true } },
          },
        },
        _count: { select: { likes: true } },
      },
      // Likes first, newest as the tie-break — which is every row, for now.
      orderBy: [{ likes: { _count: "desc" } }, { listenedDate: "desc" }],
      take: limit,
    });

    if (entries.length === 0) return [];

    // One query each rather than per row: the ratings are needed for whichever
    // targets these reviews happen to cover, and there are at most `limit` of
    // them.
    const [podcastRatings, episodeRatings] = await Promise.all([
      db.podcastRating.findMany({
        where: {
          OR: entries
            .filter((e) => e.podcastId)
            .map((e) => ({ userId: e.userId, podcastId: e.podcastId as string })),
        },
        select: { userId: true, podcastId: true, tier: true },
      }),
      db.episodeRating.findMany({
        where: {
          OR: entries
            .filter((e) => e.episodeId)
            .map((e) => ({ userId: e.userId, episodeId: e.episodeId as string })),
        },
        select: { userId: true, episodeId: true, tier: true },
      }),
    ]);

    return entries.map((entry) => {
      const show = entry.podcast ?? entry.episode?.podcast ?? null;

      const tier = (entry.episodeId
        ? episodeRatings.find((r) => r.userId === entry.userId && r.episodeId === entry.episodeId)?.tier
        : podcastRatings.find((r) => r.userId === entry.userId && r.podcastId === entry.podcastId)?.tier) ??
        entry.tier ??
        null;

      return {
        id: entry.id,
        href: `/review/${entry.id}`,
        text: entry.reviewText ?? "",
        authorName: entry.user.displayName || entry.user.username,
        authorUsername: entry.user.username,
        authorAvatarUrl: entry.user.avatarUrl,
        coverUrl: entry.episode?.coverUrl ?? show?.coverUrl ?? "/placeholder-cover.svg",
        subjectTitle: entry.episode?.title ?? show?.title ?? "Untitled",
        // episodeHref, not the database id — a route built from a cuid matches
        // no episode in any feed and lands on the placeholder instead.
        subjectHref: entry.episode
          ? (episodeHref(show?.externalId, entry.episode.externalId) ?? `/review/${entry.id}`)
          : show?.externalId
            ? `/podcast/${show.externalId}`
            : `/review/${entry.id}`,
        subjectSubtitle: entry.episode && show ? show.title : undefined,
        tierLabel: tier ? TIER_LABEL[tier as Tier] : null,
        tierClass: tier ? TIER_CLASS[tier as Tier] : null,
        likeCount: entry._count.likes,
        dateLabel: dateFormatter.format(entry.listenedDate),
      };
    });
  } catch {
    // The home page survives without this section.
    return [];
  }
}
