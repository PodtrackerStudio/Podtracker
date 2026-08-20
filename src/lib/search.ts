import { searchPodcasts } from "./podcastApi";

/**
 * Live search against the iTunes catalogue.
 *
 * **This replaced a static file.** `searchData.ts` held eight hand-written
 * shows, so only those were findable — which is why adding podcasts felt like a
 * one-at-a-time job. Nothing is stored now: iTunes is queried per request, so
 * the reachable set is Apple's whole catalogue.
 *
 * Results carry the **iTunes id**, which is what `/podcast/[id]` already routes
 * on, so every result leads to a page that renders live.
 */
export type SearchItem = {
  type: "podcast";
  /** iTunes id — the route segment. */
  id: string;
  title: string;
  artistName: string;
  cover: string;
  episodeCount: number;
};

export function hrefForSearchItem(item: SearchItem): string {
  return `/podcast/${item.id}`;
}

export function subtitleForSearchItem(item: SearchItem): string {
  // Apple's trackCount is a reasonable episode count; fall back to the author
  // when it is missing, since "0 episodes" reads worse than no number.
  return item.episodeCount > 0 ? `${item.episodeCount.toLocaleString("en-US")} episodes` : item.artistName;
}

export function coverForSearchItem(item: SearchItem): string {
  return item.cover;
}

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
function promoteExactMatch(items: SearchItem[], query: string): SearchItem[] {
  const q = query.trim().toLowerCase();
  const exact = items.findIndex((i) => i.title.toLowerCase() === q);
  if (exact <= 0) return items;
  const [match] = items.splice(exact, 1);
  return [match, ...items];
}

async function fetchItems(query: string, limit: number): Promise<SearchItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const results = await searchPodcasts(trimmed, limit);
    return promoteExactMatch(
      results.map((p) => ({
        type: "podcast" as const,
        id: String(p.itunesId),
        title: p.title,
        artistName: p.artistName,
        cover: p.artworkUrl,
        episodeCount: p.trackCount ?? 0,
      })),
      trimmed,
    );
  } catch {
    // A search that errors should come back empty, not 500 the page.
    return [];
  }
}

export async function search(query: string): Promise<SearchResults> {
  const items = await fetchItems(query, 25);
  if (items.length === 0) return { topResult: null, otherResults: [] };
  return { topResult: items[0], otherResults: items.slice(1) };
}

/** The nav typeahead — just the top few. */
export async function quickSearch(query: string, limit = 5): Promise<SearchItem[]> {
  return fetchItems(query, limit);
}
