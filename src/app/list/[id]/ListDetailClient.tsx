"use client";

import { useState, useMemo } from "react";
import { MediaThumbCard } from "@/components/MediaThumbCard";
import { tierFromScore } from "@/lib/ratingTier";
import { HAS_COMMUNITY_DATA } from "@/lib/community";
import styles from "./list.module.css";

export type ListEpisode = {
  id: string;
  title: string;
  cover: string;
  href: string;
  episodeNumber: number;
  publishedAt: string; // ISO date, used for release-date sorting
  avgRating: number;
  listPosition: number; // the curator's original order
};

type SortMode = "listOrder" | "earliestFirst" | "newestFirst" | "rating";

const PAGE_SIZE = 100;

const SORT_LABELS: Record<SortMode, string> = {
  listOrder: "List order",
  earliestFirst: "Earliest first",
  newestFirst: "Newest first",
  rating: "Average rating",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ListDetailClient({
  episodes,
  isRanked,
  description,
}: {
  episodes: ListEpisode[];
  isRanked: boolean;
  description: string;
}) {
  const [sort, setSort] = useState<SortMode>("listOrder");
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const copy = [...episodes];
    switch (sort) {
      case "earliestFirst":
        return copy.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
      case "newestFirst":
        return copy.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
      case "rating":
        return copy.sort((a, b) => b.avgRating - a.avgRating);
      default:
        return copy.sort((a, b) => a.listPosition - b.listPosition);
    }
  }, [episodes, sort]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function changeSort(mode: SortMode) {
    setSort(mode);
    setPage(1);
  }

  return (
    <>
      <div className={styles.metaRow}>
        <div className={styles.episodeCount}>{episodes.length} episodes</div>
        <div className={styles.description}>{description}</div>
        <div className={styles.sortColumn}>
          <label htmlFor="list-sort" className={styles.sortLabel}>
            Sort by
          </label>
          <select id="list-sort" className={styles.sortSelect} value={sort} onChange={(e) => changeSort(e.target.value as SortMode)}>
            {Object.entries(SORT_LABELS)
              // Sorting by average rating is meaningless with no ratings, so the
              // option is hidden until there are some.
              .filter(([value]) => value !== "rating" || HAS_COMMUNITY_DATA)
              .map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className={styles.grid}>
        {pageItems.map((ep, i) => (
          <div className={styles.cell} key={ep.id}>
            <MediaThumbCard
              href={ep.href}
              cover={ep.cover}
              title={ep.title}
              subtitle={formatDate(ep.publishedAt)}
              rating={{ score: ep.avgRating, ...tierFromScore(ep.avgRating) }}
            />
            {isRanked && <div className={styles.rank}>{(page - 1) * PAGE_SIZE + i + 1}</div>}
          </div>
        ))}
      </div>

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
