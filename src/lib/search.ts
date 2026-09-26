import { searchPodcasts, searchEpisodes } from "./podcastApi";
import { episodeKeyFromGuid } from "./episodeKey";
import { db } from "./db";
import type {
  PodcastSearchItem,
  EpisodeSearchItem,
  UserSearchItem,
  SearchItem,
  SearchScope,
} from "./searchItem";

/**
 * Live search against the iTunes catalogue — shows and individual episodes.
 *
 * **This replaced a static file.** `searchData.ts` held eight hand-written
 * shows, so only those were findable. Nothing is stored now: iTunes is queried
 * per request, so the reachable set is Apple's whole catalogue.
 *
 * Results carry the **iTunes id**, which is what `/podcast/[id]` already routes
 * on, so every result leads to a page that renders live. Episode results carry
 * the show's id plus a hashed feed guid, which is exactly the shape of
 * `/podcast/[id]/episode/[epId]`.
 */
export type {
  PodcastSearchItem,
  EpisodeSearchItem,
  UserSearchItem,
  SearchItem,
  SearchScope,
} from "./searchItem";
export { hrefForSearchItem, subtitleForSearchItem, coverForSearchItem } from "./searchItem";

export type SearchResults = {
  topResult: SearchItem | null;
  otherResults: SearchItem[];
};

/**
 * iTunes returns results already ranked by its own relevance, which is better
 * than anything re-sortable here — it knows popularity, we do not. The only
 * reordering is to promote an exact title match, so searching a show's precise
 * name puts that show top even if Apple ranks a bigger one first.
 */
function promoteExactMatch(items: PodcastSearchItem[], query: string): PodcastSearchItem[] {
  const q = query.trim().toLowerCase();
  const exact = items.findIndex((i) => i.title.toLowerCase() === q);
  if (exact <= 0) return items;
  const [match] = items.splice(exact, 1);
  return [match, ...items];
}

// Words that say nothing about which show is meant, so they must not count as
// "you have typed past the show's name".
const FILLER_WORDS = new Set(["the", "a", "an", "and", "with", "podcast", "podcasts", "show", "episode", "episodes", "ep"]);

/**
 * Has the query reached past the name of the show it matched?
 *
 * This is what keeps episodes out of the way until they're wanted. Sasha's
 * rule: typing "joe rogan" should show the show; typing "joe rogan bill burr"
 * should show the Bill Burr episodes. Apple's *show* search doesn't make that
 * distinction — it happily returns The Joe Rogan Experience for both — so the
 * split is decided here, by asking whether any meaningful word in the query is
 * absent from the top show's name.
 *
 * No show match at all means episodes are the only thing left to offer, so
 * they're shown.
 */
function queryReachesPastShowName(query: string, topShow: PodcastSearchItem | undefined): boolean {
  const words = query
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((w) => w && !FILLER_WORDS.has(w));
  if (words.length === 0) return false;
  if (!topShow) return true;

  const showWords = `${topShow.title} ${topShow.artistName}`.toLowerCase();
  return words.some((w) => !showWords.includes(w));
}

function toPodcastItems(results: Awaited<ReturnType<typeof searchPodcasts>>): PodcastSearchItem[] {
  return results.map((p) => ({
    type: "podcast" as const,
    id: String(p.itunesId),
    title: p.title,
    artistName: p.artistName,
    cover: p.artworkUrl,
    episodeCount: p.trackCount ?? 0,
  }));
}

function toEpisodeItems(results: Awaited<ReturnType<typeof searchEpisodes>>): EpisodeSearchItem[] {
  return results.map((e) => {
    const episodeKey = episodeKeyFromGuid(e.guid);
    return {
      type: "episode" as const,
      // Namespaced so an episode can never collide with a show's iTunes id.
      id: `${e.showItunesId}:${episodeKey}`,
      title: e.title,
      cover: e.artworkUrl,
      showExternalId: String(e.showItunesId),
      showTitle: e.showTitle,
      episodeKey,
      releaseDate: e.releaseDate,
    };
  });
}

/**
 * How many show results stay on screen once episodes have taken over. One: the
 * top show is nearly always the relevant one, and every slot given to Apple’s
 * noisier show matches is a slot taken from the episodes that were asked for.
 */
const SHOWS_ALONGSIDE_EPISODES = 1;

async function fetchItems(query: string, limit: number, scope: SearchScope): Promise<SearchItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    if (scope === "episodes") {
      return toEpisodeItems(await searchEpisodes(trimmed, limit));
    }

    const shows = promoteExactMatch(toPodcastItems(await searchPodcasts(trimmed, limit)), trimmed);
    if (scope === "shows") return shows;

    // "All": shows alone until the query names something a show name doesn't
    // cover. That second call is skipped entirely on the common path.
    if (!queryReachesPastShowName(trimmed, shows[0])) return shows;

    const episodes = toEpisodeItems(await searchEpisodes(trimmed, limit));
    // Apple can return nothing for an episode search that looked promising;
    // falling back to the shows beats showing an empty dropdown.
    if (episodes.length === 0) return shows;

    // Episodes lead here: the extra words are what the user is actually
    // looking for, and Apple's show results for such a query are mostly noise.
    // The slot is reserved even when there are enough episodes to fill the
    // dropdown, so the show itself never becomes unreachable from a query that
    // names it.
    const showSlots = Math.min(SHOWS_ALONGSIDE_EPISODES, shows.length, Math.max(0, limit - 1));
    return [...episodes.slice(0, limit - showSlots), ...shows.slice(0, showSlots)];
  } catch {
    // A search that errors should come back empty, not 500 the page.
    return [];
  }
}

/**
 * Members whose handle or display name contains the query.
 *
 * Unlike everything else here this reads our own database, so it is cheap and
 * exact where the iTunes calls are neither. Handle matches sort first: someone
 * typing a username wants that person, not everyone whose bio-name happens to
 * contain the same letters.
 */
async function searchUsers(query: string, limit: number): Promise<UserSearchItem[]> {
  const q = query.trim();
  if (!q) return [];

  const users = await db.user.findMany({
    where: {
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
    take: limit,
  });

  const lower = q.toLowerCase();
  const handleFirst = [...users].sort((a, b) => {
    const aHandle = a.username.toLowerCase().startsWith(lower) ? 0 : 1;
    const bHandle = b.username.toLowerCase().startsWith(lower) ? 0 : 1;
    return aHandle - bHandle;
  });

  return handleFirst.map((u) => ({
    // Namespaced so a member can never collide with an iTunes id, which shares
    // this field as a React key and a dedupe key.
    id: `user:${u.id}`,
    type: "user" as const,
    title: u.displayName || u.username,
    cover: u.avatarUrl ?? "/default-avatar.webp",
    username: u.username,
  }));
}

/**
 * `includeUsers` is opt-in, and deliberately not a `SearchScope` value.
 *
 * The add bars — Next listening, list pages, the log flow — pass scope "all"
 * and add whatever is picked to a collection. A member cannot be logged as an
 * episode or added to a list, so folding people into "all" would put results
 * in front of those pickers that break when clicked. Off by default means the
 * worst a forgotten flag can do is fail to show users, never corrupt an add.
 */
export async function search(
  query: string,
  scope: SearchScope = "all",
  { includeUsers = false }: { includeUsers?: boolean } = {},
): Promise<SearchResults> {
  const [items, users] = await Promise.all([
    fetchItems(query, 25, scope),
    includeUsers ? searchUsers(query, 10) : Promise.resolve([]),
  ]);

  // Members go after the catalogue rather than competing with it for the top
  // spot: iTunes ranks by real popularity, and there is no honest way to say
  // whether a show beats a person for the same word.
  const all: SearchItem[] = [...items, ...users];
  if (all.length === 0) return { topResult: null, otherResults: [] };
  return { topResult: all[0], otherResults: all.slice(1) };
}

/** The nav typeahead and the add bars — just the top few. */
export async function quickSearch(
  query: string,
  limit = 5,
  scope: SearchScope = "all",
  { includeUsers = false }: { includeUsers?: boolean } = {},
): Promise<SearchItem[]> {
  const [items, users] = await Promise.all([
    fetchItems(query, limit, scope),
    // A couple of slots only: the dropdown is short, and shows are what most
    // searches are for.
    includeUsers ? searchUsers(query, 2) : Promise.resolve([]),
  ]);
  return [...items, ...users];
}
