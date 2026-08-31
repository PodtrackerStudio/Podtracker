"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The ✕ that removes one tile from a list or from Next listening.
 *
 * Hidden until the tile is hovered (Sasha's choice of the three options), so a
 * grid of covers stays a grid of covers. It is rendered only for the owner —
 * the check is on the server, and the endpoint re-checks, since a hidden button
 * is not a permission.
 *
 * It sits *outside* the `MediaThumbCard` anchor rather than inside it: a button
 * nested in a link is invalid HTML, and clicking remove would also follow the
 * link. The parent cell is the positioning context.
 */
export function RemoveListItemButton({ itemId, title }: { itemId: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/lists/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (res.ok) {
        // Server-rendered grid, so refetch rather than hiding the tile locally
        // and hoping the two agree.
        router.refresh();
        return;
      }
      setBusy(false);
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className="media-thumb-remove"
      onClick={remove}
      disabled={busy}
      aria-label={`Remove ${title}`}
      title={`Remove ${title}`}
    >
      {busy ? "…" : "✕"}
    </button>
  );
}
