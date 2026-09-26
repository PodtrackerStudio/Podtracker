/**
 * Search result shapes and the helpers that display them.
 *
 * **Split out of `search.ts` on purpose, and it must stay split.** Fetching
 * users means `search.ts` imports the database, and the database pulls in the
 * `pg` driver, which reaches for `dns` and `fs`. Client components import these
 * helpers, so while they lived in the same module Turbopack tried to bundle a
 * Postgres driver for the browser and the build failed outright.
 *
 * Nothing in here may import anything that touches the database or the network.
 */

type SearchItemBase = {
  /** Unique across both kinds — used as a React key and a dedupe key. */
  id: string;
  title: string;
  cover: string;
};

export type PodcastSearchItem = SearchItemBase & {
  type: "podcast";
  artistName: string;
  episodeCount: number;
};

export type EpisodeSearchItem = SearchItemBase & {
  type: "episode";
  /** iTunes id of the show — what the add endpoints take as `externalId`. */
  showExternalId: string;
  showTitle: string;
  /** Hashed feed guid: the route segment, and what `ensureEpisode` matches on. */
  episodeKey: string;
  releaseDate: string | null;
};

/**
 * A member of this site, not something from the iTunes catalogue.
 *
 * The only kind that comes out of our own database, which is why it is opt-in
 * per caller rather than part of a scope — see `includeUsers` below.
 */
export type UserSearchItem = SearchItemBase & {
  type: "user";
  username: string;
};

export type SearchItem = PodcastSearchItem | EpisodeSearchItem | UserSearchItem;

/** What a caller will accept back. The add bars expose this as a control. */
/**
 * What a caller will accept back.
 *
 * `users` is only offered by the nav search, which navigates. The add bars
 * offer the other three, because they add whatever is picked to a collection
 * and a member cannot be logged as an episode or put in a list — see the note
 * on `search` in `search.ts`.
 */
export type SearchScope = "all" | "shows" | "episodes" | "users";

export function hrefForSearchItem(item: SearchItem): string {
  if (item.type === "user") return `/user/${item.username}`;
  return item.type === "episode"
    ? `/podcast/${item.showExternalId}/episode/${item.episodeKey}`
    : `/podcast/${item.id}`;
}

export function subtitleForSearchItem(item: SearchItem): string {
  // The handle, so two members sharing a display name are still tellable apart.
  if (item.type === "user") return `@${item.username}`;
  if (item.type === "episode") {
    const date = item.releaseDate
      ? new Date(item.releaseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
      : null;
    return date ? `${item.showTitle} · ${date}` : item.showTitle;
  }
  // Apple's trackCount is a reasonable episode count; fall back to the author
  // when it is missing, since "0 episodes" reads worse than no number.
  return item.episodeCount > 0 ? `${item.episodeCount.toLocaleString("en-US")} episodes` : item.artistName;
}

export function coverForSearchItem(item: SearchItem): string {
  return item.cover;
}
