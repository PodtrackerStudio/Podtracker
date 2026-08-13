import { searchPodcasts } from "./podcastApi";

// Stand-in for real popularity data until Spotify API credentials are available.
// These are real, well-known shows fetched live from the iTunes Search API —
// not fabricated ratings/rankings — just a fixed starting list until a real
// popularity signal (Spotify, or the app's own follower/rating counts once
// there's a user base) can rank them.
const SEED_TERMS = [
  "The Joe Rogan Experience",
  "Up First NPR",
  "The Tucker Carlson Show",
  "Pardon My Take",
  "Huberman Lab",
  "The Shawn Ryan Show",
  "Crime Junkie",
  "This Past Weekend with Theo Von",
];

export type PopularPodcast = {
  id: string;
  title: string;
  artistName: string;
  artworkUrl: string;
};

export async function getPopularPodcasts(): Promise<PopularPodcast[]> {
  const results = await Promise.allSettled(SEED_TERMS.map((term) => searchPodcasts(term, 1)));

  return results
    .map((r) => {
      if (r.status !== "fulfilled" || r.value.length === 0) return null;
      const p = r.value[0];
      return {
        id: String(p.itunesId),
        title: p.title,
        artistName: p.artistName,
        artworkUrl: p.artworkUrl,
      };
    })
    .filter((p): p is PopularPodcast => p !== null);
}
