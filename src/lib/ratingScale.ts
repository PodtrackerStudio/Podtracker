/**
 * The rating scale itself: tiers, labels, colour classes, and the arithmetic
 * that turns a pile of ratings into an average and a set of bars.
 *
 * **Nothing here touches the database, on purpose.** These constants used to
 * live in `userRatings.ts`, which imports `db` and therefore `pg` — and a
 * client component that imported a label from there took the whole database
 * driver with it into the browser bundle. That is exactly how `search.ts` broke
 * the production build on 2026-09-24 (`Can't resolve 'dns'`, with `tsc` and
 * `eslint` both passing), which is why `searchItem.ts` exists. Same split, same
 * reason. `userRatings.ts` re-exports these, so existing imports still work.
 *
 * Keeping it pure also makes it runnable on its own, which is the only way the
 * averages below could be checked at all — the dev container cannot reach
 * Postgres.
 */

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

/**
 * **The scale is not invented here.** `ratingTier.ts` already fixed it, and the
 * landing page's "Ratings explained" section is what it describes: Highly
 * Recommend 4, Recommend 3, Ok 2, Don't recommend 1, Didn't finish excluded.
 *
 * **Didn't finish counts but does not score.** It belongs in the distribution —
 * "a lot of people bailed" is precisely the signal this site exists to surface
 * — and not in the average, because it is not a judgement of quality. Someone
 * who stopped after five minutes has not rated the show, and scoring it zero
 * would drag an average below the worst opinion anyone actually held.
 */
export const TIER_SCORE: Record<Tier, number | null> = {
  HIGHLY_RECOMMEND: 4,
  RECOMMEND: 3,
  OK: 2,
  DONT_RECOMMEND: 1,
  DIDNT_FINISH: null,
};

export type RatingDistributionRow = {
  tier: Tier;
  /** The colour class in the page's CSS module. */
  key: string;
  label: string;
  count: number;
  /** Share of *all* ratings, Didn't finish included, so the five bars total 100. */
  pct: number;
};

export type RatingSummary = {
  /** Every rating, Didn't finish included. */
  total: number;
  /** Only the ones carrying a score. */
  scored: number;
  /** 1.0–4.0, to one decimal. Null when nothing scoreable has been rated. */
  average: number | null;
  /** Always all five tiers, in order, zeros included — the bars are a fixed set. */
  distribution: RatingDistributionRow[];
};

export const EMPTY_SUMMARY: RatingSummary = {
  total: 0,
  scored: 0,
  average: null,
  distribution: TIER_ORDER.map((tier) => ({
    tier,
    key: TIER_CLASS[tier],
    label: TIER_LABEL[tier],
    count: 0,
    pct: 0,
  })),
};

/** Counts in, average and bars out. The only arithmetic in the feature. */
export function summariseTierCounts(counts: Map<Tier, number> | Partial<Record<Tier, number>>): RatingSummary {
  const get = (tier: Tier): number =>
    (counts instanceof Map ? counts.get(tier) : counts[tier]) ?? 0;

  let total = 0;
  let scored = 0;
  let scoreSum = 0;

  for (const tier of TIER_ORDER) {
    const count = get(tier);
    total += count;

    const score = TIER_SCORE[tier];
    if (score !== null) {
      scored += count;
      scoreSum += score * count;
    }
  }

  if (total === 0) return EMPTY_SUMMARY;

  const distribution = TIER_ORDER.map((tier) => {
    const count = get(tier);
    return {
      tier,
      key: TIER_CLASS[tier],
      label: TIER_LABEL[tier],
      count,
      // Rounded for display only. Each bar is rounded independently, so the
      // five can total 99 or 101 — invisible, because they are five separate
      // tracks rather than one stacked bar.
      pct: Math.round((count / total) * 100),
    };
  });

  return {
    total,
    scored,
    // Null rather than 0 when every rating is Didn't finish: there is no
    // average, and "0.0" on a 1–4 scale would claim a verdict worse than the
    // worst one available.
    average: scored === 0 ? null : Math.round((scoreSum / scored) * 10) / 10,
    distribution,
  };
}
