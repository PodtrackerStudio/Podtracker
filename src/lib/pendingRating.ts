/**
 * A rating a signed-out visitor picked, carried across the trip through signup.
 *
 * **Why this exists.** Choosing a tier on a show page used to end in the words
 * "Not logged in." `RatingWidget` showed the 401 from `/api/rate` as a bare
 * error, put the old rating back, and offered no way forward — so somebody who
 * had already decided, already clicked, and already picked a tier was handed a
 * dead end. This module is what lets the account *save their work* instead of
 * standing in front of it: they come back from signup and the rating is there.
 *
 * **Why `localStorage` and not `sessionStorage`.** Signing up normally needs an
 * email confirmation (`needsEmailConfirmation` in `SignupForm`), and clicking a
 * link in a mail client usually opens a **new tab**, which gets its own empty
 * `sessionStorage`. `VisitTracker` can keep its visit id in session storage
 * because losing it costs nothing; losing this would defeat the point.
 *
 * **It expires.** A rating appearing on somebody's profile days after they
 * picked it, with no memory of doing so, is worse than losing it — so a stash
 * older than `MAX_AGE_MS` is discarded unread.
 *
 * Nothing is stashed until the visitor actually takes the offer of an account.
 * Merely opening the popup and closing it again leaves nothing behind, so a
 * later signup cannot resurrect a tier somebody thought better of.
 *
 * Every read and write is wrapped: storage throws in private windows and where
 * site data is blocked, and no rating is worth breaking a page over.
 */

const KEY = "pt-pending-rating";

/** Long enough to find a confirmation email; short enough to stay deliberate. */
const MAX_AGE_MS = 60 * 60 * 1000;

export type PendingRating = {
  externalId: string;
  /** Present when an episode was being rated; absent means the show itself. */
  episodeKey?: string;
  /** Lets the server recover an episode the feed has dropped. See ensureEpisode. */
  episodeTitle?: string;
  /** The API spelling, e.g. `HIGHLY_RECOMMEND` — what `/api/rate` expects. */
  tier: string;
  /** The human label, so the prompt can name what is being saved. */
  label: string;
  /** Where they were, so signing up returns them to the page they left. */
  returnPath: string;
  savedAt: number;
};

export function stashPendingRating(rating: Omit<PendingRating, "savedAt">): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...rating, savedAt: Date.now() }));
  } catch {
    // Private window, or site data blocked. Signup still works — it just will
    // not carry the rating through, which is the behaviour we had before.
  }
}

export function clearPendingRating(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // See stashPendingRating.
  }
}

export function readPendingRating(): PendingRating | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearPendingRating();
    return null;
  }

  const r = parsed as Partial<PendingRating> | null;
  if (
    !r ||
    typeof r.externalId !== "string" ||
    typeof r.tier !== "string" ||
    typeof r.savedAt !== "number"
  ) {
    clearPendingRating();
    return null;
  }

  if (Date.now() - r.savedAt > MAX_AGE_MS) {
    clearPendingRating();
    return null;
  }

  // `returnPath` is handed to the router, so it has to be a path on this site
  // and not somewhere else. A single leading slash, and no second one, is the
  // whole test — `//evil.example` is a protocol-relative URL, not a path.
  // Reaching this would already mean something could write to our storage, but
  // the check costs nothing and keeps the navigation honest.
  const returnPath =
    typeof r.returnPath === "string" && /^\/[^/]/.test(r.returnPath) ? r.returnPath : "/home";

  return {
    externalId: r.externalId,
    episodeKey: typeof r.episodeKey === "string" ? r.episodeKey : undefined,
    episodeTitle: typeof r.episodeTitle === "string" ? r.episodeTitle : undefined,
    tier: r.tier,
    label: typeof r.label === "string" ? r.label : "rating",
    returnPath,
    savedAt: r.savedAt,
  };
}
