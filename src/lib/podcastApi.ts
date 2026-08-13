import Parser from "rss-parser";

const rssParser = new Parser();

export type ItunesPodcastResult = {
  itunesId: number;
  title: string;
  artistName: string;
  artworkUrl: string;
  feedUrl: string | null;
  genre: string | null;
};

// Public iTunes Search API — no signup or API key required.
export async function searchPodcasts(term: string, limit = 10): Promise<ItunesPodcastResult[]> {
  const url = `https://itunes.apple.com/search?media=podcast&entity=podcast&limit=${limit}&term=${encodeURIComponent(term)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes search failed: ${res.status}`);
  const data = await res.json();

  return (data.results ?? []).map((r: Record<string, unknown>) => ({
    itunesId: r.trackId as number,
    title: r.trackName as string,
    artistName: r.artistName as string,
    artworkUrl: (r.artworkUrl600 as string) ?? (r.artworkUrl100 as string),
    feedUrl: (r.feedUrl as string) ?? null,
    genre: (r.primaryGenreName as string) ?? null,
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

// Parses a podcast's own public RSS feed for episode-level data.
// This is the standard way every podcast app gets episode lists — the feed
// is published by the podcaster specifically for this purpose.
export async function fetchFeedEpisodes(feedUrl: string, limit = 50): Promise<FeedEpisode[]> {
  const feed = await rssParser.parseURL(feedUrl);

  return feed.items.slice(0, limit).map((item) => {
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
  });
}
