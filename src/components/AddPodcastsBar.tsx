"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { subtitleForSearchItem, type SearchItem, type SearchScope } from "@/lib/search";
import styles from "./addPodcastsBar.module.css";

/** The Shows only / Episodes only control, in the wording the site already uses. */
const SCOPES: { value: SearchScope; label: string }[] = [
  { value: "all", label: "All media" },
  { value: "shows", label: "Shows only" },
  { value: "episodes", label: "Episodes only" },
];

/**
 * The "Add podcasts…" bar, on the Next listening page and on every list page
 * the viewer owns.
 *
 * Behaves like the nav search — type, see live iTunes results — but picking one
 * adds it to the collection instead of navigating. The collection is whatever
 * `endpoint` points at; `extraBody` carries anything that endpoint needs beyond
 * the id, which for a list is its `listId`.
 *
 * **Episodes and shows both.** Results are shows until the query reaches past a
 * show's name ("joe rogan" gives the show, "joe rogan bill burr" gives the
 * episodes), and the scope control forces either kind. An episode is added by
 * its show's id plus its hashed feed guid, which is what `ensureEpisode`
 * resolves against.
 *
 * Search is debounced and every in-flight request is superseded: typing fast
 * used to let a slow early response overwrite a fast later one, so results
 * would flicker back to a stale query.
 */
export function AddPodcastsBar({
  endpoint = "/api/next-listening",
  extraBody,
  collectionName = "Next listening",
  onSelect,
  placeholder = "Add podcasts...",
}: {
  endpoint?: string;
  extraBody?: Record<string, string>;
  /** Named in the confirmation messages and the input's accessible label. */
  collectionName?: string;
  /**
   * Given, picking a result hands the item back instead of posting it — how
   * "+ Log podcast" reuses this bar to choose what to log. `endpoint`,
   * `extraBody` and `collectionName` are then unused.
   */
  onSelect?: (item: SearchItem) => void;
  placeholder?: string;
} = {}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [scope, setScope] = useState<SearchScope>("all");
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
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
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=6&scope=${scope}`);
        if (!res.ok) return;
        const data = await res.json();
        if (seq !== requestSeq.current) return; // superseded
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        // Leave the previous results up rather than blanking the dropdown.
      } finally {
        if (seq === requestSeq.current) setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
    // `scope` is a dependency on purpose: changing it re-runs the search, which
    // is the whole point of the control.
  }, [value, scope]);

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

  async function add(item: SearchItem) {
    if (busyId) return;

    // Pick mode: the caller decides what happens next, so nothing is written
    // here and there is no confirmation to show.
    if (onSelect) {
      setValue("");
      setResults([]);
      setOpen(false);
      onSelect(item);
      return;
    }

    setBusyId(item.id);
    setMessage(null);
    try {
      // An episode is identified by its show plus its hashed feed guid; a show
      // by its iTunes id alone. Both add endpoints take that same pair.
      const target =
        item.type === "episode"
          ? { externalId: item.showExternalId, episodeKey: item.episodeKey }
          : { externalId: item.id };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...target, ...extraBody }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMessage(data?.error ?? "Could not add that.");
        return;
      }
      setMessage(data?.alreadyThere ? `${item.title} is already in ${collectionName}.` : `Added ${item.title}.`);
      setValue("");
      setResults([]);
      setOpen(false);
      // Server-rendered page — refresh so the new tile comes from the database
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
        onFocus={() => value.trim() && setOpen(true)}
        placeholder={placeholder}
        aria-label={onSelect ? placeholder : `Add podcasts to ${collectionName}`}
      />

      {/* Stays open with no results too, so the scope control is still
          reachable when a filter is what emptied the list. */}
      {open && value.trim() && (
        <div className={styles.dropdown}>
          <div className={styles.scopeRow} role="group" aria-label="Filter results">
            {SCOPES.map((s) => (
              <button
                key={s.value}
                type="button"
                className={s.value === scope ? `${styles.scopeButton} ${styles.scopeActive}` : styles.scopeButton}
                onClick={() => setScope(s.value)}
                aria-pressed={s.value === scope}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div role="listbox">
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
                  {/* Episode count or author for a show; show name and date for
                      an episode. Shared with the nav search so the two never
                      describe the same result differently. */}
                  <span className={styles.resultSubtitle}>{subtitleForSearchItem(item)}</span>
                </span>
                <span className={styles.resultAdd}>{busyId === item.id ? "…" : "+"}</span>
              </button>
            ))}

            {results.length === 0 && <p className={styles.noResults}>{searching ? "Searching…" : "No results."}</p>}
          </div>
        </div>
      )}

      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
}
