"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDownIcon } from "@/components/icons";
import styles from "./following.module.css";

const initialShows = [
  { id: "jre", title: "The Joe Rogan Experience", hosts: ["Joe Rogan"], img: "/explore/joe-rogan.jpg" },
  { id: "matt-shane", title: "Matt and Shane's Secret Podcast", hosts: ["Shane Gillis", "Matt Mccusker"], img: "/explore/matt-and-shane.jpg" },
  { id: "tpw", title: "This Past Weekend with Theo Von", hosts: ["Theo Von"], img: "/explore/theo-von.jpg" },
  { id: "rewatchables", title: "The Rewatchables", hosts: ["Bill Simmons", "Sean Fennessey", "Chris Ryan"], img: "https://picsum.photos/seed/rewatchables/300/300" },
  { id: "modern-wisdom", title: "Modern Wisdom", hosts: ["Chris Williamson"], img: "https://picsum.photos/seed/mwcover/300/300" },
  { id: "bombcast", title: "Giant BombCast", hosts: ["Jan Ochoa", "Jeff Grubb", "Jeff Bakalar"], img: "https://picsum.photos/seed/bombcast/300/300" },
  { id: "the-op", title: "The Official Podcast", hosts: ["Jackson Clarke", "Kaya Orsan", "Andrew Wagenheim"], img: "https://picsum.photos/seed/theop/300/300" },
  { id: "the-game", title: "The Game", hosts: ["Alex Hormozi"], img: "https://picsum.photos/seed/thegame/300/300" },
];

const moreShows = [
  { id: "doac", title: "The Diary of a CEO", hosts: ["Steven Bartlett"], img: "/explore/diary-of-a-ceo.jpg" },
  { id: "huberman", title: "Huberman Lab", hosts: ["Andrew Huberman"], img: "https://picsum.photos/seed/simhuberman/300/300" },
  { id: "crime-junkie", title: "Crime Junkie", hosts: ["Ashley Flowers"], img: "/explore/crime-junkie.jpg" },
  { id: "the-daily", title: "The Daily", hosts: ["Michael Barbaro"], img: "/explore/the-daily.jpg" },
];

// A followed podcast that maps to our one built demo page; everything else
// falls back to that same podcast page until the real Podcast Index data is wired up.
function hrefFor(id: string) {
  return id === "modern-wisdom" ? "/podcast/modern-wisdom" : `/podcast/${id}`;
}

export function FollowingGrid() {
  const [expanded, setExpanded] = useState(false);
  const shows = expanded ? [...initialShows, ...moreShows] : initialShows;

  return (
    <>
      <div className={styles.grid}>
        {shows.map((show) => (
          <Link className={styles.card} href={hrefFor(show.id)} key={show.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.cover} src={show.img} alt={show.title} />
            <div className={styles.title}>{show.title}</div>
            <div className={styles.hosts}>
              {show.hosts.length > 1 ? "Hosts: " : "Hosted by "}
              {show.hosts.map((h, i) => (
                <span key={h}>
                  {i > 0 && <br />}
                  {h}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      {!expanded && (
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
