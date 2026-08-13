"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../episodeListing.module.css";

const baseEpisodes = [
  { title: "This is how to master your life – David Goggins – #577", date: "Jan 16, 2023" },
  { title: "24 controversial truths about success & failure – Alex Hormozi – #830", date: "Aug 26, 2024" },
  { title: "This is the price of greatness – Chris Bumstead – #652", date: "Jul 10, 2023" },
  { title: "How to build unshakable self discipline – Jocko Willink – #701", date: "Feb 2, 2024" },
  { title: "The brutal truth about motivation – David Goggins – #490", date: "Nov 3, 2022" },
  { title: "Why comfort is killing your potential – Jordan Peterson – #612", date: "May 19, 2023" },
  { title: "This mindset shift changes everything – Alex Hormozi – #745", date: "Sep 14, 2023" },
];

const topics = [
  "The real secret to", "How to finally master", "The brutal truth about", "Why nobody talks about",
  "The uncomfortable science of", "How elite performers think about", "The mindset shift behind",
  "What separates winners from everyone else about", "The hidden discipline behind", "Rebuilding your life around",
];
const subjects = [
  "consistency", "mental toughness", "resilience", "long-term thinking", "self mastery",
  "focus", "grit", "ambition", "self-belief", "hard work", "identity", "sacrifice", "purpose",
];
const guests = [
  "David Goggins", "Alex Hormozi", "Jocko Willink", "Jordan Peterson", "Andrew Huberman",
  "Chris Bumstead", "Cameron Hanes", "Lex Fridman", "Mel Robbins", "Naval Ravikant",
];

function randomEpisode(counter: number, dateCursor: Date) {
  const title = `${topics[Math.floor(Math.random() * topics.length)]} ${subjects[Math.floor(Math.random() * subjects.length)]} – ${guests[Math.floor(Math.random() * guests.length)]} – #${counter}`;
  dateCursor.setDate(dateCursor.getDate() - 12);
  const date = dateCursor.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return { title, date };
}

export function TopRatedClient({ podcastId, podcastTitle }: { podcastId: string; podcastTitle: string }) {
  const [episodes, setEpisodes] = useState(baseEpisodes);
  const [counter, setCounter] = useState(476);
  const [dateCursor] = useState(() => new Date("2022-10-01"));

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
      <div className={styles.listHeaderSimple}>
        <h1>
          <Link href={`/podcast/${podcastId}`}>{podcastTitle}</Link>
        </h1>
        <div className={styles.subtitle}>Top rated episodes</div>
      </div>

      <div>
        {episodes.map((ep, i) => (
          <Link className={styles.episodeRow} href={`/podcast/${podcastId}/episode/1109`} key={`${ep.title}-${i}`}>
            <div className={styles.episodeRank}>{i + 1}.</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.episodeThumb} src={`https://picsum.photos/seed/mwtop${i}/120/120`} alt="Episode thumbnail" />
            <div className={styles.episodeText}>
              <div className={styles.episodeTitleLine}>{ep.title}</div>
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
