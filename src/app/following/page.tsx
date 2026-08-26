import { redirect } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { AddPodcastsButton } from "@/components/AddPodcastsButton";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPopularPodcasts } from "@/lib/popularPodcasts";
import { FollowingGrid, type FollowedShow } from "./FollowingGrid";
import styles from "./following.module.css";

// "Your shows!" is personal, so it needs a signed-in user.
export default async function FollowingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // The shows the user actually follows — whether followed from a podcast page
  // or added through "Add Favorites", which follows as it favourites. This page
  // used to branch on a favourite count and then render twelve hardcoded shows,
  // so following something never showed up here.
  const [follows, chart] = await Promise.all([
    db.podcastFollow.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { podcast: true },
    }),
    // Apple's chart gives the popup something real to offer. Switches to
    // Podtracker popularity once there is a user base.
    getPopularPodcasts(48),
  ]);

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

  return (
    <>
      <SiteNav />
      <main className={styles.main}>
        <h1 className={styles.sectionTitle}>Your shows!</h1>

        {shows.length === 0 ? (
          <div className={styles.emptyWrap}>
            <p className={styles.emptyText}>No Favorites...</p>
            <AddPodcastsButton label="Add Favorites" className={styles.emptyAction} iconSize={26} iconAfter shows={chart} />
          </div>
        ) : (
          <>
            <FollowingGrid shows={shows} />
            {/* The picker has to stay reachable once there is something here —
                otherwise adding one show removes the only way to add a second.
                Same pattern as Create list on the profile's lists tab. */}
            <div className={styles.addRow}>
              <AddPodcastsButton label="Add Favorites" className={styles.emptyAction} iconSize={26} iconAfter shows={chart} />
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
