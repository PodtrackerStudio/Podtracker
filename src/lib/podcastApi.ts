import Parser from "rss-parser";
import { feedTextToPlain } from "./feedText";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { isIP, type LookupFunction } from "node:net";
import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import type { Readable } from "node:stream";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";

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
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS }, signal: AbortSignal.timeout(ITUNES_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`iTunes search failed: ${res.status}`);
  const data = await res.json();

  return (data.results ?? []).map(toPodcastResult);
}

// Looks a podcast up by its iTunes collection id — the id the search endpoint
// returns, and the one the landing page links carry.
export async function lookupPodcast(itunesId: string | number): Promise<ItunesPodcastResult | null> {
  const url = `${ITUNES_BASE}/lookup?id=${encodeURIComponent(String(itunesId))}&entity=podcast`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS }, signal: AbortSignal.timeout(ITUNES_TIMEOUT_MS) });
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
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS }, signal: AbortSignal.timeout(ITUNES_TIMEOUT_MS) });
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
    // Re-inserted on every hit, so the Map's order is "least recently USED"
    // and not "least recently stored". Stored-order meant a crawler walking 40
    // obscure shows pushed out the popular ones everybody was reading.
    parsedFeedCache.delete(feedUrl);
    parsedFeedCache.set(feedUrl, cached);

    if (cached.expiresAt > Date.now()) return Promise.resolve(cached.feed);

    // **Expired, but still the answer.** The old copy is served now and a
    // fresh one fetched behind it. Deleting it first meant one visitor an hour
    // per show waited for the whole download and parse — and if the feed's
    // host was down at that moment, the good copy was already gone and the
    // page failed. If the refresh fails, the old copy stays, and is not
    // retried for a few minutes.
    if (!feedsInFlight.has(feedUrl)) {
      const refresh = loadPodcastFeed(feedUrl)
        .catch((error) => {
          console.error("[feed] refresh failed, keeping the cached copy:", feedUrl, (error as Error)?.message);
          cached.expiresAt = Date.now() + STALE_RETRY_MS;
          return cached.feed;
        })
        .finally(() => feedsInFlight.delete(feedUrl));
      feedsInFlight.set(feedUrl, refresh);
    }
    return Promise.resolve(cached.feed);
  }

  const pending = feedsInFlight.get(feedUrl);
  if (pending) return pending;

  const work = loadPodcastFeed(feedUrl).finally(() => feedsInFlight.delete(feedUrl));
  feedsInFlight.set(feedUrl, work);
  return work;
}

/** How long a failed refresh waits before the next attempt. */
const STALE_RETRY_MS = 5 * 60 * 1000;

/** Apple answers in well under a second when it is going to answer at all. */
const ITUNES_TIMEOUT_MS = 6_000;

/** Whole download, headers to last byte. JRE's feed takes a few seconds. */
const FEED_TIMEOUT_MS = 20_000;

/** The largest feeds seen are ~15MB. Past this it is not a podcast feed. */
const FEED_MAX_BYTES = 60 * 1024 * 1024;

const FEED_MAX_REDIRECTS = 4;

/**
 * True for an address on this machine or a private network.
 *
 * A feed url comes from Apple's catalogue, and anyone can list a podcast there
 * with a feed they host. Without this, such a feed (or a redirect from it)
 * could point the server at `127.0.0.1`, `169.254.169.254` or a private
 * address and make it fetch from inside its own network.
 *
 * IPv6 is parsed to its eight groups rather than matched as text. The old
 * string check stripped a `::ffff:` prefix, but `new URL` rewrites
 * `[::ffff:127.0.0.1]` to `::ffff:7f00:1`, which left `7f00:1` — not an IPv4
 * address, so it was waved through as public. Every form that embeds an IPv4
 * address (mapped, compatible, SIIT, NAT64, 6to4) is now unpacked and the
 * IPv4 address checked.
 */
export function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version !== 6) return true; // not an address at all: refuse
  const g = ipv6Groups(ip);
  if (!g) return true;

  const zeros = (from: number, to: number) => g.slice(from, to).every((x) => x === 0);
  const embedded = `${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`;
  // ::/96 (compatible, also `::` and `::1`), ::ffff:0:0/96 (mapped),
  // ::ffff:0:0:0/96 (SIIT) and 64:ff9b::/96 (NAT64) all carry IPv4 in the
  // last 32 bits.
  if (zeros(0, 5) && (g[5] === 0 || g[5] === 0xffff)) return isPrivateIPv4(embedded);
  if (zeros(0, 4) && g[4] === 0xffff && g[5] === 0) return isPrivateIPv4(embedded);
  if (g[0] === 0x64 && g[1] === 0xff9b && zeros(2, 6)) return isPrivateIPv4(embedded);

  const first = g[0];
  return (
    first === 0x2002 || // 6to4 — tunnels to an embedded IPv4 address
    (first === 0x2001 && (g[1] === 0 || g[1] === 0xdb8)) || // Teredo, documentation
    (first === 0x100 && zeros(1, 4)) || // discard-only
    (first & 0xfe00) === 0xfc00 || // unique local fc00::/7
    (first & 0xffc0) === 0xfe80 || // link-local fe80::/10
    (first & 0xffc0) === 0xfec0 || // old site-local fec0::/10
    (first & 0xff00) === 0xff00 // multicast
  );
}

function isPrivateIPv4(ip: string): boolean {
  const [a, b, c] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, including cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) || // IETF protocol, documentation
    (a === 198 && (b === 18 || b === 19)) || // benchmarking 198.18.0.0/15
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224 // multicast and reserved
  );
}

/** The eight 16-bit groups of a valid IPv6 address (`isIP(ip) === 6`). */
function ipv6Groups(ip: string): number[] | null {
  let s = ip.toLowerCase();
  const zone = s.indexOf("%");
  if (zone >= 0) s = s.slice(0, zone);
  // A dotted IPv4 tail becomes two hex groups.
  const lastColon = s.lastIndexOf(":");
  const tail = s.slice(lastColon + 1);
  if (isIP(tail) === 4) {
    const [a, b, c, d] = tail.split(".").map(Number);
    s = `${s.slice(0, lastColon + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - rest.length : 0;
  const groups = [...head, ...Array(fill).fill("0"), ...rest].map((h) => parseInt(h, 16));
  return groups.length === 8 && groups.every((n) => Number.isInteger(n) && n >= 0 && n <= 0xffff) ? groups : null;
}

/**
 * A `dns.lookup` that refuses private addresses, handed to `http.request` so
 * the address that is checked is the address that is connected to.
 *
 * Checking first and then calling `fetch` resolved the name twice: a feed
 * host with a zero-TTL record could answer with a public address for the
 * check and `127.0.0.1` for the connection (DNS rebinding).
 */
const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, "", 4);
    const list = addresses as unknown as LookupAddress[];
    if (list.length === 0 || list.some((a) => isPrivateAddress(a.address))) {
      return callback(new Error(`Feed url resolves to a private address: ${hostname}`), "", 4);
    }
    // Node asks for every address when it races IPv4 against IPv6.
    if (options.all) return (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

function checkFeedUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Feed url is not a url: ${raw.slice(0, 200)}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Feed url is not http(s): ${url.protocol}`);
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new Error(`Feed url points at a local host: ${host}`);
  }
  // A literal address never reaches `guardedLookup` — Node connects to it
  // directly — so it is checked here. Names are checked at connect time.
  if (isIP(host) && isPrivateAddress(host)) {
    throw new Error(`Feed url resolves to a private address: ${host}`);
  }
  return url;
}

/** One GET, no redirects followed, connecting only to public addresses. */
function getOnce(url: URL, signal: AbortSignal): Promise<IncomingMessage> {
  const request = url.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method: "GET",
        lookup: guardedLookup,
        signal,
        headers: {
          accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
          "accept-encoding": "gzip, deflate, br",
          "user-agent": "Podtracker/1.0",
        },
      },
      resolve,
    );
    req.on("error", reject);
    req.end();
  });
}

function decoded(res: IncomingMessage): Readable {
  switch ((res.headers["content-encoding"] ?? "").toLowerCase()) {
    case "gzip":
    case "x-gzip":
      return res.pipe(createGunzip());
    case "deflate":
      return res.pipe(createInflate());
    case "br":
      return res.pipe(createBrotliDecompress());
    default:
      return res;
  }
}

/**
 * Downloads a feed with a deadline, a size cap, and a check on where it is
 * going (at every redirect, not just the first url). Before the deadline, one
 * slow or endless feed held a function until the platform killed it — and
 * `feedsInFlight` handed that same stuck promise to every later request for
 * the show.
 *
 * `node:http(s)` rather than `fetch`, because `fetch` cannot be given a
 * lookup function, and the lookup is where the address check has to live (see
 * `guardedLookup`). This gives up Next's fetch cache, which only ever held the
 * small feeds — anything over 2MB was never cached by it — and the parsed
 * cache above covers repeat reads either way.
 */
export async function downloadFeed(feedUrl: string): Promise<string> {
  const signal = AbortSignal.timeout(FEED_TIMEOUT_MS);
  let current = feedUrl;

  for (let hop = 0; hop <= FEED_MAX_REDIRECTS; hop++) {
    const url = checkFeedUrl(current);
    const res = await getOnce(url, signal);
    const status = res.statusCode ?? 0;

    if (status >= 300 && status < 400) {
      const location = res.headers.location;
      res.resume();
      if (!location) throw new FeedFetchError(status, feedUrl);
      current = new URL(location, url).toString();
      continue;
    }
    if (status < 200 || status >= 300) {
      res.resume();
      throw new FeedFetchError(status, feedUrl);
    }

    const declared = Number(res.headers["content-length"]);
    if (declared > FEED_MAX_BYTES) {
      res.destroy();
      throw new Error(`Feed is too large (${declared} bytes): ${feedUrl}`);
    }

    // Counted after decompression, so an endless body or a compression bomb is
    // cut off at the cap instead of being buffered whole.
    const body = decoded(res);
    const chunks: Buffer[] = [];
    let total = 0;
    try {
      for await (const chunk of body) {
        total += (chunk as Buffer).byteLength;
        if (total > FEED_MAX_BYTES) throw new Error(`Feed is too large (over ${FEED_MAX_BYTES} bytes): ${feedUrl}`);
        chunks.push(chunk as Buffer);
      }
    } finally {
      res.destroy();
    }
    return new TextDecoder().decode(Buffer.concat(chunks));
  }
  throw new Error(`Feed redirected more than ${FEED_MAX_REDIRECTS} times: ${feedUrl}`);
}

async function loadPodcastFeed(feedUrl: string): Promise<PodcastFeed> {
  const feed = await rssParser.parseString(await downloadFeed(feedUrl));

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
