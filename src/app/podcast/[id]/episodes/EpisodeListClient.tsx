"use client";

import { useState } from "react";
import Link from "next/link";
import type { EpisodeListEntry, EpisodeSort } from "@/lib/episodeDetail";
import { EPISODE_PAGE_SIZE as PAGE_SIZE } from "@/lib/episodePaging";
import styles from "../episodeListing.module.css";


/**
 * The full episode list, from the show's RSS feed.
 *
 * This previously **generated fake episodes**: six hardcoded Modern Wisdom
 * titles, then "Load more" stitched new ones out of random word lists with
 * invented episode numbers and a rolling date, on every podcast. Every row also
 * linked to the same hardcoded episode.
 *
 * "Load more" now reveals more of the real feed rather than inventing anything,
 * so it stops when the show's episodes run out.
 *
 * **Fetched a page at a time (2026-11-06).** The whole feed used to arrive with
 * the page, 928 KB for Joe Rogan's 2,700 episodes, to show 20 of them. Now
 * the server renders the newest 20, and "Load more" and Oldest ask
 * `/api/podcast/[id]/episodes` for the next slice.
 */
export function EpisodeListClient({
  podcastId,
  podcastTitle,
  initialEpisodes,
  total,
}: {
  podcastId: string;
  podcastTitle: string;
  initialEpisodes: EpisodeListEntry[];
  total: number;
}) {
  const [sort, setSort] = useState<EpisodeSort>("newest");
  const [episodes, setEpisodes] = useState(initialEpisodes);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function fetchPage(nextSort: EpisodeSort, offset: number): Promise<EpisodeListEntry[] | null> {
    const res = await fetch(
      `/api/podcast/${encodeURIComponent(podcastId)}/episodes?sort=${nextSort}&offset=${offset}&limit=${PAGE_SIZE}`,
    ).catch(() => null);
    if (!res?.ok) return null;
    const data = (await res.json().catch(() => null)) as { episodes?: EpisodeListEntry[] } | null;
    return data?.episodes ?? null;
  }

  async function loadMore() {
    if (loading) return;
    setLoading(true);
    setFailed(false);
    const more = await fetchPage(sort, episodes.length);
    setLoading(false);
    if (!more) return setFailed(true);
    setEpisodes((current) => [...current, ...more]);
  }

  async function changeSort(nextSort: EpisodeSort) {
    if (nextSort === sort || loading) return;
    setLoading(true);
    setFailed(false);
    const first = await fetchPage(nextSort, 0);
    setLoading(false);
    if (!first) return setFailed(true);
    setSort(nextSort);
    setEpisodes(first);
  }

  const hasMore = episodes.length < total;

  return (
    <main className={styles.main}>
      <div className={styles.listHeader}>
        <div>
          <h1>
            <Link href={`/podcast/${podcastId}`}>{podcastTitle}</Link>
          </h1>
          <div className={styles.subtitle}>Full episode list</div>
        </div>
        <div className={styles.sortLinks}>
          <button className={sort === "newest" ? "active" : undefined} onClick={() => changeSort("newest")}>
            Newest
          </button>
          <button className={sort === "oldest" ? "active" : undefined} onClick={() => changeSort("oldest")}>
            Oldest
          </button>
        </div>
      </div>

      {episodes.length === 0 ? (
        <p className={styles.subtitle}>No episodes found for this show.</p>
      ) : (
        <div>
          {episodes.map((ep, i) => (
            // Index in the key as well: two feed items with the same empty guid
            // hash to the same id (a known, separate issue), and pages are
            // appended, so the id alone could repeat.
            <Link className={styles.episodeRow} href={`/podcast/${podcastId}/episode/${ep.id}`} key={`${ep.id}:${i}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.episodeThumb} src={ep.img} alt="" />
              <div className={styles.episodeText}>
                <div className={styles.episodeLink}>{ep.title}</div>
                <div className={styles.episodeDate}>{ep.date}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {failed && <p className={styles.subtitle}>Couldn&apos;t load more episodes just now. Try again.</p>}

      {hasMore && (
        <div className={styles.loadMoreRow}>
          <hr />
          <button className={styles.loadMoreBtn} onClick={loadMore} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </button>
          <hr />
        </div>
      )}
    </main>
  );
}
