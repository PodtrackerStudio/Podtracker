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
  /** False when this is the built-in placeholder rather than feed data. */
  isLive: boolean;
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
    })),
    isLive: true,
  };
}

// Mirrors placeholderDetail in podcastDetail.ts — the legacy hardcoded slugs
// ("jre", "modern-wisdom", …) still linked from Similar podcasts have no feed
// behind them, and a rendered stand-in beats a 500.
function placeholder(podcastId: string, episodeKey: string): EpisodeDetail {
  return {
    id: episodeKey,
    guid: `placeholder-${episodeKey}`,
    podcastId,
    podcastTitle: "Modern Wisdom",
    title: "Inside Modern Politics – Ezra Klein",
    date: "June 1, 2026",
    duration: "2h 14m",
    coverUrl: "https://picsum.photos/seed/epcover/300/300",
    description:
      "Chris Williamson sits down with Ezra Klein — journalist, author, and co-founder of Vox — to dig into the state of modern politics, the Democratic Party's identity crisis, media polarization, and what it actually takes to change someone's mind.",
    previousId: null,
    nextId: null,
    isLive: false,
  };
}

/**
 * Everything the episode page needs, from the show's own RSS feed.
 *
 * The whole feed is searched rather than the four-episode "Recent episodes"
 * slice, so any episode has a page — which is the point. Feeds are cached for
 * an hour by `fetchPodcastFeed`, so this is one request per show per hour
 * however many episode pages get opened.
 *
 * Never throws, matching `getPodcastDetail`: an unreachable API degrades to the
 * placeholder rather than 500ing.
 */
export async function getEpisodeDetail(podcastId: string, episodeKey: string): Promise<EpisodeDetail> {
  if (!/^\d+$/.test(podcastId)) return placeholder(podcastId, episodeKey);

  const podcast = await lookupPodcast(podcastId).catch(() => null);
  if (!podcast?.feedUrl) return placeholder(podcastId, episodeKey);

  const feed = await fetchPodcastFeed(podcast.feedUrl).catch(() => null);
  if (!feed) return placeholder(podcastId, episodeKey);

  const index = feed.episodes.findIndex((e) => episodeKeyFromGuid(e.guid) === episodeKey);
  if (index === -1) return placeholder(podcastId, episodeKey);

  const episode = feed.episodes[index];
  // Feeds are newest-first, so the *newer* neighbour is the lower index.
  const newer = feed.episodes[index - 1];
  const older = feed.episodes[index + 1];

  return {
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
    isLive: true,
  };
}
