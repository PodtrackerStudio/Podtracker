"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Deletes the viewer's own review.
 *
 * **Only rendered for the author.** The server checks ownership too — this is
 * the UI half of that, not the enforcement.
 *
 * **Not optimistic**, unlike Like and Follow. Those are cheap to get wrong for
 * a moment and trivial to undo; this is neither. Showing a review as gone
 * before the server has agreed would be a lie whenever the request fails, and
 * there is nothing to click to find out.
 *
 * The confirm spells out what else goes, because a review is a `LogEntry` — the
 * same row the diary renders — so deleting it removes the listen as well, and
 * takes its comments and likes with it. People can't consent to that if the
 * prompt just says "are you sure".
 */
export function DeleteReviewButton({
  logEntryId,
  returnTo,
  className,
}: {
  logEntryId: string;
  /** Where to go once it's gone — this page is about to 404. */
  returnTo: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function remove() {
    if (busy) return;

    const confirmed = window.confirm(
      "Delete this review?\n\n" +
        "It will also disappear from your diary, along with any likes and comments on it. " +
        "Your rating of the show stays.\n\n" +
        "This can't be undone.",
    );
    if (!confirmed) return;

    setBusy(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/log", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logEntryId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErrorMsg(data?.error ?? "Could not delete that review.");
        setBusy(false);
        return;
      }

      // refresh() as well as push(): without it the destination can come back
      // from the router cache still listing the review that was just deleted.
      router.push(returnTo);
      router.refresh();
    } catch {
      setErrorMsg("Could not delete that review.");
      setBusy(false);
    }
  }

  return (
    <span className={className}>
      <button type="button" onClick={remove} disabled={busy}>
        {busy ? "Deleting…" : "Delete review"}
      </button>
      {errorMsg && <span role="alert">{errorMsg}</span>}
    </span>
  );
}
