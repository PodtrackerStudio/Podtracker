"use client";

import { useState } from "react";
import { PlusIcon, CheckIcon } from "./icons";

/**
 * "Add to next listening" — a direct toggle, like Follow. No picker: Sasha's
 * call is that this adds straight to the list, and only "Add to list" opens a
 * chooser.
 *
 * Optimistic, reverting on failure, because waiting on a round-trip to confirm
 * a click reads as broken.
 */
export function NextListeningButton({
  className,
  externalId,
  episodeKey,
  initialAdded = false,
}: {
  className: string;
  externalId: string;
  /** Present on episode pages; absent adds the show itself. */
  episodeKey?: string;
  initialAdded?: boolean;
}) {
  const [added, setAdded] = useState(initialAdded);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    const next = !added;
    setAdded(next);
    setBusy(true);
    try {
      const res = await fetch("/api/next-listening", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalId, episodeKey }),
      });
      if (!res.ok) setAdded(!next);
    } catch {
      setAdded(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className={className} onClick={toggle} disabled={busy}>
      {added ? <CheckIcon /> : <PlusIcon />}
      {added ? "In next listening" : "Add to next listening"}
    </button>
  );
}
