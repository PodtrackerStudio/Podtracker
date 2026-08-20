"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { subtitleForSearchItem, type SearchItem } from "@/lib/search";
import { useSearchResults } from "@/components/useSearchResults";
import styles from "./createList.module.css";

type AddedItem = { id: string; title: string };

export function CreateListClient() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isRanked, setIsRanked] = useState(false);
  const [items, setItems] = useState<AddedItem[]>([]);

  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
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

  function handleSubmit() {
    if (!title.trim() || items.length === 0) return;
    // No backend/database wired up yet — this is where a real POST to create
    // the List + ListItem rows would go once Postgres is connected.
    router.push("/list/joe-rogan-mma-show");
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
              placeholder="Search for an episode or podcast…"
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
              <button className={styles.itemRemove} onClick={() => removeItem(item.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.submitRow} style={{ gridColumn: "1 / -1" }}>
        <button className={styles.submitButton} onClick={handleSubmit} disabled={!title.trim() || items.length === 0}>
          Create List
        </button>
      </div>
    </div>
  );
}
