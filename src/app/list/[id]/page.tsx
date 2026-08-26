import { notFound, redirect } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { AddPodcastsBar } from "@/components/AddPodcastsBar";
import { getCurrentUser } from "@/lib/auth";
import { getListForView } from "@/lib/lists";
import { ListDetailClient } from "./ListDetailClient";
import styles from "./list.module.css";

/**
 * A user's list, rendered from the database.
 *
 * This used to serve one hardcoded mock — the "Joe Rogan- MMA Show" list —
 * for every id, which is why creating a list appeared to work and then dropped
 * you on somebody else's. Nothing is hardcoded now; an id that isn't a real
 * list 404s.
 *
 * The owner gets the same "Add podcasts…" bar as Next listening, so adding to
 * a list after creating it means opening the list, exactly as Sasha asked.
 */
export default async function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const list = await getListForView(id);
  if (!list) notFound();

  // Next listening is a List too (isWatchlist). It has its own page — land
  // there rather than rendering it as a list the user curated.
  if (list.isWatchlist) redirect(`/user/${list.ownerUsername}/next-listening`);

  const viewer = await getCurrentUser();
  const isOwner = viewer?.id === list.ownerId;

  return (
    <>
      <SiteNav />

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>{list.title}</h1>
          <div className={styles.byline}>by {list.ownerName}</div>
        </div>

        {isOwner && (
          <div className={styles.addRow}>
            <AddPodcastsBar endpoint="/api/lists/items" extraBody={{ listId: list.id }} collectionName={list.title} />
          </div>
        )}

        <ListDetailClient items={list.items} isRanked={list.isRanked} description={list.description} />
      </main>

      <SiteFooter />
    </>
  );
}
