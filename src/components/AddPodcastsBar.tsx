"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./addPodcastsBar.module.css";

/** Mirrors SearchItem from lib/search.ts — what /api/search returns. */
type SearchResult = {
  type: "podcast";
  /** iTunes id — what /api/next-listening expects as externalId. */
  id: string;
  title: string;
  artistName: string;
  cover: string;
  episodeCount: number;
};

/**
 * The "Add podcasts…" bar on the profile's Next listening panel.
 *
 * Behaves like the nav search — type, see live iTunes results — but picking one
 * adds it to Next listening instead of navigating.
 *
 * Search is debounced and every in-flight request is superseded: typing fast
 * used to let a slow early response overwrite a fast later one, so results
 * would flicker back to a stale query.
 */
export function AddPodcastsBar() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  // Bumped per keystroke; a response is discarded unless it's still the latest.
  const requestSeq = useRef(0);

  useEffect(() => {
    const q = value.trim();
    const seq = ++requestSeq.current;

    // Everything — including clearing on an empty query — happens inside the
    // timer. Calling setState synchronously in an effect body triggers
    // cascading renders and the linter rejects it.
    const timer = setTimeout(async () => {
      if (!q) {
        setResults([]);
        setOpen(false);
        return;
      }
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=6`);
        if (!res.ok) return;
        const data = await res.json();
        if (seq !== requestSeq.current) return; // superseded
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        // Leave the previous results up rather than blanking the dropdown.
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [value]);

  // Click-away and Escape close the dropdown.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function add(item: SearchResult) {
    if (busyId) return;
    setBusyId(item.id);
    setMessage(null);
    try {
      const res = await fetch("/api/next-listening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalId: item.id }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMessage(data?.error ?? "Could not add that.");
        return;
      }
      setMessage(data?.alreadyThere ? `${item.title} is already in Next listening.` : `Added ${item.title}.`);
      setValue("");
      setResults([]);
      setOpen(false);
      // Server-rendered panel — refresh so the new tile comes from the database
      // rather than being optimistically faked into place.
      router.refresh();
    } catch {
      setMessage("Could not reach the server.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <input
        className={styles.input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Add podcasts..."
        aria-label="Add podcasts to Next listening"
      />

      {open && results.length > 0 && (
        <div className={styles.dropdown} role="listbox">
          {results.map((item) => (
            <button
              className={styles.result}
              key={item.id}
              onClick={() => add(item)}
              disabled={busyId !== null}
              role="option"
              aria-selected={false}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.resultCover} src={item.cover || "/default-avatar.webp"} alt="" />
              <span className={styles.resultText}>
                <span className={styles.resultTitle}>{item.title}</span>
                {/* Episode count where Apple gives one, else the author —
                    "0 episodes" reads worse than a name. Mirrors
                    subtitleForSearchItem. */}
                <span className={styles.resultSubtitle}>
                  {item.episodeCount > 0 ? `${item.episodeCount.toLocaleString("en-US")} episodes` : item.artistName}
                </span>
              </span>
              <span className={styles.resultAdd}>{busyId === item.id ? "…" : "+"}</span>
            </button>
          ))}
        </div>
      )}

      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
}
