"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PlusIcon } from "./icons";
import styles from "./addToList.module.css";

type PickerList = {
  id: string;
  title: string;
  itemCount: number;
  covers: string[];
};

/** Same on every row — these are the viewer's own lists. */
type PickerOwner = { name: string; avatarUrl: string | null };

/**
 * "Add to list" — opens a dropdown of the user's own lists and adds to the one
 * picked. It had never worked: it was a `<button>` with no `onClick`.
 *
 * **A dropdown, not a page.** Sasha's call — picking a list is a one-click
 * thing and navigating away from the episode you're looking at to do it is
 * wrong. Each row is the list row from his Figma: avatar, title, author, and a
 * stack of the first few covers.
 *
 * Next listening keeps its own separate button, because that one is a direct
 * toggle with no choice to make.
 */
export function AddToListButton({
  className,
  externalId,
  episodeKey,
}: {
  className: string;
  externalId: string;
  /** Present on episode pages; absent adds the show itself. */
  episodeKey?: string;
}) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<PickerList[] | null>(null);
  const [owner, setOwner] = useState<PickerOwner | null>(null);
  const [loggedIn, setLoggedIn] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);

  // Fetched on first open, not on mount: most visitors never press this, and
  // the lists must be current when they do rather than as of page load.
  useEffect(() => {
    if (!open || lists !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/lists");
        const data = await res.json();
        if (cancelled) return;
        setLoggedIn(data.loggedIn !== false);
        setOwner(data.owner ?? null);
        setLists(data.lists ?? []);
      } catch {
        if (!cancelled) setLists([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, lists]);

  // Click-away and Escape close it, same as the search and add-podcasts menus.
  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  async function addTo(list: PickerList) {
    if (busyId) return;
    setBusyId(list.id);
    setMessage(null);
    try {
      const res = await fetch("/api/lists/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: list.id, externalId, episodeKey }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMessage(data?.error ?? "Could not add that.");
        return;
      }
      setMessage(data?.alreadyThere ? `Already in ${list.title}.` : `Added to ${list.title}.`);
      setOpen(false);
      // The row's cover stack and count are now stale, so the next open
      // refetches rather than showing what the list looked like before.
      setLists(null);
    } catch {
      setMessage("Could not reach the server.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button className={className} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
        <PlusIcon />
        Add to list
      </button>

      {open && (
        <div className={styles.dropdown} role="menu">
          {lists === null && <p className={styles.notice}>Loading…</p>}

          {lists !== null && !loggedIn && (
            <p className={styles.notice}>
              <Link href="/login" className={styles.noticeLink}>
                Log in
              </Link>{" "}
              to add this to a list.
            </p>
          )}

          {lists !== null && loggedIn && lists.length === 0 && (
            <p className={styles.notice}>
              No lists yet.{" "}
              <Link href="/list/create" className={styles.noticeLink}>
                Create one
              </Link>
              .
            </p>
          )}

          {lists?.map((list) => (
            <button
              key={list.id}
              className={styles.row}
              onClick={() => addTo(list)}
              disabled={busyId !== null}
              role="menuitem"
            >
              <span className={styles.rowLeft}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.avatar} src={owner?.avatarUrl ?? "/default-avatar.webp"} alt="" />
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{list.title}</span>
                  <span className={styles.rowAuthor}>{owner?.name}</span>
                </span>
              </span>

              <span className={styles.gallery}>
                {list.covers.map((cover, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.galleryImg} src={cover} alt="" key={`${cover}-${i}`} />
                ))}
                {list.itemCount > list.covers.length && (
                  <span className={styles.galleryMore}>+{list.itemCount - list.covers.length}</span>
                )}
              </span>
            </button>
          ))}

          {lists !== null && loggedIn && lists.length > 0 && (
            <Link href="/list/create" className={styles.createRow}>
              <PlusIcon />
              Create a new list
            </Link>
          )}
        </div>
      )}

      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
}
