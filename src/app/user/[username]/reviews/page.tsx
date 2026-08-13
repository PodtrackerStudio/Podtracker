import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ProfileSubHeader } from "../ProfileSubHeader";
import styles from "../profileSub.module.css";

const TIER_LABELS: Record<string, string> = {
  HIGHLY_RECOMMEND: "Highly Recommend",
  RECOMMEND: "Recommend",
  OK: "OK",
  DONT_RECOMMEND: "Don't Recommend",
  DIDNT_FINISH: "Didn't Finish",
};
const TIER_CLASS: Record<string, string> = {
  HIGHLY_RECOMMEND: "highly",
  RECOMMEND: "recommend",
  OK: "ok",
  DONT_RECOMMEND: "dont",
  DIDNT_FINISH: "didnt",
};

export default async function ReviewsPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profileUser = await db.user.findUnique({ where: { username } });

  if (!profileUser) {
    return (
      <>
        <SiteNav active="profile" />
        <main className={styles.main}>
          <p style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>No user found with username &ldquo;{username}&rdquo;.</p>
        </main>
        <SiteFooter />
      </>
    );
  }

  const viewer = await getCurrentUser();
  const isOwnProfile = viewer?.id === profileUser.id;

  const reviews = await db.logEntry.findMany({
    where: { userId: profileUser.id, reviewText: { not: null } },
    include: { episode: true, podcast: true },
    orderBy: { listenedDate: "desc" },
  });

  // Reviews and ratings are separate (a review doesn't require a rating), so
  // look up whichever rating exists for the same target to show a tier tag.
  const [podcastRatings, episodeRatings] = await Promise.all([
    db.podcastRating.findMany({ where: { userId: profileUser.id } }),
    db.episodeRating.findMany({ where: { userId: profileUser.id } }),
  ]);

  return (
    <>
      <SiteNav active="profile" />
      <main className={styles.main}>
        <ProfileSubHeader username={username} avatarUrl={profileUser.avatarUrl} active="reviews" />

        {reviews.length === 0 ? (
          <div className={styles.emptyWrap}>
            <p className={styles.emptyText}>No reviews yet...</p>
            {isOwnProfile && (
              <Link href="/explore" className={styles.emptyAction}>
                Find something to review
              </Link>
            )}
          </div>
        ) : (
          <div className={styles.reviewList}>
            {reviews.map((entry) => {
              const cover = entry.episode?.coverUrl ?? entry.podcast?.coverUrl ?? "https://picsum.photos/seed/reviewdefault/200/200";
              const title = entry.episode?.title ?? entry.podcast?.title ?? "Untitled";
              const href = entry.episodeId
                ? `/podcast/${entry.podcastId ?? entry.episode?.podcastId}/episode/${entry.episodeId}`
                : `/podcast/${entry.podcastId}`;
              const rating = entry.episodeId
                ? episodeRatings.find((r) => r.episodeId === entry.episodeId)
                : podcastRatings.find((r) => r.podcastId === entry.podcastId);

              return (
                <Link className={styles.reviewRow} href={href} key={entry.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.reviewThumb} src={cover} alt={title} />
                  <div className={styles.reviewBody}>
                    <div className={styles.reviewTitle}>{title}</div>
                    {rating && <span className={`${styles.reviewTag} ${styles[TIER_CLASS[rating.tier]]}`}>{TIER_LABELS[rating.tier]}</span>}
                    <p className={styles.reviewText}>{entry.reviewText}</p>
                    <div className={styles.reviewDate}>{entry.listenedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
