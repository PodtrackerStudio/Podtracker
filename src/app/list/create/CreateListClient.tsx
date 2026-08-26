"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { subtitleForSearchItem, type SearchItem, type SearchScope } from "@/lib/search";
import { useSearchResults } from "@/components/useSearchResults";
import { TrashIcon } from "@/components/icons";
import styles from "./createList.module.css";

/**
 * One row of the list being built. `externalId` is the show's iTunes id either
 * way — for an episode it's the show it belongs to, with `episodeKey` naming
 * which episode. That pair is exactly what `/api/lists` resolves.
 */
type AddedItem = { id: string; title: string; externalId: string; episodeKey?: string };

const SCOPES: { value: SearchScope; label: string }[] = [
  { value: "all", label: "All media" },
  { value: "shows", label: "Shows only" },
  { value: "episodes", label: "Episodes only" },
];

/**
 * The Create List form.
 *
 * Everything is collected here and submitted in one go, because this page is
 * the first step of making a list — you add as many titles as you want, then
 * press Create List. Adding to a list *afterwards* happens on the list itself,
 * through the same "Add podcasts…" bar Next listening uses.
 *
 * Shows and episodes are both addable: results are shows until the query
 * reaches past a show's name, and the scope control forces either kind.
 */
export function CreateListClient() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isRanked, setIsRanked] = useState(false);
  const [items, setItems] = useState<AddedItem[]>([]);

  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches: SearchItem[] = useSearchResults(query, 6, scope);

  function addItem(item: SearchItem) {
    const added: AddedItem =
      item.type === "episode"
        ? { id: item.id, title: item.title, externalId: item.showExternalId, episodeKey: item.episodeKey }
        : { id: item.id, title: item.title, externalId: item.id };

    setItems((prev) => (prev.some((i) => i.id === added.id) ? prev : [...prev, added]));
    setQuery("");
    setAdding(false);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleSubmit() {
    if (!title.trim() || items.length === 0 || saving) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          isRanked,
          // Order is the order they were added — that's what a ranked list
          // numbers and what "List order" sorts by on the list page.
          items: items.map((i) => ({ externalId: i.externalId, episodeKey: i.episodeKey })),
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.id) {
        // The API reports which item it couldn't resolve; naming it beats
        // making the user work out which one to take back out.
        const failed = typeof data?.failedIndex === "number" ? items[data.failedIndex] : undefined;
        setError(failed ? `${data.error} Remove “${failed.title}” and try again.` : (data?.error ?? "Could not create that list."));
        return;
      }

      router.push(`/list/${data.id}`);
      // The lists tab is server-rendered; without this the new list can be
      // missing from it until a hard reload.
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.layout}>
      <div>
        <div className={styles.field}>
          <label htmlFor="list-title">Title</label>
          <input id="list-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="list-description">Description</label>
          <textarea id="list-description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className={styles.checkboxRow}>
          <input id="list-ranked" type="checkbox" checked={isRanked} onChange={(e) => setIsRanked(e.target.checked)} />
          <label htmlFor="list-ranked">Ranked</label>
        </div>
      </div>

      <div>
        <div className={styles.addWrap}>
          {adding ? (
            <input
              autoFocus
              className={styles.addInput}
              placeholder="Search shows or episodes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => {
                blurTimeout.current = setTimeout(() => setAdding(false), 150);
              }}
            />
          ) : (
            <button className={styles.addButton} onClick={() => setAdding(true)}>
              Add title…
            </button>
          )}

          {adding && query.trim() && (
            <div className={styles.addDropdown}>
              {/* onMouseDown throughout: it fires before the input's onBlur, so
                  neither switching scope nor picking a result loses the click. */}
              <div className={styles.scopeRow} role="group" aria-label="Filter results">
                {SCOPES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    className={s.value === scope ? `${styles.scopeButton} ${styles.scopeActive}` : styles.scopeButton}
                    aria-pressed={s.value === scope}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (blurTimeout.current) clearTimeout(blurTimeout.current);
                      setScope(s.value);
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {matches.map((item) => (
                <button
                  key={item.id}
                  className={styles.addDropdownItem}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (blurTimeout.current) clearTimeout(blurTimeout.current);
                    addItem(item);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.addDropdownThumb} src={item.cover} alt="" />
                  <div>
                    <div>{item.title}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{subtitleForSearchItem(item)}</div>
                  </div>
                </button>
              ))}

              {matches.length === 0 && <p className={styles.addNoResults}>No results.</p>}
            </div>
          )}
        </div>

        <div className={styles.itemsList}>
          {items.length === 0 && <div className={styles.emptyState}>No titles added yet</div>}
          {items.map((item) => (
            <div className={styles.item} key={item.id}>
              {item.title}
              <button className={styles.itemRemove} onClick={() => removeItem(item.id)} aria-label={`Remove ${item.title}`}>
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.submitRow} style={{ gridColumn: "1 / -1" }}>
        <button className={styles.submitButton} onClick={handleSubmit} disabled={saving || !title.trim() || items.length === 0}>
          {saving ? "Creating…" : "Create List"}
        </button>
      </div>
      {error && (
        <p className={styles.error} style={{ gridColumn: "1 / -1" }}>
          {error}
        </p>
      )}
    </div>
  );
}
