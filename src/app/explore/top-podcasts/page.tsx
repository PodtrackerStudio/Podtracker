import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { getPopularPodcasts } from "@/lib/popularPodcasts";
import styles from "./topPodcasts.module.css";

/**
 * The full chart behind Explore's "See full list" — the same big cover grid the
 * Add Favorites popup shows, as a real page rather than a modal.
 *
 * 100 is Apple's hard cap per call; asking for more returns HTTP 500.
 */
export default async function TopPodcastsPage() {
  const podcasts = await getPopularPodcasts(100);

  return (
    <>
      <SiteNav active="explore" />
      <main className={styles.main}>
        <h1 className={styles.title}>Top podcasts of today</h1>

        {podcasts.length === 0 ? (
          <p className={styles.empty}>Couldn&apos;t load the chart just now.</p>
        ) : (
          <div className={styles.grid}>
            {podcasts.map((p) => (
              <Link className={styles.card} href={`/podcast/${p.id}`} key={p.id} title={p.title}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.artworkUrl} alt={p.title} />
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
