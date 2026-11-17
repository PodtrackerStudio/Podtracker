import Link from "next/link";
import { MediaThumbCard } from "@/components/MediaThumbCard";
import { PlayIcon, PlusIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { withDbRetry } from "@/lib/dbRetry";
import { avatarSrc } from "@/lib/avatar";
import { usernameToPath } from "@/lib/routeParams";
import { getPopularPodcasts } from "@/lib/popularPodcasts";
import { getFollowedEpisodes } from "@/lib/followedEpisodes";
import { getTrendingReviews } from "@/lib/trendingReviews";
import styles from "./home.module.css";

type HomeUser = { id: string; username: string; displayName: string };

/**
 * The viewer's own numbers for the greeting card. Three counts on indexed
 * columns. They must never be what breaks the page, so a failure costs the
 * stats strip, not the feed.
 */
async function getViewerStats(userId: string) {
  try {
    const [following, logs, reviews] = await withDbRetry(
      () =>
        Promise.all([
          db.podcastFollow.count({ where: { userId } }),
          db.logEntry.count({ where: { userId } }),
          db.logEntry.count({ where: { userId, reviewText: { not: null } } }),
        ]),
      "home:stats",
    );
    return { following, logs, reviews };
  } catch (error) {
    console.error("[home] could not read the viewer's stats:", error);
    return null;
  }
}

/**
 * Everything on /home below the nav, for one signed-in person. Split from
 * page.tsx so the page itself is only the auth gate.
 */
export async function HomeFeed({ user }: { user: HomeUser }) {
  // In parallel: the feed parses podcast XML and is far and away the slowest of
  // these, so running the rest alongside it costs nothing extra.
  const [newEpisodes, reviews, popularPodcasts, stats] = await Promise.all([
    getFollowedEpisodes(user.id),
    // 8, not 3 (Sasha, 2026-10-22): show what has actually been written rather
    // than a sample of it, because the site reads as empty otherwise. Nothing
    // was being filtered out before — every review with text is eligible, and 3
    // was simply the number asked for.
    //
    // Even on purpose: `.reviewsGrid` is two columns, so an odd cap guaranteed
    // a half-empty last row no matter how many reviews existed. A ceiling
    // rather than "all of them", so the section stays a section once there are
    // hundreds.
    getTrendingReviews(8),
    getPopularPodcasts(),
    getViewerStats(user.id),
  ]);

  const name = user.displayName || user.username;
  const profilePath = `/user/${usernameToPath(user.username)}`;
  const followsNothing = stats ? stats.following === 0 : newEpisodes.length === 0;

  return (
    <main className={styles.main}>
      {/* The greeting is a card in the content-box blue, with the viewer's own
          avatar and numbers, so the first thing on the page is about them. */}
      <section className={styles.hero}>
        <Link href={profilePath} className={styles.heroAvatarLink} aria-label="Your profile">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.heroAvatar} src={avatarSrc(user.id)} alt="" />
        </Link>

        <div className={styles.heroBody}>
          <h1>Good to see you {name}!</h1>
          {/* Only for an account that follows nothing, where it says what to
              do. Otherwise the section title below already says it (Phillip,
              2026-11-17: "get rid of those"). */}
          {followsNothing && (
            <p className={styles.heroLead}>Follow a few shows and their new episodes turn up here.</p>
          )}

          {stats && (
            <div className={styles.heroStats}>
              <Link href="/following" className={styles.heroStat}>
                <strong>{stats.following}</strong> {stats.following === 1 ? "show" : "shows"} followed
              </Link>
              <Link href={`${profilePath}/diary`} className={styles.heroStat}>
                <strong>{stats.logs}</strong> logged
              </Link>
              <Link href={`${profilePath}/reviews`} className={styles.heroStat}>
                <strong>{stats.reviews}</strong> {stats.reviews === 1 ? "review" : "reviews"}
              </Link>
            </div>
          )}
        </div>

        <div className={styles.heroActions}>
          <Link href="/log" className={styles.heroPrimary}>
            <PlusIcon size={16} />
            Log podcast
          </Link>
          <Link href="/explore" className={styles.heroSecondary}>
            {followsNothing ? "Find shows to follow" : "Explore"}
          </Link>
        </div>
      </section>

      {newEpisodes.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>New from shows you follow</h2>
          <div className={styles.episodeGrid}>
            {newEpisodes.map((ep) => (
              <Link className={styles.episodeCard} href={ep.href} key={ep.key}>
                {/* Episode art is often the show's square cover. Shown whole,
                    over a blurred copy of itself, rather than cropped to 16:9 —
                    the same treatment as the profile's recent logs. */}
                <div className={styles.episodeThumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.episodeThumbBlur} src={ep.coverUrl} alt="" aria-hidden />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.episodeThumbImg} src={ep.coverUrl} alt="" />
                  <div className={styles.playOverlay}>
                    <PlayIcon />
                  </div>
                </div>
                {/* Visible captions, not a hover card: twelve unlabelled images
                    gave no way to tell what anything was without pointing at it,
                    and on a phone there is no pointing. */}
                <div className={styles.episodeTitle}>{ep.title}</div>
                <div className={styles.episodeMeta}>
                  {ep.showTitle} · {ep.dateLabel}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {reviews.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Trending reviews</h2>
          <div className={styles.reviewsGrid}>
            {reviews.map((r) => (
              <article className={styles.reviewCard} key={r.id}>
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
                <div className={styles.reviewBody}>
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
              </article>
            ))}
          </div>
        </section>
      )}

      <section className={styles.section}>
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
  );
}
