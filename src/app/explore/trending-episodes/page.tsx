import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { MediaThumbCard } from "@/components/MediaThumbCard";
import { getTrendingEpisodes } from "@/lib/trendingEpisodes";
import styles from "../top-podcasts/topPodcasts.module.css";

/**
 * The full chart behind Explore's "See full list" beside Popular episodes.
 * Mirrors /explore/top-podcasts and reuses its stylesheet.
 *
 * 100 is Apple's cap per call; asking for more returns HTTP 500. This one is
 * heavier than the shows chart because each distinct show's feed is fetched to
 * resolve episode links — cached an hour, and shows repeat across the chart.
 */
export default async function TrendingEpisodesPage() {
  // Resolution at render time stays OFF. Measured: 100 entries span ~40 shows,
  // each a full RSS parse (~3.5s, single-threaded so they queue) — the cold
  // load timed out past 280s even with parsed feeds cached.
  //
  // Entries still lead to episodes. The unresolved ones point at
  // `/episode/find`, which parses that one show's feed on click and redirects,
  // so the cost is one feed for the episode someone actually opened instead of
  // forty for a page they may only scroll past.
  const episodes = await getTrendingEpisodes(100, "us", false);

  return (
    <>
      <SiteNav active="explore" />
      <main className={styles.main}>
        <h1 className={styles.title}>Trending episodes</h1>

        {episodes.length === 0 ? (
          <p className={styles.empty}>Couldn&apos;t load the chart just now.</p>
        ) : (
          <div className={styles.grid}>
            {episodes.map((ep) => (
              <div className={styles.card} key={ep.id}>
                {/* MediaThumbCard for the shared hover popup — episode title
                    over the show name — same as the ratings grid. */}
                <MediaThumbCard href={ep.href} cover={ep.artworkUrl} title={ep.title} subtitle={ep.showName} />
              </div>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
