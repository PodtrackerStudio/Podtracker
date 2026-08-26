import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { episodeHref } from "@/lib/episodeKey";
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
    // episode.podcast, because an episode entry has no podcastId of its own —
    // the show it belongs to is only reachable through the episode.
    include: { episode: { include: { podcast: true } }, podcast: true },
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
              // Both ids here used to be database cuids, so every episode row
              // linked to the placeholder episode rather than the logged one.
              const showExternalId = entry.podcast?.externalId ?? entry.episode?.podcast?.externalId ?? null;
              const href = entry.episode
                ? episodeHref(showExternalId, entry.episode.externalId)
                : showExternalId
                  ? `/podcast/${showExternalId}`
                  : null;
              const body = (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.reviewThumb} src={cover} alt={title} />
                  <div className={styles.reviewBody}>
                    <div className={styles.reviewTitle}>{title}</div>
                    <div className={styles.reviewDate}>{entry.listenedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                    {entry.reviewText && <p className={styles.reviewText}>{entry.reviewText}</p>}
                  </div>
                </>
              );

              // A legacy row whose show never got an iTunes id has nowhere to
              // go; render it unlinked rather than pointing at a broken route.
              return href ? (
                <Link className={styles.reviewRow} href={href} key={entry.id}>
                  {body}
                </Link>
              ) : (
                <div className={styles.reviewRow} key={entry.id}>
                  {body}
                </div>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
