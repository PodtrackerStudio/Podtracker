"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDownIcon } from "@/components/icons";
import styles from "./following.module.css";

export type FollowedShow = {
  /** iTunes id — the route segment. */
  externalId: string;
  title: string;
  author: string;
  coverUrl: string | null;
};

/** How many shows sit above the "See More" fold. */
const INITIAL_COUNT = 8;

/**
 * The shows the signed-in user follows.
 *
 * **This was twelve hardcoded shows.** They rendered for anybody with at least
 * one favourite and had nothing to do with what that person actually followed,
 * which is why following a show never made it appear here. The rows come from
 * `PodcastFollow` now and the component only lays them out.
 */
export function FollowingGrid({ shows }: { shows: FollowedShow[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? shows : shows.slice(0, INITIAL_COUNT);

  return (
    <>
      <div className={styles.grid}>
        {visible.map((show) => (
          <Link className={styles.card} href={`/podcast/${show.externalId}`} key={show.externalId}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.cover} src={show.coverUrl ?? "/default-avatar.webp"} alt={show.title} />
            <div className={styles.title}>{show.title}</div>
            <div className={styles.hosts}>Hosted by {show.author}</div>
          </Link>
        ))}
      </div>

      {!expanded && shows.length > INITIAL_COUNT && (
        <div className={styles.seeMoreRow}>
          <button className={styles.seeMoreBtn} onClick={() => setExpanded(true)}>
            See More
            <ChevronDownIcon />
          </button>
        </div>
      )}
    </>
  );
}
