"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../episodeListing.module.css";

const baseEpisodes = [
  { title: "Why Everyone Is Drowning In Debt (and how to get out) – Caleb Hammer – #1123", date: "July 13, 2026" },
  { title: "Why The AI Doomers Might Be Right – Robert Wright – #1122", date: "July 11, 2026" },
  { title: "Why You Feel Overwhelmed All The Time (and how to fix it) – David Epstein – #1121", date: "July 9, 2026" },
  { title: "The Uncomfortable Science Of Sex Differences – Steve Stewart-Williams – #1120", date: "July 6, 2026" },
  { title: "“My Autism Keeps Upsetting People” – Vittorio Angelone – #1119", date: "July 4, 2026" },
  { title: "Black Holes, Denny’s Fist Fights & Japanese Handjob Culture – Rabbit Hole #4 – #1118", date: "July 2, 2026" },
];

const topics = [
  "Why Nobody Talks About", "The Truth About", "How To Actually Fix", "The Hidden Cost Of",
  "What Nobody Tells You About", "The Science Behind", "Why Everyone Is Wrong About",
  "The Uncomfortable Reality Of", "How To Finally Understand", "The Surprising Link Between",
];
const subjects = [
  "Burnout", "Modern Dating", "Discipline", "Social Media Addiction", "Confidence",
  "Procrastination", "Loneliness", "Success", "Willpower", "Habits", "Ambition",
  "Attention Spans", "Self-Sabotage", "Motivation",
];
const guests = [
  "Andrew Huberman", "Cal Newport", "Jordan Peterson", "Esther Perel", "Mel Robbins",
  "Naval Ravikant", "Brené Brown", "Simon Sinek", "Adam Grant", "Lex Fridman",
];

function randomEpisode(counter: number, dateCursor: Date) {
  const title = `${topics[Math.floor(Math.random() * topics.length)]} ${subjects[Math.floor(Math.random() * subjects.length)]} – ${guests[Math.floor(Math.random() * guests.length)]} – #${counter}`;
  dateCursor.setDate(dateCursor.getDate() - 2);
  const date = dateCursor.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return { title, date };
}

export function EpisodeListClient({ podcastId, podcastTitle }: { podcastId: string; podcastTitle: string }) {
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [episodes, setEpisodes] = useState(baseEpisodes);
  const [counter, setCounter] = useState(1117);
  const [dateCursor] = useState(() => new Date("2026-07-02"));

  const displayed = sort === "newest" ? episodes : [...episodes].reverse();

  function loadMore() {
    const added: ReturnType<typeof randomEpisode>[] = [];
    let c = counter;
    for (let i = 0; i < 6; i++) {
      added.push(randomEpisode(c, dateCursor));
      c--;
    }
    setCounter(c);
    setEpisodes((prev) => [...prev, ...added]);
  }

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

      <div>
        {displayed.map((ep, i) => (
          <Link className={styles.episodeRow} href={`/podcast/${podcastId}/episode/1109`} key={`${ep.title}-${i}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.episodeThumb} src={`https://picsum.photos/seed/mwep${i}/120/120`} alt="Episode thumbnail" />
            <div className={styles.episodeText}>
              <div className={styles.episodeLink}>{ep.title}</div>
              <div className={styles.episodeDate}>{ep.date}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className={styles.loadMoreRow}>
        <hr />
        <button className={styles.loadMoreBtn} onClick={loadMore}>
          Load more
        </button>
        <hr />
      </div>
    </main>
  );
}
