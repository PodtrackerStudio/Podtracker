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


export type PopupShow = { id: string; title: string; artworkUrl: string };

export function AddPodcastsPopup({
  title = "Add podcasts",
  shows,
  onClose,
}: {
  title?: string;
  /** Apple's podcast chart, fetched server-side. */
  shows: PopupShow[];
  onClose: () => void;
}) {
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
          {shows.map((show) => (
            <button className={styles.card} key={show.id} type="button" title={show.title}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={show.artworkUrl} alt={show.title} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
