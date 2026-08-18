import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PlusIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { FollowingGrid } from "./FollowingGrid";
import styles from "./following.module.css";

// "Your shows!" is personal, so it needs a signed-in user.
export default async function FollowingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Real favourites, not a hardcoded list. Zero today — nothing can create one
  // until the write layer lands — which is exactly why the empty state ships.
  const favouriteCount = await db.favorite.count({ where: { userId: user.id } });

  return (
    <>
      <SiteNav />
      <main className={styles.main}>
        <h1 className={styles.sectionTitle}>Your shows!</h1>

        {favouriteCount === 0 ? (
          <div className={styles.emptyWrap}>
            <p className={styles.emptyText}>No Favorites...</p>
            {/* Points at Explore for now. Sasha is designing a find-shows popup
                to replace this — see the change log. */}
            <Link href="/explore" className={styles.emptyAction}>
              Add Favorites
              <PlusIcon size={26} />
            </Link>
          </div>
        ) : (
          <FollowingGrid />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
