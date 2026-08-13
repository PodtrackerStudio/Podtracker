/**
 * Podtracker's rating scale.
 *
 * Deliberately not 1-5 stars. The product exists to answer "is this episode
 * worth my time or should I skip it", so ratings are recommendation buckets.
 * Colors are sampled from the Figma landing page design.
 */

export type RatingId =
  | "highly-recommend"
  | "recommend"
  | "ok"
  | "dont-recommend"
  | "didnt-finish";

export type Rating = {
  id: RatingId;
  label: string;
  /** Tailwind text-color utility backed by a token in globals.css. */
  className: string;
};

/** Ordered best to worst. "Didn't finish" sits last: it is a non-endorsement. */
export const RATINGS: Rating[] = [
  {
    id: "highly-recommend",
    label: "Highly recommend",
    className: "text-rating-highly",
  },
  { id: "recommend", label: "Recommend", className: "text-rating-recommend" },
  { id: "ok", label: "Ok", className: "text-rating-ok" },
  {
    id: "dont-recommend",
    label: "Don't recommend",
    className: "text-rating-dont",
  },
  {
    id: "didnt-finish",
    label: "Didn't finish",
    className: "text-rating-unfinished",
  },
];

export const RATING_BY_ID = Object.fromEntries(
  RATINGS.map((r) => [r.id, r]),
) as Record<RatingId, Rating>;
