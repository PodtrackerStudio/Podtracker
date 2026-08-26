"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "./icons";
import styles from "./addPodcastsPopup.module.css";

/**
 * The "Add podcasts" picker. Sasha's design is a full-bleed panel: a heading
 * over a 4-across grid of show covers.
 *
 * **Picking a show now works.** It used to be a grid of buttons with no
 * `onClick` — favouriting wrote a row whose `podcastId` was a foreign key to a
 * `Podcast` record and nothing created those. `ensurePodcast` on the endpoint
 * solved that, so a card posts to `/api/favorites`, which favourites **and
 * follows** the show so it lands on `/following`.
 *
 * The panel stays open after a pick, because the point of a 48-cover grid is
 * choosing several. Added covers get a tick and can't be clicked again.
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
  const [added, setAdded] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function add(show: PopupShow) {
    if (busyId || added.includes(show.id)) return;
    setBusyId(show.id);
    setError(null);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalId: show.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Could not add that.");
        return;
      }
      setAdded((prev) => [...prev, show.id]);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusyId(null);
    }
  }

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

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.grid}>
          {shows.map((show) => {
            const isAdded = added.includes(show.id);
            return (
              <button
                className={styles.card}
                key={show.id}
                type="button"
                title={show.title}
                onClick={() => add(show)}
                disabled={isAdded || busyId !== null}
                aria-pressed={isAdded}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={show.artworkUrl} alt={show.title} />
                {isAdded && (
                  <span className={styles.addedBadge} aria-hidden="true">
                    <CheckIcon size={22} />
                  </span>
                )}
                {busyId === show.id && <span className={styles.addingBadge}>Adding…</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
