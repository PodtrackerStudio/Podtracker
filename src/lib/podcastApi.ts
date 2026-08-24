import Parser from "rss-parser";

const rssParser = new Parser();

export type ItunesPodcastResult = {
  itunesId: number;
  title: string;
  artistName: string;
  artworkUrl: string;
  feedUrl: string | null;
  genre: string | null;
  genres: string[] | null;
  trackCount: number | null;
};

// Both endpoints below live on the public iTunes Search API — no signup, no API
// key, no rate-limit headers to manage. Base URL is overridable so the parsing
// can be exercised against a local fixture server.
const ITUNES_BASE = process.env.ITUNES_API_BASE ?? "https://itunes.apple.com";

// iTunes data changes on the order of hours, not seconds, and every one of
// these calls sits in a server render. An hour of caching keeps a busy page
// from making the same request per visitor.
const REVALIDATE_SECONDS = 3600;

function toPodcastResult(r: Record<string, unknown>): ItunesPodcastResult {
  return {
    itunesId: r.trackId as number,
    title: r.trackName as string,
    artistName: r.artistName as string,
    artworkUrl: (r.artworkUrl600 as string) ?? (r.artworkUrl100 as string),
    feedUrl: (r.feedUrl as string) ?? null,
    genre: (r.primaryGenreName as string) ?? null,
    genres: (r.genres as string[]) ?? null,
    trackCount: (r.trackCount as number) ?? null,
  };
}

export async function searchPodcasts(term: string, limit = 10): Promise<ItunesPodcastResult[]> {
  const url = `${ITUNES_BASE}/search?media=podcast&entity=podcast&limit=${limit}&term=${encodeURIComponent(term)}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`iTunes search failed: ${res.status}`);
  const data = await res.json();

  return (data.results ?? []).map(toPodcastResult);
}

// Looks a podcast up by its iTunes collection id — the id the search endpoint
// returns, and the one the landing page links carry.
export async function lookupPodcast(itunesId: string | number): Promise<ItunesPodcastResult | null> {
  const url = `${ITUNES_BASE}/lookup?id=${encodeURIComponent(String(itunesId))}&entity=podcast`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`iTunes lookup failed: ${res.status}`);
  const data = await res.json();

  const first = (data.results ?? [])[0];
  if (!first) return null;
  return toPodcastResult(first);
}

export type FeedEpisode = {
  title: string;
  publishedAt: string | null;
  description: string;
  audioUrl: string | null;
  durationSeconds: number | null;
  coverUrl: string | null;
  guid: string;
};

function parseDurationToSeconds(duration: string | undefined): number | null {
  if (!duration) return null;
  if (/^\d+$/.test(duration)) return parseInt(duration, 10);
  const parts = duration.split(":").map(Number);
  if (parts.some(Number.isNaN)) return null;
  return parts.reduceRight((acc, part, i, arr) => acc + part * Math.pow(60, arr.length - 1 - i), 0);
}

export type PodcastFeed = {
  description: string;
  /** Every episode the feed publishes, newest first. */
  episodes: FeedEpisode[];
  /** Publication date of the oldest episode in the feed, if it has one. */
  firstPublishedAt: string | null;
};

// Parses a podcast's own public RSS feed for episode-level data.
// This is the standard way every podcast app gets episode lists — the feed
// is published by the podcaster specifically for this purpose.
//
// The XML is fetched with `fetch` rather than rss-parser's own `parseURL` so
// that it goes through Next's cache like the iTunes calls do; rss-parser's
// HTTP client bypasses it entirely.
/**
 * Parsed feeds, cached in memory.
 *
 * Next's fetch cache stores the raw HTTP response, but the **XML parse** ran on
 * every render — and podcast feeds are huge, JRE's carries ~2,700 episodes.
 * That parse, not the network, is what took the trending-episodes page to 175
 * seconds when it resolved dozens of shows.
 *
 * Keyed by feed url, same TTL as the fetch revalidate so the two don't drift.
 * Per server process, so it empties on restart — that is fine, it is a
 * performance cache, never a source of truth.
 */
const parsedFeedCache = new Map<string, { feed: PodcastFeed; expiresAt: number }>();

export async function fetchPodcastFeed(feedUrl: string): Promise<PodcastFeed> {
  const cached = parsedFeedCache.get(feedUrl);
  if (cached && cached.expiresAt > Date.now()) return cached.feed;

  const res = await fetch(feedUrl, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
  const feed = await rssParser.parseString(await res.text());

  const episodes = feed.items.map(toFeedEpisode);
  const oldest = episodes[episodes.length - 1];

  const parsed: PodcastFeed = {
    description: feed.description ?? "",
    episodes,
    firstPublishedAt: oldest?.publishedAt ?? null,
  };

  parsedFeedCache.set(feedUrl, { feed: parsed, expiresAt: Date.now() + REVALIDATE_SECONDS * 1000 });
  return parsed;
}

function toFeedEpisode(item: Parser.Item): FeedEpisode {
  const itunesExt = item as unknown as { itunes?: { duration?: string; image?: string }; enclosure?: { url?: string } };
  return {
    title: item.title ?? "Untitled episode",
    publishedAt: item.isoDate ?? item.pubDate ?? null,
    description: item.contentSnippet ?? item.content ?? "",
    audioUrl: itunesExt.enclosure?.url ?? null,
    durationSeconds: parseDurationToSeconds(itunesExt.itunes?.duration),
    coverUrl: itunesExt.itunes?.image ?? null,
    guid: item.guid ?? item.link ?? item.title ?? crypto.randomUUID(),
  };
}
