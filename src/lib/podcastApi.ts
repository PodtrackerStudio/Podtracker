import Parser from "rss-parser";
import { feedTextToPlain } from "./feedText";

const rssParser = new Parser();

/**
 * A feed host answered, and refused.
 *
 * **Why the status matters.** This used to be a plain `Error` carrying the
 * status in its message, so every caller treated "this feed is private" and
 * "this feed host is having a bad minute" identically — as a transient failure
 * worth retrying, and then as an outage. For a **paid or subscriber-only
 * podcast** that is permanently wrong: Apple lists the show and hands back a
 * feed URL that answers 401 or 403 to anyone without a token, forever.
 *
 * That is how `/podcast/6822357740/episode/…` came to serve a crash page
 * (2026-11-06). Apple knew the show, the feed refused us, and the episode page
 * reported an outage and threw. Subscriber feeds get their own Apple listing,
 * so this is a whole class of show, not one episode.
 *
 * `permanent` is the distinction worth acting on: a 4xx is the host's final
 * answer and retrying cannot change it; a 5xx or a network error might.
 */
export class FeedFetchError extends Error {
  readonly status: number;
  readonly permanent: boolean;

  constructor(status: number, feedUrl: string) {
    super(`Feed fetch failed: ${status} for ${feedUrl}`);
    this.name = "FeedFetchError";
    this.status = status;
    // 429 is a 4xx but explicitly means "later", so it stays retryable.
    this.permanent = status >= 400 && status < 500 && status !== 429;
  }
}

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

export type ItunesEpisodeResult = {
  /** iTunes id of the SHOW the episode belongs to — what `/podcast/[id]` routes on. */
  showItunesId: number;
  title: string;
  showTitle: string;
  artworkUrl: string;
  /**
   * The episode's RSS guid, verbatim.
   *
   * **Verified identical to the guid in the show's own feed** (JRE #2542 is
   * `d0eed536-9b6e-11f1-91e1-87ba07d621a5` from both), which is what makes this
   * endpoint usable at all: `episodeKeyFromGuid` on it produces the same route
   * key the feed path produces, and `ensureEpisode` then finds the episode by
   * that hash with nothing to reconcile.
   */
  guid: string;
  releaseDate: string | null;
  durationSeconds: number | null;
};

/**
 * Live episode search across Apple's catalogue.
 *
 * Not to be confused with the `lookup?entity=podcastEpisode` dead end recorded
 * in docs/change-log.md — that was resolving *chart* episode ids and returns
 * resultCount 0. `search` is a different endpoint and works: every result
 * carries `collectionId` and `episodeGuid`, the two things a route needs.
 *
 * Results missing either are dropped rather than rendered as links that go
 * nowhere. In practice none are, but the fields aren't contractual.
 */
export async function searchEpisodes(term: string, limit = 10): Promise<ItunesEpisodeResult[]> {
  const url = `${ITUNES_BASE}/search?media=podcast&entity=podcastEpisode&limit=${limit}&term=${encodeURIComponent(term)}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`iTunes episode search failed: ${res.status}`);
  const data = await res.json();

  return (data.results ?? [])
    .filter((r: Record<string, unknown>) => r.episodeGuid && r.collectionId)
    .map((r: Record<string, unknown>) => ({
      showItunesId: r.collectionId as number,
      title: r.trackName as string,
      showTitle: (r.collectionName as string) ?? "",
      artworkUrl: (r.artworkUrl600 as string) ?? (r.artworkUrl160 as string) ?? (r.artworkUrl60 as string),
      guid: r.episodeGuid as string,
      releaseDate: (r.releaseDate as string) ?? null,
      durationSeconds: r.trackTimeMillis ? Math.round((r.trackTimeMillis as number) / 1000) : null,
    }));
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

/**
 * **Bounded, oldest out.** It never evicted: an expired entry was only replaced
 * if the same feed was asked for again, so every feed a crawler walked through
 * stayed in memory for the life of the process. Some carry thousands of
 * episodes with full show notes. Maps keep insertion order, so the first key is
 * the least recently stored. Comfortably above the 12 feeds `trendingEpisodes`
 * resolves at once.
 */
const MAX_CACHED_FEEDS = 40;

/**
 * Parses already under way, by feed url. Without this, two callers asking for
 * the same uncached feed at once both parsed it, and that is the expensive part
 * (~3.5s for JRE, single-threaded, so they queue). It happens on every podcast
 * and episode page, where `generateMetadata` and the page each ask. Failures
 * are not kept, so the next request tries again.
 */
const feedsInFlight = new Map<string, Promise<PodcastFeed>>();

export function fetchPodcastFeed(feedUrl: string): Promise<PodcastFeed> {
  const cached = parsedFeedCache.get(feedUrl);
  if (cached) {
    if (cached.expiresAt > Date.now()) return Promise.resolve(cached.feed);
    parsedFeedCache.delete(feedUrl);
  }

  const pending = feedsInFlight.get(feedUrl);
  if (pending) return pending;

  const work = loadPodcastFeed(feedUrl).finally(() => feedsInFlight.delete(feedUrl));
  feedsInFlight.set(feedUrl, work);
  return work;
}

async function loadPodcastFeed(feedUrl: string): Promise<PodcastFeed> {
  const res = await fetch(feedUrl, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new FeedFetchError(res.status, feedUrl);
  const feed = await rssParser.parseString(await res.text());

  // **Newest first, by date, not by position in the XML.** Everything
  // downstream assumed feeds list the newest episode first, and most do, but
  // serial shows often publish oldest-first. For those, "Recent episodes"
  // showed the four oldest, the years read backwards ("2026–2018"),
  // Previous/Next were swapped, and the home feed never showed a new upload.
  // The sort is stable, so feeds already in order keep it, and undated
  // episodes go last.
  const time = (e: FeedEpisode) => {
    const t = e.publishedAt ? Date.parse(e.publishedAt) : NaN;
    return Number.isNaN(t) ? -Infinity : t;
  };
  const episodes = feed.items.map(toFeedEpisode).sort((a, b) => {
    const ta = time(a);
    const tb = time(b);
    return ta === tb ? 0 : tb > ta ? 1 : -1;
  });
  const oldestDated = [...episodes].reverse().find((e) => time(e) !== -Infinity);

  const parsed: PodcastFeed = {
    // Stripped here, at the boundary, so every consumer downstream gets text.
    // This one went straight to the podcast page and was the `<p>` Sasha saw.
    description: feedTextToPlain(feed.description ?? ""),
    episodes,
    firstPublishedAt: oldestDated?.publishedAt ?? null,
  };

  parsedFeedCache.set(feedUrl, { feed: parsed, expiresAt: Date.now() + REVALIDATE_SECONDS * 1000 });
  while (parsedFeedCache.size > MAX_CACHED_FEEDS) {
    const oldestKey = parsedFeedCache.keys().next().value;
    if (oldestKey === undefined) break;
    parsedFeedCache.delete(oldestKey);
  }
  return parsed;
}

function toFeedEpisode(item: Parser.Item): FeedEpisode {
  const itunesExt = item as unknown as { itunes?: { duration?: string; image?: string }; enclosure?: { url?: string } };
  return {
    title: item.title ?? "Untitled episode",
    publishedAt: item.isoDate ?? item.pubDate ?? null,
    // `contentSnippet` is rss-parser's already-stripped version and is usually
    // present; `content` is raw HTML. The fallback was the gap — a feed without
    // a snippet put markup into the "guest" line under every recent episode.
    // Running both through costs nothing, since stripping plain text is a no-op.
    description: feedTextToPlain(item.contentSnippet ?? item.content ?? ""),
    audioUrl: itunesExt.enclosure?.url ?? null,
    durationSeconds: parseDurationToSeconds(itunesExt.itunes?.duration),
    coverUrl: itunesExt.itunes?.image ?? null,
    // Last resorts are deterministic. A random UUID here re-rolled on every
    // parse, so the episode's link and stored rating broke each hour. The
    // order before them is unchanged on purpose: stored rows depend on it.
    guid:
      item.guid ??
      item.link ??
      item.title ??
      itunesExt.enclosure?.url ??
      `pt-nogid:${item.isoDate ?? item.pubDate ?? "unknown"}`,
  };
}
