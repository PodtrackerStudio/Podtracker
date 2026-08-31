import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { MediaThumbCard } from "@/components/MediaThumbCard";
import { AddPodcastsBar } from "@/components/AddPodcastsBar";
import { RemoveListItemButton } from "@/components/RemoveListItemButton";
import { FilterMenu, type FilterOption } from "@/components/FilterMenu";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getNextListening } from "@/lib/nextListening";
import styles from "./nextListening.module.css";

const MEDIA_OPTIONS: FilterOption[] = [
  { value: "shows", label: "Shows only" },
  { value: "episodes", label: "Episodes only" },
];

/**
 * The Next listening list page.
 *
 * Sasha revised the placement twice: originally a standalone page, then "a
 * panel on the profile, no separate page", and finally this — the profile shows
 * a plain thumbnail like any other list, and clicking through opens this page,
 * which is where the "Add podcasts…" bar and the All media menu live.
 *
 * The All media menu is the same `FilterMenu` as the ratings page, per "make it
 * exactly like that". It reads its selection from the query string.
 */
export default async function NextListeningPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ media?: string }>;
}) {
  const { username } = await params;
  const sp = await searchParams;

  const profileUser = await db.user.findUnique({ where: { username }, select: { id: true } });
  if (!profileUser) notFound();

  const [viewer, allItems] = await Promise.all([getCurrentUser(), getNextListening(profileUser.id)]);
  const isOwnProfile = viewer?.id === profileUser.id;

  const media = ["shows", "episodes"].includes(sp.media ?? "") ? sp.media : "all";
  const items =
    media === "shows"
      ? allItems.filter((i) => i.kind === "show")
      : media === "episodes"
        ? allItems.filter((i) => i.kind === "episode")
        : allItems;

  return (
    <>
      <SiteNav active="profile" />
      <main className={styles.main}>
        <h1 className={styles.title}>Next Listening…</h1>

        <div className={styles.controls}>
          <FilterMenu param="media" options={MEDIA_OPTIONS} defaultLabel="All media" />
          {/* Only the owner can add to their own queue. */}
          {isOwnProfile && <AddPodcastsBar />}
          <span className={styles.count}>
            {items.length} {items.length === 1 ? "podcast" : "podcasts"}
          </span>
        </div>

        {items.length === 0 ? (
          <p className={styles.empty}>
            {allItems.length === 0 ? "Nothing queued yet." : "Nothing matches that filter."}
          </p>
        ) : (
          <div className={styles.grid}>
            {items.map((item) => (
              <div className={`${styles.card} media-thumb-cell`} key={item.itemId}>
                <MediaThumbCard href={item.href} cover={item.coverUrl ?? "/default-avatar.webp"} title={item.title} />
                {/* Only the owner; the endpoint re-checks. */}
                {isOwnProfile && <RemoveListItemButton itemId={item.itemId} title={item.title} />}
              </div>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
