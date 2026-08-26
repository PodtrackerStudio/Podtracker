"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { subtitleForSearchItem, type SearchItem } from "@/lib/search";
import { useSearchResults } from "@/components/useSearchResults";
import { TrashIcon } from "@/components/icons";
import styles from "./createList.module.css";

type AddedItem = { id: string; title: string };

/**
 * The Create List form.
 *
 * Everything is collected here and submitted in one go, because this page is
 * the first step of making a list — you add as many titles as you want, then
 * press Create List. Adding to a list *afterwards* happens on the list itself,
 * through the same "Add podcasts…" bar Next listening uses.
 *
 * `/api/search` returns shows, so shows are what can be added here. Episodes
 * reach a list through the episode page, not this form.
 */
export function CreateListClient() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isRanked, setIsRanked] = useState(false);
  const [items, setItems] = useState<AddedItem[]>([]);

  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches: SearchItem[] = useSearchResults(query);

  function addItem(item: SearchItem) {
    setItems((prev) => (prev.some((i) => i.id === item.id) ? prev : [...prev, { id: item.id, title: item.title }]));
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
          items: items.map((i) => ({ externalId: i.id })),
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.id) {
        setError(data?.error ?? "Could not create that list.");
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
              placeholder="Search for a podcast…"
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

          {adding && matches.length > 0 && (
            <div className={styles.addDropdown}>
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
