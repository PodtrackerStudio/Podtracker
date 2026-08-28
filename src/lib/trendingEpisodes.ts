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
  /**
   * Always reaches an episode. Either the episode's own URL, when the feed was
   * matched at render time, or `/episode/find`, which resolves on click.
   */
  href: string;
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

/**
 * Loose enough to survive punctuation and casing drift between chart and feed.
 *
 * Exported because `/episode/find` matches with the identical rule — a title
 * that resolves at render time must resolve on click too.
 */
export function normaliseEpisodeTitle(title: string): string {
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
export async function getTrendingEpisodes(
  limit = 8,
  country = "us",
  /**
   * Resolve each entry to its episode page by matching feed titles.
   *
   * **Costly — leave it off for large lists.** Each distinct show means parsing
   * a full RSS feed, and podcast feeds are enormous (JRE's carries ~2,700
   * episodes). Next's fetch cache stores the HTTP response but the XML is
   * re-parsed every render, so this does not get cheaper on repeat loads.
   *
   * Measured on the 100-item page: 175s with no cap, 45s cold / 16s warm capped
   * at 12 feeds, versus 4.4s for the equivalent shows page. So the full list
   * passes `false` and links to shows; the 8-item Explore row passes `true`.
   */
  resolveEpisodeLinks = true,
): Promise<TrendingEpisode[]> {
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
  //
  // HARD CAP. Each resolution parses a full RSS feed, and podcast feeds are
  // huge — JRE's carries ~2,700 episodes. At limit=100 the chart spans 40+
  // distinct shows, and resolving them all took the page past 400 seconds,
  // which reads as a hang rather than a slow load. Beyond this many shows,
  // entries simply link to the show page. The first N are the top of the
  // chart, which is what anyone actually clicks.
  const MAX_FEEDS = 12;
  const showIds = !resolveEpisodeLinks
    ? []
    : [...new Set(results.map((r) => showIdFromUrl(r.url)).filter((id): id is string => Boolean(id)))].slice(
    0,
    MAX_FEEDS,
  );

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
    const match = episodes?.find((e) => normaliseEpisodeTitle(e.title) === normaliseEpisodeTitle(r.name));

    // Resolved here, or deferred to /episode/find, which parses that one show's
    // feed on click. Either way the link reaches an episode — what it can't do
    // is parse forty feeds to render a page nobody may click through.
    const href = match
      ? `/podcast/${showId}/episode/${episodeKeyFromGuid(match.guid)}`
      : showId
        ? `/episode/find?show=${showId}&title=${encodeURIComponent(r.name)}`
        : "#";

    return {
      id: r.id,
      title: r.name,
      showName: r.artistName,
      artworkUrl: r.artworkUrl100.replace(/\/\d+x\d+bb\./, "/600x600bb."),
      showId,
      href,
    };
  });
}
