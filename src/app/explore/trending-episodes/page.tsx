import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
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
  const episodes = await getTrendingEpisodes(100);

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
              <Link className={styles.card} href={ep.href} key={ep.id} title={`${ep.title} — ${ep.showName}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ep.artworkUrl} alt={ep.title} />
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
