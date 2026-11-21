"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { BellIcon } from "./icons";
import { usernameToPath } from "@/lib/routeParams";
import styles from "./notificationBell.module.css";

type Item = {
  id: string;
  type: "FOLLOW" | "FRIEND";
  unread: boolean;
  createdAt: string;
  actor: { username: string; displayName: string; avatar: string };
};

/**
 * The bell in the nav, and the small popup it opens.
 *
 * Sasha's Frame 21 draws the bell and its red count. He asked for the list to
 * be a popup rather than a page (2026-11-14): "I dont think theres a point
 * design a whole new page for the bell, rather create a generic popup… Just a
 * simple white popup." There was a `/notifications` page; it is gone.
 *
 * **The count comes from the server, the list does not.** The badge is read
 * with the rest of the nav on every page, because it has to be visible without
 * clicking. The list is fetched when the popup opens, because nobody needs
 * twenty notifications attached to every render of every page.
 *
 * Opening clears the badge. That is what a bell does, and it is why
 * `unread` on each row is captured before the marking happens — so the popup
 * you just opened still shows you which ones were new.
 */
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<Item[] | null>(null);
  const [failed, setFailed] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // The server's count wins whenever the nav re-renders — otherwise the badge
  // would stay stale after navigating to a page where it has changed. Adjusted
  // during render (React's own pattern for "reset state when a prop changes")
  // rather than in an effect, which rendered the stale count once first.
  const [seenInitial, setSeenInitial] = useState(initialUnread);
  if (seenInitial !== initialUnread) {
    setSeenInitial(initialUnread);
    setUnread(initialUnread);
  }

  // Click away and Escape both close it, like every other dismissible thing on
  // the site.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;

    // The badge clears as soon as it is opened. The POST below does the same
    // server-side; doing it here too means the number does not sit there
    // looking unread while the list loads.
    setUnread(0);
    setFailed(false);
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json().catch(() => null);
      // `error` means the server could not read them — most likely the
      // notifications migration has not been applied to that database. Saying
      // "no new notifications" in that case is a lie that looks exactly like
      // the truth, which is how a completely broken feature once passed for a
      // working one. Admit it instead.
      if (!data || data.error || !Array.isArray(data.notifications)) {
        setFailed(true);
        return;
      }
      setItems(data.notifications);
      // Now that the list says which were unread, mark them read. Fire and
      // forget: the badge is already cleared above.
      void fetch("/api/notifications", { method: "POST" }).catch(() => {});
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        className={styles.bell}
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      >
        <BellIcon size={22} />
        {unread > 0 && (
          /* The frame shows a bare red number at the bell's top right, not a
             filled badge circle. Capped so a long run cannot widen the nav. */
          <span className={styles.count}>{unread > 9 ? "9+" : unread}</span>
        )}
      </button>

      {open && (
        <div className={styles.popup} role="dialog" aria-label="Notifications">
          {failed ? (
            <p className={styles.empty}>Couldn&apos;t load notifications.</p>
          ) : items === null ? (
            <p className={styles.empty}>Loading…</p>
          ) : items.length === 0 ? (
            <p className={styles.empty}>No new notifications</p>
          ) : (
            <ul className={styles.list}>
              {items.map((n) => (
                <li key={n.id} className={n.unread ? `${styles.row} ${styles.unreadRow}` : styles.row}>
                  <Link
                    href={`/user/${usernameToPath(n.actor.username)}`}
                    className={styles.rowLink}
                    onClick={() => setOpen(false)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" className={styles.avatar} src={n.actor.avatar} alt="" />
                    <span className={styles.text}>
                      <strong className={styles.name}>{n.actor.displayName}</strong>{" "}
                      {/* Fixed when it happened, never recomputed — see the note
                          on NotificationType in schema.prisma. */}
                      {n.type === "FRIEND" ? "followed you back" : "followed you"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
