"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./person.module.css";

type Appearance = {
  id: string;
  title: string;
  img: string;
  href: string;
  popularity: number;
  order: number;
};

export function AppearancesGrid({ appearances }: { appearances: Appearance[] }) {
  const [sort, setSort] = useState<"newest" | "popularity">("newest");

  const sorted =
    sort === "newest"
      ? [...appearances].sort((a, b) => a.order - b.order)
      : [...appearances].sort((a, b) => b.popularity - a.popularity);

  return (
    <>
      <div className={styles.appearancesHeader}>
        <h2 className={styles.appearancesTitle}>Appearances as a guest</h2>
        <div className={styles.sortLinks}>
          <button className={sort === "newest" ? "active" : undefined} onClick={() => setSort("newest")}>
            Sort by Newest first
          </button>
          <button className={sort === "popularity" ? "active" : undefined} onClick={() => setSort("popularity")}>
            Popularity
          </button>
        </div>
      </div>
      <div className={styles.appearancesGrid}>
        {sorted.map((a) => (
          <Link className={styles.appearanceCard} href={a.href} key={a.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.appearanceCover} src={a.img} alt={a.title} />
            <div className={styles.appearanceTitle}>{a.title}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
