// Maps a numeric average rating to the site's 5-tier scale (see landing page's
// "Ratings explained" section): Highly Recommend = 4.0, Recommend = 3.0, OK = 2.0,
// Don't Recommend = 1.0. Didn't Finish is excluded from averages entirely, so it
// never comes out of this function.
export type RatingTierKey = "highly" | "recommend" | "ok" | "dont";

export function tierFromScore(score: number): { tier: RatingTierKey; tierLabel: string } {
  if (score >= 3.5) return { tier: "highly", tierLabel: "Highly Recommend" };
  if (score >= 2.5) return { tier: "recommend", tierLabel: "Recommend" };
  if (score >= 1.5) return { tier: "ok", tierLabel: "OK" };
  return { tier: "dont", tierLabel: "Don't Recommend" };
}
