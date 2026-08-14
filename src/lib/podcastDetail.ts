import { lookupPodcast, fetchPodcastFeed, type FeedEpisode } from "./podcastApi";

// How many episodes the "Recent episodes" strip on the podcast page shows.
const RECENT_EPISODE_COUNT = 4;

export type DetailEpisode = {
  id: string;
  title: string;
  /** Fills the line under the title — the feed's own summary, trimmed. */
  guest: string;
  date: string;
  img: string;
};

export type PodcastDetail = {
  id: string;
  title: string;
  author: string;
  years: string;
  episodesCount: string;
  genres: string;
  description: string;
  coverUrl: string;
  bannerUrl: string;
  recentEpisodes: DetailEpisode[];
  /** False when this is the built-in placeholder rather than API data. */
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
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : dateFormatter.format(date);
}

function year(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : String(date.getUTCFullYear());
}

function trimSummary(text: string, maxLength = 90): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, clean.lastIndexOf(" ", maxLength))}…`;
}

/**
 * The years line reads "2018–2026", or just the start year with a dash when the
 * show is still running. A feed only proves when it started and when it last
 * published, so "still running" is taken to mean it published this year.
 */
function formatYears(firstPublishedAt: string | null, latestPublishedAt: string | null): string {
  const start = year(firstPublishedAt);
  const end = year(latestPublishedAt);
  if (!start) return end ?? "";
  if (!end || end === String(new Date().getUTCFullYear())) return `${start}–`;
  return start === end ? start : `${start}–${end}`;
}

function toDetailEpisode(episode: FeedEpisode, index: number, fallbackImage: string): DetailEpisode {
  return {
    // Position in the feed, not the guid: guids are arbitrary strings that are
    // frequently URLs, and the episode route takes a path segment.
    id: String(index + 1),
    title: episode.title,
    guest: trimSummary(episode.description),
    date: formatDate(episode.publishedAt),
    img: episode.coverUrl ?? fallbackImage,
  };
}

// Stands in for a podcast that isn't backed by the API — the hardcoded slugs
// ("jre", "huberman", …) still linked from the Similar podcasts strip, and any
// lookup that fails. Kept so those links land on a rendered page rather than an
// error, which is how they behaved before the API was wired in.
function placeholderDetail(id: string): PodcastDetail {
  return {
    id,
    title: "Modern Wisdom",
    author: "Chris Williamson",
    years: "2018–",
    episodesCount: "1,111",
    genres: "Self-help, Society & Culture",
    description:
      "Life is hard. This podcast will help. Lessons from the greatest thinkers on the planet with Chris Williamson. Including guests like David Goggins, Dr Jordan Peterson, Naval Ravikant, Sam Harris, Jocko Willink, Dr Andrew Huberman, Dr Julie Smith, Steven Bartlett, Ryan Holiday, Robert Greene, Matthew McConaughey, Alain de Botton, Alex Hormozi, Tony Robbins, Chris Bumstead, Mark Manson and more.",
    coverUrl: "https://picsum.photos/seed/mwcover/360/360",
    bannerUrl: "https://picsum.photos/seed/mwbanner/1600/640",
    recentEpisodes: [
      { id: "1111", title: "The Hidden Cost Of Overthinking Everything – George Mack #1111", guest: "George Mack", date: "June 15, 2026", img: "https://picsum.photos/seed/ep1111/120/120" },
      { id: "1110", title: "Why Most People Never Reach Their Potential – Suzanne Venker #1110", guest: "Suzanne Venker", date: "June 8, 2026", img: "https://picsum.photos/seed/ep1110/120/120" },
      { id: "1109", title: "Inside Modern Politics – Ezra Klein #1109", guest: "Ezra Klein", date: "June 1, 2026", img: "https://picsum.photos/seed/ep1109/120/120" },
      { id: "1108", title: "How To Rebuild Your Confidence From Zero – DJ Shipley #1108", guest: "DJ Shipley", date: "May 25, 2026", img: "https://picsum.photos/seed/ep1108/120/120" },
    ],
    isLive: false,
  };
}

/**
 * Builds everything the podcast page needs that can come from a public source:
 * iTunes for the show's identity and artwork, the show's own RSS feed for the
 * description and episode list.
 *
 * Ratings, reviews, lists and friends' activity are deliberately not here —
 * those are community data this app does not have yet.
 *
 * Never throws: an unreachable API or a broken feed degrades to as much as
 * could be fetched, and finally to the placeholder, because a podcast page that
 * 500s is worse than one showing a stale stand-in.
 */
export async function getPodcastDetail(id: string): Promise<PodcastDetail> {
  // iTunes ids are numeric. Anything else is one of the legacy hardcoded slugs.
  if (!/^\d+$/.test(id)) return placeholderDetail(id);

  let podcast;
  try {
    podcast = await lookupPodcast(id);
  } catch {
    return placeholderDetail(id);
  }
  if (!podcast) return placeholderDetail(id);

  let feed = null;
  if (podcast.feedUrl) {
    try {
      feed = await fetchPodcastFeed(podcast.feedUrl);
    } catch {
      // Feed is optional — the iTunes half of the page still renders without it.
    }
  }

  const episodes = feed?.episodes ?? [];
  const episodeCount = episodes.length || podcast.trackCount || 0;

  return {
    id,
    title: podcast.title,
    author: podcast.artistName,
    years: formatYears(feed?.firstPublishedAt ?? null, episodes[0]?.publishedAt ?? null),
    episodesCount: episodeCount ? episodeCount.toLocaleString("en-US") : "—",
    genres: podcast.genres?.join(", ") ?? podcast.genre ?? "—",
    description: feed?.description || `${podcast.title} by ${podcast.artistName}.`,
    coverUrl: podcast.artworkUrl,
    // The design has a wide banner behind the header; the show's own artwork is
    // the only image a public API gives us, so it doubles as the banner.
    bannerUrl: podcast.artworkUrl,
    recentEpisodes: episodes
      .slice(0, RECENT_EPISODE_COUNT)
      .map((episode, index) => toDetailEpisode(episode, index, podcast.artworkUrl)),
    isLive: true,
  };
}
