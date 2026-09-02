"use client";

import { useState, useMemo } from "react";
import { MediaThumbCard } from "@/components/MediaThumbCard";
import { RemoveListItemButton } from "@/components/RemoveListItemButton";
import { LikeButton } from "@/components/LikeButton";
import type { ListItemView } from "@/lib/lists";
import styles from "./list.module.css";

type SortMode = "listOrder" | "earliestFirst" | "newestFirst";

const PAGE_SIZE = 100;

const SORT_LABELS: Record<SortMode, string> = {
  listOrder: "List order",
  earliestFirst: "Earliest first",
  newestFirst: "Newest first",
};

// "Average rating" used to be a fourth option. It sorted invented numbers on
// the mock list and there is nothing real to sort by yet — list items carry no
// aggregated score. It comes back when averages are computed, alongside
// HAS_COMMUNITY_DATA being flipped on.

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Date sorts have to cope with shows, which have no release date at all.
 * Undated items keep their list order and always sit after the dated ones,
 * whichever direction is chosen — that's more honest than treating "no date"
 * as either the oldest or the newest thing in the list.
 */
function byDate(items: ListItemView[], direction: 1 | -1) {
  const dated = items.filter((i) => i.publishedAt);
  const undated = items.filter((i) => !i.publishedAt);
  dated.sort((a, b) => direction * a.publishedAt!.localeCompare(b.publishedAt!));
  undated.sort((a, b) => a.position - b.position);
  return [...dated, ...undated];
}

export function ListDetailClient({
  items,
  totalCount,
  isRanked,
  description,
  isOwner = false,
  like,
}: {
  /** Already filtered by the All media menu — the count reflects the filter. */
  items: ListItemView[];
  /** Unfiltered size, so an empty grid can say which kind of empty it is. */
  totalCount: number;
  isRanked: boolean;
  description: string | null;
  /** Only the owner gets the remove control. Re-checked server-side. */
  isOwner?: boolean;
  /** Like state for the list itself, resolved on the server. */
  like?: { listId: string; count: number; likedByViewer: boolean; signedIn: boolean };
}) {
  const [sort, setSort] = useState<SortMode>("listOrder");
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const copy = [...items];
    switch (sort) {
      case "earliestFirst":
        return byDate(copy, 1);
      case "newestFirst":
        return byDate(copy, -1);
      default:
        return copy.sort((a, b) => a.position - b.position);
    }
  }, [items, sort]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function changeSort(mode: SortMode) {
    setSort(mode);
    setPage(1);
  }

  return (
    <>
      <div className={styles.metaRow}>
        <div className={styles.episodeCount}>
          {items.length} {items.length === 1 ? "podcast" : "podcasts"}
        </div>
        {/* Description with the heart beneath it, centred — the frame puts the
            likes between the item count and the sort menu. */}
        <div className={styles.descriptionCol}>
          <div className={styles.description}>{description}</div>
          {like && (
            <LikeButton
              listId={like.listId}
              initialCount={like.count}
              initialLiked={like.likedByViewer}
              signedIn={like.signedIn}
            />
          )}
        </div>
        <div className={styles.sortColumn}>
          <label htmlFor="list-sort" className={styles.sortLabel}>
            Sort by
          </label>
          <select id="list-sort" className={styles.sortSelect} value={sort} onChange={(e) => changeSort(e.target.value as SortMode)}>
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {items.length === 0 ? (
        <p className={styles.empty}>{totalCount === 0 ? "Nothing in this list yet." : "Nothing matches that filter."}</p>
      ) : (
        <div className={styles.grid}>
          {pageItems.map((item, i) => (
            <div className={`${styles.cell} media-thumb-cell`} key={item.itemId}>
              <MediaThumbCard
                href={item.href}
                cover={item.coverUrl ?? "/default-avatar.webp"}
                title={item.title}
                subtitle={item.publishedAt ? formatDate(item.publishedAt) : undefined}
              />
              {/* Outside the card: a button inside that anchor would be invalid
                  markup and clicking it would follow the link too. */}
              {isOwner && <RemoveListItemButton itemId={item.itemId} title={item.title} />}
              {isRanked && <div className={styles.rank}>{(page - 1) * PAGE_SIZE + i + 1}</div>}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} className={p === page ? styles.active : undefined} onClick={() => setPage(p)}>
              {p}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
