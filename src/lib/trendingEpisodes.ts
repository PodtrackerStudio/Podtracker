import { fetchPodcastFeed, lookupPodcast } from "./podcastApi";
import { episodeKeyFromGuid } from "./episodeKey";

export type TrendingEpisode = {
  /** Apple's episode id — used only as a React key; routes don't take it. */
  id: string;
  title: string;
  /** Show name as the chart reports it. */
  showName: string;
  artworkUrl: string;
  /** iTunes show id, parsed out of the chart's url field. */
  showId: string | null;
  /** Our route: the episode page when the feed match succeeded, else the show. */
  href: string;
  /** False when we fell back to the show page. */
  linksToEpisode: boolean;
};

const CHARTS_BASE = "https://rss.applemarketingtools.com/api/v2";

type ChartResult = {
  id: string;
  name: string;
  artistName: string;
  artworkUrl100: string;
  url: string;
};

/**
 * Apple's chart gives no show id field, but its `url` contains one:
 *   podcasts.apple.com/us/podcast/<slug>/id360084272?i=1000784635823
 * The `id<digits>` segment is the iTunes show id.
 */
function showIdFromUrl(url: string): string | null {
  return url.match(/\/id(\d+)/)?.[1] ?? null;
}

/** Loose enough to survive punctuation and casing drift between chart and feed. */
function normalise(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Apple's "Trending Episodes" chart, resolved to real episode pages.
 *
 * **Why this is more than a fetch.** A chart result carries neither the show id
 * nor the feed guid, and our episode routes need both —
 * `/podcast/{iTunesShowId}/episode/{hashedFeedGuid}`. Two shortcuts were tried
 * and don't work: there is no show-id field, and a batched
 * `lookup?id=<episodeIds>&entity=podcastEpisode` returns resultCount 0, because
 * chart episode ids aren't resolvable through the lookup endpoint.
 *
 * So: parse the show id out of the url, fetch that show's feed (cached an hour
 * by `fetchPodcastFeed`), and match the episode by title. 25 trending episodes
 * come from roughly 12–15 distinct shows, so this is about a dozen cached
 * fetches rather than 25 live requests — and shows repeat across the chart, so
 * each feed is fetched once and reused for all its episodes.
 *
 * **Degrades to the show page** when a title doesn't match. Across millions of
 * feeds that will happen; a working show link beats dropping the entry or
 * guessing at an episode.
 */
export async function getTrendingEpisodes(limit = 8, country = "us"): Promise<TrendingEpisode[]> {
  const fetchCount = Math.min(Math.max(limit, 1), 100);
  const url = `${CHARTS_BASE}/${country}/podcasts/top/${fetchCount}/podcast-episodes.json`;

  let results: ChartResult[];
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { feed?: { results?: ChartResult[] } };
    results = (data.feed?.results ?? []).slice(0, limit);
  } catch {
    return [];
  }

  // One feed fetch per distinct show, reused across that show's episodes.
  const showIds = [...new Set(results.map((r) => showIdFromUrl(r.url)).filter((id): id is string => Boolean(id)))];

  const feedsByShow = new Map<string, { guid: string; title: string }[]>();
  await Promise.all(
    showIds.map(async (showId) => {
      try {
        const podcast = await lookupPodcast(showId);
        if (!podcast?.feedUrl) return;
        const feed = await fetchPodcastFeed(podcast.feedUrl);
        if (feed) feedsByShow.set(showId, feed.episodes.map((e) => ({ guid: e.guid, title: e.title })));
      } catch {
        // Leave this show unmatched; its episodes fall back to the show page.
      }
    }),
  );

  return results.map((r) => {
    const showId = showIdFromUrl(r.url);
    const episodes = showId ? feedsByShow.get(showId) : undefined;
    const match = episodes?.find((e) => normalise(e.title) === normalise(r.name));

    const linksToEpisode = Boolean(showId && match);
    return {
      id: r.id,
      title: r.name,
      showName: r.artistName,
      artworkUrl: r.artworkUrl100.replace(/\/\d+x\d+bb\./, "/600x600bb."),
      showId,
      href: linksToEpisode
        ? `/podcast/${showId}/episode/${episodeKeyFromGuid(match!.guid)}`
        : showId
          ? `/podcast/${showId}`
          : "#",
      linksToEpisode,
    };
  });
}
