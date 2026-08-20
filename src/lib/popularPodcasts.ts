export type PopularPodcast = {
  /** iTunes id — what every podcast route uses. */
  id: string;
  title: string;
  artistName: string;
  artworkUrl: string;
};

const CHARTS_BASE = "https://rss.applemarketingtools.com/api/v2";

/**
 * Apple's own podcast chart — real popularity, ranked by Apple, no API key.
 *
 * This replaces a hardcoded `SEED_TERMS` array of eight show names that were
 * searched for individually. Those were real shows fetched live, but the
 * *selection* was a fixed list that reflected nothing and never changed.
 *
 * Sasha's plan: Apple's ranking until Podtracker has its own signal — likely
 * past ~100 users — then switch to popularity derived from follows, ratings and
 * logs on this site.
 *
 * Limits found by testing: 100 results max (asking for 200 returns HTTP 500).
 * Parameterised by country and genre, so wider coverage comes from more calls,
 * not a bigger `limit`.
 */
export async function getPopularPodcasts(limit = 8, country = "us"): Promise<PopularPodcast[]> {
  // Apple caps this at 100; asking for more 500s.
  const fetchCount = Math.min(Math.max(limit, 1), 100);
  const url = `${CHARTS_BASE}/${country}/podcasts/top/${fetchCount}/podcasts.json`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      feed?: { results?: { id: string; name: string; artistName: string; artworkUrl100: string }[] };
    };

    return (data.feed?.results ?? []).slice(0, limit).map((r) => ({
      id: r.id,
      title: r.name,
      artistName: r.artistName,
      // The chart returns 100px artwork. Apple's CDN serves any size from the
      // same path, so ask for something that survives a full-width grid.
      artworkUrl: r.artworkUrl100.replace(/\/\d+x\d+bb\./, "/600x600bb."),
    }));
  } catch {
    // A dead chart endpoint should leave the grid empty, not 500 the page.
    return [];
  }
}
