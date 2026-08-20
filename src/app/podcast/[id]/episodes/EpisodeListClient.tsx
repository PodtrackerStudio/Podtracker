"use client";

import { useState } from "react";
import Link from "next/link";
import type { EpisodeListEntry } from "@/lib/episodeDetail";
import styles from "../episodeListing.module.css";

const PAGE_SIZE = 20;

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
 */
export function EpisodeListClient({
  podcastId,
  podcastTitle,
  episodes,
}: {
  podcastId: string;
  podcastTitle: string;
  episodes: EpisodeListEntry[];
}) {
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [shown, setShown] = useState(PAGE_SIZE);

  // The feed is newest-first, so "oldest" is simply the reverse.
  const ordered = sort === "newest" ? episodes : [...episodes].reverse();
  const displayed = ordered.slice(0, shown);
  const hasMore = shown < ordered.length;

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
          <button className={sort === "newest" ? "active" : undefined} onClick={() => setSort("newest")}>
            Newest
          </button>
          <button className={sort === "oldest" ? "active" : undefined} onClick={() => setSort("oldest")}>
            Oldest
          </button>
        </div>
      </div>

      {episodes.length === 0 ? (
        <p className={styles.subtitle}>No episodes found for this show.</p>
      ) : (
        <div>
          {displayed.map((ep) => (
            <Link className={styles.episodeRow} href={`/podcast/${podcastId}/episode/${ep.id}`} key={ep.id}>
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

      {hasMore && (
        <div className={styles.loadMoreRow}>
          <hr />
          <button className={styles.loadMoreBtn} onClick={() => setShown((n) => n + PAGE_SIZE)}>
            Load more
          </button>
          <hr />
        </div>
      )}
    </main>
  );
}
