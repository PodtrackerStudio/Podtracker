import { redirect } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { AddPodcastsButton } from "@/components/AddPodcastsButton";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPopularPodcasts } from "@/lib/popularPodcasts";
import { FollowingGrid } from "./FollowingGrid";
import styles from "./following.module.css";

// "Your shows!" is personal, so it needs a signed-in user.
export default async function FollowingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Real favourites, not a hardcoded list. Zero today — nothing can create one
  // until the write layer lands — which is exactly why the empty state ships.
  const [favouriteCount, chart] = await Promise.all([
    db.favorite.count({ where: { userId: user.id } }),
    // Apple's chart gives the popup something real to offer. Switches to
    // Podtracker popularity once there is a user base.
    getPopularPodcasts(48),
  ]);

  return (
    <>
      <SiteNav />
      <main className={styles.main}>
        <h1 className={styles.sectionTitle}>Your shows!</h1>

        {favouriteCount === 0 ? (
          <div className={styles.emptyWrap}>
            <p className={styles.emptyText}>No Favorites...</p>
            <AddPodcastsButton label="Add Favorites" className={styles.emptyAction} iconSize={26} iconAfter shows={chart} />
          </div>
        ) : (
          <FollowingGrid />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
