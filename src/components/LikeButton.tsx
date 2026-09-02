"use client";

import { useState } from "react";

/**
 * The heart on a review or a list: grey unliked, red once pressed, with the
 * count beside it — Sasha's frames show both states side by side purely to
 * illustrate the two, not as two controls.
 *
 * Optimistic, reverting on failure, matching Follow and "Add to next
 * listening": waiting on a round-trip to acknowledge a click reads as broken.
 *
 * Pass exactly one of `logEntryId` / `listId`. A review is a `LogEntry`
 * carrying `reviewText`, so a review's id is a `LogEntry` id.
 */
export function LikeButton({
  logEntryId,
  listId,
  initialCount,
  initialLiked = false,
  signedIn = true,
}: {
  logEntryId?: string;
  listId?: string;
  initialCount: number;
  initialLiked?: boolean;
  /** Signed-out visitors see the heart and the count, but can't toggle. */
  signedIn?: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy || !signedIn) return;
    const next = !liked;

    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    setBusy(true);
    try {
      const res = await fetch("/api/likes", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logEntryId ? { logEntryId } : { listId }),
      });
      if (!res.ok) throw new Error("failed");
      // Trust the server's count over the optimistic one — someone else may
      // have liked it in the meantime.
      const data = await res.json().catch(() => null);
      if (typeof data?.count === "number") setCount(data.count);
    } catch {
      setLiked(!next);
      setCount((c) => c + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="like-wrap">
      <button
        type="button"
        className={`like-heart ${liked ? "liked" : ""}`}
        onClick={toggle}
        disabled={busy || !signedIn}
        aria-pressed={liked}
        aria-label={liked ? "Unlike" : "Like"}
        title={signedIn ? (liked ? "Unlike" : "Like") : "Log in to like"}
      >
        {/* One path, recoloured by state — a separate outline shape would drift
            from the filled one. */}
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
          <path d="M12 21s-7.5-4.7-9.6-9A5.4 5.4 0 0 1 12 6.2 5.4 5.4 0 0 1 21.6 12c-2.1 4.3-9.6 9-9.6 9z" />
        </svg>
      </button>
      <span className="like-count">
        {count.toLocaleString("en-US")} {count === 1 ? "like" : "likes"}
      </span>
    </span>
  );
}
