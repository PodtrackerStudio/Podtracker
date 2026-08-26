import { createHash } from "crypto";

/**
 * A stable, URL-safe id for an episode, derived from its RSS `guid`.
 *
 * **Why this exists.** Episode ids used to be the item's position in the feed
 * (`1`, `2`, `3`…). Positions shift every time a show publishes, so a rating
 * attached to "position 3" silently comes to mean a different episode a week
 * later. Nothing read the value while everything was mock, but the moment
 * ratings and diary entries are stored against episodes it would corrupt them.
 *
 * The feed's `guid` is the stable identifier, but it can't be a route segment
 * as-is: guids are arbitrary strings and are frequently full URLs. Hashing
 * gives a short fixed-length token that is safe in a path and stable for the
 * life of the episode.
 *
 * 12 hex chars = 48 bits. For collisions to matter, two episodes *of the same
 * show* would have to collide; at feed sizes (thousands at most) that is
 * negligible. The `Episode` row keeps the real guid, so the mapping back is
 * never lost.
 */
export function episodeKeyFromGuid(guid: string): string {
  return createHash("sha256").update(guid).digest("hex").slice(0, 12);
}

/**
 * The route for an episode, built from the ids the routes actually use.
 *
 * **Four separate pages got this wrong the same way** — the review page, the
 * diary, the ratings list and the profile's listening strip all built
 * `/podcast/<x>/episode/<y>` out of *database cuids* instead of the show's
 * iTunes id and the hashed feed guid. Such a link matches no episode in any
 * feed, and `getEpisodeDetail` answers an unmatched key with its placeholder,
 * so every one of them silently rendered the "Inside Modern Politics – Ezra
 * Klein" stand-in instead of the episode that was logged.
 *
 * `episodeGuid` is `Episode.externalId` — the RAW guid, which is hashed here.
 * Falls back to the show page when the episode has no guid, and returns null
 * when there is no show to link to at all.
 */
export function episodeHref(showExternalId: string | null | undefined, episodeGuid: string | null | undefined): string | null {
  if (!showExternalId) return null;
  if (!episodeGuid) return `/podcast/${showExternalId}`;
  return `/podcast/${showExternalId}/episode/${episodeKeyFromGuid(episodeGuid)}`;
}
