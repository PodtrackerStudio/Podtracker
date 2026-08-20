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
    description: stripHtml(episode.description),
    previousId: older ? episodeKeyFromGuid(older.guid) : null,
    nextId: newer ? episodeKeyFromGuid(newer.guid) : null,
    isLive: true,
  };
}
