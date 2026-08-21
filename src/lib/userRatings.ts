import { db } from "./db";

export const RATINGS_PER_PAGE = 32; // 4 across × 8 down, per Sasha's cap

export const TIER_ORDER = ["HIGHLY_RECOMMEND", "RECOMMEND", "OK", "DONT_RECOMMEND", "DIDNT_FINISH"] as const;
export type Tier = (typeof TIER_ORDER)[number];

export const TIER_LABEL: Record<Tier, string> = {
  HIGHLY_RECOMMEND: "Highly Recommend",
  RECOMMEND: "Recommend",
  OK: "Ok",
  DONT_RECOMMEND: "Don't recommend",
  DIDNT_FINISH: "Didn't finish",
};

/** Maps a tier to the colour class in globals.css. */
export const TIER_CLASS: Record<Tier, string> = {
  HIGHLY_RECOMMEND: "highly",
  RECOMMEND: "recommend",
  OK: "ok",
  DONT_RECOMMEND: "dont",
  DIDNT_FINISH: "didnt",
};

export type MediaFilter = "all" | "shows" | "episodes";
export type SortMode = "released-newest" | "released-oldest" | "rated-newest" | "rated-oldest";

export const SORT_LABEL: Record<SortMode, string> = {
  "released-newest": "Release date Newest First",
  "released-oldest": "Release date Oldest First",
  "rated-oldest": "When rated Oldest First",
  "rated-newest": "When rated Newest First",
};

export type RatedItem = {
  key: string;
  tier: Tier;
  title: string;
  coverUrl: string | null;
  href: string;
  /** Show or episode. */
  kind: "show" | "episode";
  /** For release-date sorting. Null when the source has no date. */
  releasedAt: Date | null;
  ratedAt: Date;
};

/**
 * Every rating a user has given, merged from the two rating tables.
 *
 * Shows and episodes are separate tables by design — rating a show is its own
 * act, IMDb-style, not an average of its episodes — so they are fetched
 * separately and merged here. That is also why filtering by media is a filter
 * on this merged list rather than a different query.
 *
 * Sorting and paging happen in memory. Fine at the scale one person's ratings
 * reach; if someone ever has tens of thousands, this becomes two paged queries
 * with a UNION instead.
 */
export async function getUserRatings(
  userId: string,
  opts: { tier?: Tier | null; media?: MediaFilter; sort?: SortMode; page?: number } = {},
) {
  const { tier = null, media = "all", sort = "rated-newest", page = 1 } = opts;

  const [podcastRatings, episodeRatings] = await Promise.all([
    media === "episodes"
      ? []
      : db.podcastRating.findMany({
          where: { userId, ...(tier ? { tier } : {}) },
          include: { podcast: true },
        }),
    media === "shows"
      ? []
      : db.episodeRating.findMany({
          where: { userId, ...(tier ? { tier } : {}) },
          include: { episode: { include: { podcast: true } } },
        }),
  ]);

  const items: RatedItem[] = [
    ...podcastRatings.map((r) => ({
      key: `p-${r.id}`,
      tier: r.tier as Tier,
      title: r.podcast.title,
      coverUrl: r.podcast.coverUrl,
      href: `/podcast/${r.podcast.externalId}`,
      kind: "show" as const,
      // Podcasts have no single release date; startYear is the closest thing.
      releasedAt: r.podcast.startYear ? new Date(Date.UTC(r.podcast.startYear, 0, 1)) : null,
      ratedAt: r.updatedAt,
    })),
    ...episodeRatings.map((r) => ({
      key: `e-${r.id}`,
      tier: r.tier as Tier,
      title: r.episode.title,
      coverUrl: r.episode.coverUrl ?? r.episode.podcast.coverUrl,
      href: `/podcast/${r.episode.podcast.externalId}/episode/${r.episode.id}`,
      kind: "episode" as const,
      releasedAt: r.episode.publishedAt,
      ratedAt: r.updatedAt,
    })),
  ];

  items.sort((a, b) => {
    switch (sort) {
      case "released-newest":
        return (b.releasedAt?.getTime() ?? 0) - (a.releasedAt?.getTime() ?? 0);
      case "released-oldest":
        return (a.releasedAt?.getTime() ?? Infinity) - (b.releasedAt?.getTime() ?? Infinity);
      case "rated-oldest":
        return a.ratedAt.getTime() - b.ratedAt.getTime();
      default:
        return b.ratedAt.getTime() - a.ratedAt.getTime();
    }
  });

  const totalPages = Math.max(1, Math.ceil(items.length / RATINGS_PER_PAGE));
  const current = Math.min(Math.max(page, 1), totalPages);
  const start = (current - 1) * RATINGS_PER_PAGE;

  return {
    items: items.slice(start, start + RATINGS_PER_PAGE),
    total: items.length,
    page: current,
    totalPages,
  };
}

/** Per-tier counts for the distribution, unaffected by the current filters. */
export async function getUserRatingCounts(userId: string): Promise<Record<Tier, number>> {
  const [podcast, episode] = await Promise.all([
    db.podcastRating.groupBy({ by: ["tier"], where: { userId }, _count: { tier: true } }),
    db.episodeRating.groupBy({ by: ["tier"], where: { userId }, _count: { tier: true } }),
  ]);

  const counts = Object.fromEntries(TIER_ORDER.map((t) => [t, 0])) as Record<Tier, number>;
  for (const row of [...podcast, ...episode]) {
    counts[row.tier as Tier] += row._count.tier;
  }
  return counts;
}
