import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { AddPodcastsButton } from "@/components/AddPodcastsButton";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { withDbRetry } from "@/lib/dbRetry";
import { getPopularPodcasts } from "@/lib/popularPodcasts";
import { FollowingGrid, type FollowedShow } from "@/app/following/FollowingGrid";
import { ProfileSubHeader } from "../ProfileSubHeader";
import styles from "../profileSub.module.css";

/**
 * The shows a given member follows.
 *
 * **Why this exists when `/following` already does.** `/following` reads
 * `getCurrentUser()`, so it always shows the *viewer's* shows. The profile
 * sub-nav linked Favorites straight at it, which meant opening anyone's profile
 * and pressing Favorites showed your own follows under their name — reported on
 * 2026-09-28. Every neighbouring tab (`reviews`, `lists`, `diary`) is scoped by
 * the username in its own URL; this one was the exception.
 *
 * `CLAUDE.md` recorded the old `/user/[username]/favorites` page as deleted on
 * purpose, because Favorites and Following are the same feature and one
 * destination was simpler. That held while a profile was only ever your own.
 * Search finds members now, so other people's profiles are reachable and the
 * page has to know whose it is.
 */
export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `${username}'s favorites`,
    description: `Podcasts followed by ${username} on Podtracker.`,
    alternates: { canonical: `/user/${username}/following` },
  };
}

export default async function ProfileFollowingPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  // Retried: the page's first touch of the database, so a moment without a
  // connection would otherwise kill the render outright. See lib/dbRetry.ts.
  const profileUser = await withDbRetry(
    () => db.user.findUnique({ where: { username } }),
    "profile:following:lookup",
  );

  if (!profileUser) {
    return (
      <>
        <SiteNav active="profile" />
        <main className={styles.main}>
          <p style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
            No user found with username &ldquo;{username}&rdquo;.
          </p>
        </main>
        <SiteFooter />
      </>
    );
  }

  const viewer = await getCurrentUser();
  const isOwnProfile = viewer?.id === profileUser.id;

  const follows = await withDbRetry(
    () =>
      db.podcastFollow.findMany({
        where: { userId: profileUser.id },
        orderBy: { createdAt: "desc" },
        include: { podcast: true },
      }),
    "profile:following",
  );

  // A follow whose show has no iTunes id has no page to link to. Nothing writes
  // those any more, but legacy rows exist from before externalId was populated.
  const shows: FollowedShow[] = follows.flatMap((f) =>
    f.podcast.externalId
      ? [
          {
            externalId: f.podcast.externalId,
            title: f.podcast.title,
            author: f.podcast.author,
            coverUrl: f.podcast.coverUrl,
          },
        ]
      : [],
  );

  // Only fetched when it can be used. Adding shows belongs to whoever owns the
  // profile, so a visitor never sees the picker and never pays for the chart
  // request that fills it.
  const chart = isOwnProfile ? await getPopularPodcasts(48) : [];

  return (
    <>
      <SiteNav active="profile" />
      <main className={styles.main}>
        <ProfileSubHeader
          username={username}
          avatarUrl={profileUser.avatarUrl}
          active="favorites"
          isOwnProfile={isOwnProfile}
        />

        {shows.length === 0 ? (
          <div className={styles.emptyWrap}>
            <p className={styles.emptyText}>
              {isOwnProfile ? "No Favorites..." : `${profileUser.displayName || username} isn't following any shows yet.`}
            </p>
            {isOwnProfile && (
              <AddPodcastsButton
                label="Add Favorites"
                className={styles.emptyAction}
                iconSize={26}
                iconAfter
                shows={chart}
              />
            )}
          </div>
        ) : (
          <>
            <FollowingGrid shows={shows} />
            {/* The picker has to stay reachable once there is something here —
                otherwise adding one show removes the only way to add a second. */}
            {isOwnProfile && (
              <div className={styles.addRow}>
                <AddPodcastsButton
                  label="Add Favorites"
                  className={styles.emptyAction}
                  iconSize={26}
                  iconAfter
                  shows={chart}
                />
              </div>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
