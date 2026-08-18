import { redirect } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { getCurrentUser } from "@/lib/auth";
import { getPopularPodcasts } from "@/lib/popularPodcasts";
import styles from "./home.module.css";

/**
 * Stripped to popular podcasts (Sasha, 2026-08-18). It previously showed a feed
 * of new uploads plus Recent activity from friends, New reviews, New lists,
 * Popular reviews and Popular Lists — all of which need a user base that does
 * not exist, so every one rendered mock data.
 *
 * Popularity is iTunes' for now; it switches to Podtracker's own once there are
 * enough users. The friends/reviews/lists sections come back with the
 * with-users design — they are in the Figma and in the change log, not lost.
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const popularPodcasts = await getPopularPodcasts();

  return (
    <>
      <SiteNav active="home" />

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1>Good to see you, {user.displayName}!</h1>
          <p>Here are popular podcasts</p>
        </section>

        <section>
          <div className={styles.podcastGrid}>
            {popularPodcasts.map((p) => (
              <Link className={styles.podcastCard} href={`/podcast/${p.id}`} key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.artworkUrl} alt={p.title} />
              </Link>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
