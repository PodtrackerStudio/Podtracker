import { searchIndex, type SearchItem } from "./searchData";

export function hrefForSearchItem(item: SearchItem): string {
  return item.type === "podcast" ? `/podcast/${item.id}` : `/podcast/${item.podcastId}/episode/${item.episodeId}`;
}

export function subtitleForSearchItem(item: SearchItem): string {
  return item.type === "podcast" ? `${item.episodeCount} episodes` : item.podcastTitle;
}

export function coverForSearchItem(item: SearchItem): string {
  return item.cover;
}

type ScoredItem = { item: SearchItem; tier: number; score: number };

function titleOf(item: SearchItem) {
  return item.type === "podcast" ? item.title : item.title;
}

// Relevance tier: how directly the query matches this item's own name,
// before popularity is used as a tiebreaker within a tier.
function relevanceTier(item: SearchItem, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const title = titleOf(item).toLowerCase();

  if (title === q) return 3;
  if (title.startsWith(q)) return 2;
  if (title.includes(q)) return 1;
  if (item.type === "episode" && item.podcastTitle.toLowerCase().includes(q)) return 0.75;
  if (item.type === "episode" && item.matchTerms?.toLowerCase().includes(q)) return 0.5;
  return 0;
}

function scoreAll(query: string): ScoredItem[] {
  return searchIndex
    .map((item) => ({ item, tier: relevanceTier(item, query), score: 0 }))
    .filter((s) => s.tier > 0)
    .map((s) => ({ ...s, score: s.tier * 100000 + s.item.popularity }))
    .sort((a, b) => b.score - a.score);
}

export type SearchResults = {
  topResult: SearchItem | null;
  otherResults: SearchItem[];
};

// A strong match on a show's own name outranks any single episode mentioning
// the query, regardless of literal string position — that's what makes this
// "good" search instead of naive substring-order search.
export function search(query: string): SearchResults {
  const scored = scoreAll(query);
  if (scored.length === 0) return { topResult: null, otherResults: [] };

  const bestPodcast = scored.find((s) => s.item.type === "podcast" && s.tier >= 1);
  const topResult = (bestPodcast ?? scored[0]).item;
  const otherResults = scored.filter((s) => s.item !== topResult).map((s) => s.item);

  return { topResult, otherResults };
}

// Lightweight version for the live typeahead dropdown — just the top few matches.
export function quickSearch(query: string, limit = 5): SearchItem[] {
  return scoreAll(query)
    .slice(0, limit)
    .map((s) => s.item);
}
