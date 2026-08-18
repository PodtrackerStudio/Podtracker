"use client";

import { useEffect, useRef } from "react";
import styles from "./addPodcastsPopup.module.css";

/**
 * The "Add podcasts" picker. Sasha's design is a full-bleed panel: a heading
 * over a 4-across grid of show covers.
 *
 * The shows are **placeholders** — his words. They get replaced when the API
 * connection lands, at which point this grid becomes search results rather than
 * a fixed list.
 *
 * Picking a show does nothing yet: favouriting writes a row whose `podcastId`
 * is a foreign key to a `Podcast` record, and nothing creates those. Wiring the
 * click is part of the deferred write-layer batch, not something to bolt on
 * here — see docs/change-log.md.
 */
const SHOW_ARTWORK = [
  { title: "The Joe Rogan Experience", img: "/explore/joe-rogan.jpg" },
  { title: "The Shawn Ryan Show", img: "/explore/shawn-ryan.jpg" },
  { title: "Crime Junkie", img: "/explore/crime-junkie.jpg" },
  { title: "Good Hang with Amy Poehler", img: "/explore/good-hang-amy-poehler.jpg" },
  { title: "This Past Weekend w/ Theo Von", img: "/explore/theo-von.jpg" },
  { title: "The Daily", img: "/explore/the-daily.jpg" },
  { title: "The Diary of a CEO", img: "/explore/diary-of-a-ceo.jpg" },
  { title: "Matt & Shane's Secret Podcast", img: "/explore/matt-and-shane.jpg" },
  { title: "Up First from NPR", img: "/explore/ep-up-first-npr.jpg" },
  { title: "The Tim Dillon Show", img: "/explore/ep-tim-dillon.jpg" },
  { title: "Murdered: Carmen Van Huss", img: "/explore/ep-murdered-carmen.jpg" },
  { title: "The Rich Roll Podcast", img: "/explore/list-sleep-2.jpg" },
];

const PLACEHOLDER_COUNT = 48;

/**
 * 48 tiles cycled from the 12 cover images that exist in `public/`. Sasha asked
 * for "close to 50" and his own mock repeats covers, so duplicates are expected
 * placeholder behaviour — there simply aren't 50 real covers in the repo, and
 * inventing filenames would render broken images.
 *
 * This whole array disappears when the API lands; the grid becomes live search
 * results at that point.
 */
const PLACEHOLDER_SHOWS = Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => {
  const art = SHOW_ARTWORK[i % SHOW_ARTWORK.length];
  return { id: `placeholder-${i}`, title: art.title, img: art.img };
});

export function AddPodcastsPopup({ title = "Add podcasts", onClose }: { title?: string; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Esc closes, and the page behind must not scroll while this is open.
  // Sasha's frame shows no close control, so these are the only ways out —
  // without them the popup would be a trap.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button className={styles.close} onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.grid}>
          {PLACEHOLDER_SHOWS.map((show) => (
            <button className={styles.card} key={show.id} type="button" title={show.title}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={show.img} alt={show.title} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
