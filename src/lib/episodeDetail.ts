import { lookupPodcast, fetchPodcastFeed } from "./podcastApi";
import { episodeKeyFromGuid } from "./episodeKey";

export type EpisodeDetail = {
  /** Hashed guid — the route key. */
  id: string;
  guid: string;
  podcastId: string;
  podcastTitle: string;
  title: string;
  date: string;
  /** "2h 14m", or "" when the feed omits a duration. */
  duration: string;
  coverUrl: string;
  description: string;
  /** Route keys of the neighbours, for the Previous / Next controls. */
  previousId: string | null;
  nextId: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateFormatter.format(d);
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Signals that a sentence is promotional rather than part of the summary.
 *
 * Podcast feed descriptions almost always run: the actual summary, then the
 * guest's own links, then sponsor reads, then network ad boilerplate. A real
 * example from JRE #2542:
 *
 *   "Steve Hilton is a businessman, political commentator, author, and
 *    Republican candidate for governor of California. www.youtube.com/@…
 *    Perplexity: Download the app… Use code ROGAN at BlueChew.com to get 10%
 *    OFF… Learn more about your ad choices. Visit podcastchoices.com/adchoices"
 *
 * Only the first sentence is the summary.
 */
const PROMO_SIGNALS = [
  /https?:\/\//i,
  /\bwww\./i,
  /\.(com|net|org|io|co|fm)\b/i,
  /\buse code\b/i,
  /\bpromo code\b/i,
  /\d+%\s*off\b/i,
  /\bbrought to you by\b/i,
  /\bsponsor(ed|s|ship)?\b/i,
  /\bad choices\b/i,
  /\badvertising inquiries\b/i,
  /\bprivacy & opt-?out\b/i,
  /\bdownload the app\b/i,
  /\bsign up\b/i,
  /\bfree trial\b/i,
  /\bdiscount\b/i,
];

/**
 * Keeps the summary and drops the sponsorship tail.
 *
 * Takes sentences from the start and stops at the first promotional one, since
 * the ordering is reliable — once a feed starts selling, it does not go back to
 * describing the episode.
 *
 * Falls back to the first sentence if that leaves nothing, so a description
 * whose opening line happens to contain a link still shows something rather
 * than going blank.
 */
export function summaryOnly(text: string): string {
  const clean = stripHtml(text);
  if (!clean) return "";

  const sentences = clean.split(/(?<=[.!?])\s+/);
  const kept: string[] = [];

  for (const sentence of sentences) {
    if (PROMO_SIGNALS.some((re) => re.test(sentence))) break;
    kept.push(sentence);
  }

  const summary = kept.join(" ").trim();
  return summary || sentences[0]?.trim() || "";
}

export type EpisodeListEntry = {
  /** Hashed guid — the route key. */
  id: string;
  title: string;
  date: string;
  /** Episode artwork, falling back to the show cover. */
  img: string;
};

export type EpisodeList = {
  podcastTitle: string;
  episodes: EpisodeListEntry[];
  isLive: boolean;
};

/**
 * Every episode of a show, newest first, for the full episode list page.
 *
 * The whole feed, not a slice — this page is the only route to episodes older
 * than the four in the "Recent episodes" strip. Feeds are cached for an hour,
 * so this is no more expensive than any other page on the show.
 *
 * Never throws; an unreachable feed yields an empty list the page can render
 * honestly rather than a 500.
 */
export async function getEpisodeList(podcastId: string): Promise<EpisodeList> {
  const empty = { podcastTitle: "", episodes: [], isLive: false };
  if (!/^\d+$/.test(podcastId)) return empty;

  const podcast = await lookupPodcast(podcastId).catch(() => null);
  if (!podcast?.feedUrl) return empty;

  const feed = await fetchPodcastFeed(podcast.feedUrl).catch(() => null);
  if (!feed) return { podcastTitle: podcast.title, episodes: [], isLive: false };

  return {
    podcastTitle: podcast.title,
    episodes: feed.episodes.map((e) => ({
      id: episodeKeyFromGuid(e.guid),
      title: e.title,
      date: formatDate(e.publishedAt),
      // Many feeds set per-episode art; the rest inherit the show cover.
      img: e.coverUrl ?? podcast.artworkUrl,
    })),
    isLive: true,
  };
}

/**
 * Why this is a three-way result and not `EpisodeDetail | null`.
 *
 * It used to be nullable, and the page turned every null into `notFound()`.
 * That conflated two very different things: **"no episode has this key"** and
 * **"iTunes or the feed host did not answer just now"**. The second is
 * transient, and a 404 for it tells the reader an episode that exists does not.
 *
 * It bit for real on 2026-08-27: every trending episode on Explore 404'd, and
 * the same URLs returned 200 minutes later untouched. Explore resolves up to
 * twelve feeds concurrently to build that row, and the burst was enough to make
 * the next lookup fail — so the links Explore had just produced were dead by
 * the time anyone clicked one.
 */
export type EpisodeLookup =
  | { status: "ok"; episode: EpisodeDetail }
  | { status: "not-found" }
  | { status: "unavailable" };

/**
 * Two extra attempts, ~250ms then ~600ms.
 *
 * Scoped to this path on purpose. The podcast page degrades to a placeholder
 * and the list pages never touch a feed, so nowhere else turns a hiccup into a
 * wrong answer; making every caller slower on failure would buy nothing.
 */
async function withRetry<T>(attempt: () => Promise<T>): Promise<T | null> {
  const delays = [250, 600];
  for (let i = 0; i <= delays.length; i++) {
    try {
      return await attempt();
    } catch {
      if (i === delays.length) return null;
      await new Promise((r) => setTimeout(r, delays[i]));
    }
  }
  return null;
}

/**
 * Everything the episode page needs, from the show's own RSS feed.
 *
 * The whole feed is searched rather than the four-episode "Recent episodes"
 * slice, so any episode has a page — which is the point. Feeds are cached for
 * an hour by `fetchPodcastFeed`, so this is one request per show per hour
 * however many episode pages get opened.
 *
 * **It no longer answers an unrecognised key with a stand-in.** It used to
 * return a fabricated "Inside Modern Politics – Ezra Klein" episode, so a broken
 * link was indistinguishable from a working one — four separate pages shipped
 * links built from database cuids and nothing ever visibly failed.
 */
export async function getEpisodeDetail(podcastId: string, episodeKey: string): Promise<EpisodeLookup> {
  // Legacy slug ids ("jre", "modern-wisdom") are not iTunes ids and have no
  // feed behind them. Genuinely nothing to find, so not a retry case.
  if (!/^\d+$/.test(podcastId)) return { status: "not-found" };

  const podcast = await withRetry(() => lookupPodcast(podcastId));
  if (!podcast) return { status: "unavailable" };
  // A show that resolves but publishes no feed has no episodes to show. That
  // is an answer, not an outage.
  if (!podcast.feedUrl) return { status: "not-found" };

  const feed = await withRetry(() => fetchPodcastFeed(podcast.feedUrl!));
  if (!feed) return { status: "unavailable" };

  const index = feed.episodes.findIndex((e) => episodeKeyFromGuid(e.guid) === episodeKey);
  // The feed was read successfully and nothing in it matches, so this really is
  // a dead link — the one case that should 404.
  if (index === -1) return { status: "not-found" };

  const episode = feed.episodes[index];
  // Feeds are newest-first, so the *newer* neighbour is the lower index.
  const newer = feed.episodes[index - 1];
  const older = feed.episodes[index + 1];

  return {
    status: "ok",
    episode: {
      id: episodeKey,
      guid: episode.guid,
      podcastId,
      podcastTitle: podcast.title,
      title: episode.title,
      date: formatDate(episode.publishedAt),
      duration: formatDuration(episode.durationSeconds),
      coverUrl: episode.coverUrl ?? podcast.artworkUrl,
      description: summaryOnly(episode.description),
      previousId: older ? episodeKeyFromGuid(older.guid) : null,
      nextId: newer ? episodeKeyFromGuid(newer.guid) : null,
    },
  };
}
