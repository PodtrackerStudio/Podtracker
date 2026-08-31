import { notFound, redirect } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { AddPodcastsBar } from "@/components/AddPodcastsBar";
import { FilterMenu, type FilterOption } from "@/components/FilterMenu";
import { getCurrentUser } from "@/lib/auth";
import { getListForView } from "@/lib/lists";
import { ListDetailClient } from "./ListDetailClient";
import styles from "./list.module.css";

const MEDIA_OPTIONS: FilterOption[] = [
  { value: "shows", label: "Shows only" },
  { value: "episodes", label: "Episodes only" },
];

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
 *
 * The All media menu is the same `FilterMenu` as Next listening and the ratings
 * page. It reads its selection from the query string, so a filtered list is a
 * linkable URL rather than component state.
 */
export default async function ListDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ media?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const list = await getListForView(id);
  if (!list) notFound();

  // Next listening is a List too (isWatchlist). It has its own page — land
  // there rather than rendering it as a list the user curated.
  if (list.isWatchlist) redirect(`/user/${list.ownerUsername}/next-listening`);

  const viewer = await getCurrentUser();
  const isOwner = viewer?.id === list.ownerId;

  const media = ["shows", "episodes"].includes(sp.media ?? "") ? sp.media : "all";
  const items =
    media === "shows"
      ? list.items.filter((i) => i.kind === "show")
      : media === "episodes"
        ? list.items.filter((i) => i.kind === "episode")
        : list.items;

  return (
    <>
      <SiteNav />

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>{list.title}</h1>
          <div className={styles.byline}>by {list.ownerName}</div>
        </div>

        {/* Filter on the left, add bar centred — the same arrangement as the
            Next listening page's control row. Anyone can filter; only the
            owner can add. */}
        <div className={styles.controlsRow}>
          <FilterMenu param="media" options={MEDIA_OPTIONS} defaultLabel="All media" />
          {isOwner && (
            <div className={styles.addSlot}>
              <AddPodcastsBar endpoint="/api/lists/items" extraBody={{ listId: list.id }} collectionName={list.title} />
            </div>
          )}
        </div>

        <ListDetailClient
          items={items}
          isOwner={isOwner}
          totalCount={list.items.length}
          isRanked={list.isRanked}
          description={list.description}
        />
      </main>

      <SiteFooter />
    </>
  );
}
