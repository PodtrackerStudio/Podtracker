import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ProfileSubHeader } from "../ProfileSubHeader";
import styles from "../profileSub.module.css";

export default async function DiaryPage({ params }: { params: Promise<{ username: string }> }) {
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

  const entries = await db.logEntry.findMany({
    where: { userId: profileUser.id },
    include: { episode: true, podcast: true },
    orderBy: { listenedDate: "desc" },
  });

  return (
    <>
      <SiteNav active="profile" />
      <main className={styles.main}>
        <ProfileSubHeader username={username} avatarUrl={profileUser.avatarUrl} active="diary" />

        {entries.length === 0 ? (
          <div className={styles.emptyWrap}>
            <p className={styles.emptyText}>No diary entries yet...</p>
            {isOwnProfile && (
              <Link href="/explore" className={styles.emptyAction}>
                Log an episode
              </Link>
            )}
          </div>
        ) : (
          <div className={styles.reviewList}>
            {entries.map((entry) => {
              const cover = entry.episode?.coverUrl ?? entry.podcast?.coverUrl ?? "https://picsum.photos/seed/diarydefault/200/200";
              const title = entry.episode?.title ?? entry.podcast?.title ?? "Untitled";
              const href = entry.episodeId
                ? `/podcast/${entry.podcastId ?? entry.episode?.podcastId}/episode/${entry.episodeId}`
                : `/podcast/${entry.podcastId}`;
              return (
                <Link className={styles.reviewRow} href={href} key={entry.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.reviewThumb} src={cover} alt={title} />
                  <div className={styles.reviewBody}>
                    <div className={styles.reviewTitle}>{title}</div>
                    <div className={styles.reviewDate}>{entry.listenedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                    {entry.reviewText && <p className={styles.reviewText}>{entry.reviewText}</p>}
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
