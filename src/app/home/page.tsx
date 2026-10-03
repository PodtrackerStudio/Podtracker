import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { MediaThumbCard } from "@/components/MediaThumbCard";
import { PlayIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";
import { getPopularPodcasts } from "@/lib/popularPodcasts";
import { getFollowedEpisodes } from "@/lib/followedEpisodes";
import { getTrendingReviews } from "@/lib/trendingReviews";
import styles from "./home.module.css";

export const metadata: Metadata = {
  title: "Home",
  robots: { index: false, follow: false },
};

/**
 * **This page is per-viewer, so it must never be cached as one page.**
 *
 * It already renders dynamically in production, because `getCurrentUser()`
 * reaches `cookies()`. But only when Supabase is configured — without those
 * keys it returns null before touching a cookie, which is why this page builds
 * as static here. That is a build-machine artifact today, and a feed of the
 * shows *you* follow is not something to leave resting on an environment
 * variable: if it were ever served static, the first visitor's feed would be
 * handed to everyone.
 */
export const dynamic = "force-dynamic";

/**
 * The home page, with its feed back (Sasha, 2026-10-03).
 *
 * It was stripped to popular podcasts on 2026-08-18 because every section below
 * needed a user base that did not exist, and all of them rendered mock data.
 * People are using the site now, so two of them return reading the real thing:
 * new uploads from the shows this viewer follows, and reviews ranked by likes.
 * Both are driven by their own data, not by `HAS_COMMUNITY_DATA` — a section
 * with nothing in it simply doesn't render, so nothing here can be empty or
 * fake.
 *
 * Still absent, and still waiting on the design and the data: Recent activity
 * from friends, New lists, Popular lists.
 *
 * **Popular podcasts stays last.** It is the fallback that keeps the page worth
 * looking at for somebody who follows nothing and whose feed is therefore
 * empty — which is every new account.
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // In parallel: the feed parses podcast XML and is far and away the slowest of
  // the three, so running it alongside the other two costs nothing extra.
  const [newEpisodes, reviews, popularPodcasts] = await Promise.all([
    getFollowedEpisodes(user.id),
    getTrendingReviews(3),
    getPopularPodcasts(),
  ]);

  return (
    <>
      <SiteNav active="home" />

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1>Good to see you {user.displayName}!</h1>
          <p>
            {newEpisodes.length > 0
              ? "New from the shows you follow"
              : "Follow a few shows and their new episodes turn up here"}
          </p>
        </section>

        {newEpisodes.length > 0 && (
          <section>
            <h2 className={styles.sectionTitle}>New from shows you follow</h2>
            <div className={styles.episodeGrid}>
              {newEpisodes.map((ep) => (
                <Link className={styles.episodeThumb} href={ep.href} key={ep.key}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ep.coverUrl} alt="" />
                  <div className={styles.playOverlay}>
                    <PlayIcon />
                  </div>
                  <div className={styles.hoverCard}>
                    <div className={styles.hoverCardTitle}>{ep.title}</div>
                    <div className={styles.hoverCardDate}>
                      {ep.showTitle} · {ep.dateLabel}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {reviews.length > 0 && (
          <>
            <hr className="divider" />
            <section>
              <h2 className={styles.sectionTitle}>Trending reviews</h2>
              <div className={styles.reviewsGrid}>
                {reviews.map((r) => (
                  <div className={styles.reviewCard} key={r.id}>
                    {/* The artwork carries what was reviewed, in its hover
                        popup. The show and episode name are deliberately not
                        printed on a review card — see CLAUDE.md. */}
                    <div className={styles.reviewThumb}>
                      <MediaThumbCard
                        href={r.subjectHref}
                        cover={r.coverUrl}
                        title={r.subjectTitle}
                        subtitle={r.subjectSubtitle}
                      />
                    </div>
                    <div>
                      <div className={styles.reviewHeader}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className={styles.avatar} src={r.authorAvatarUrl ?? "/default-avatar.webp"} alt="" />
                        <Link href={`/user/${r.authorUsername}`} className={styles.reviewerName}>
                          {r.authorName}
                        </Link>
                        {r.tierLabel && r.tierClass && (
                          <span className={`${styles.ratingTag} ${styles[r.tierClass]}`}>{r.tierLabel}</span>
                        )}
                      </div>
                      <p className={styles.reviewText}>{r.text}</p>
                      <Link href={r.href} className={styles.moreLink}>
                        MORE
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <hr className="divider" />

        <section>
          <h2 className={styles.sectionTitle}>Popular podcasts</h2>
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
