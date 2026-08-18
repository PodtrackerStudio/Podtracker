"use client";

import { useState } from "react";

/**
 * `initialFollowing` comes from the server, read from the database on page load.
 * Without it the button reset to "Follow" on every refresh no matter what you
 * had done — the state lived only in the browser.
 *
 * Optimistic: the label flips immediately and reverts if the request fails,
 * because waiting on a round-trip to acknowledge a click feels broken.
 */
export function FollowButton({
  styles,
  externalId,
  initialFollowing = false,
}: {
  styles: Record<string, string>;
  externalId: string;
  initialFollowing?: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    const next = !following;
    setFollowing(next);
    setBusy(true);
    try {
      const res = await fetch("/api/follow", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalId }),
      });
      if (!res.ok) setFollowing(!next);
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  }

  return following ? (
    <button className={styles.btnFollowing} onClick={toggle} disabled={busy}>
      Following
    </button>
  ) : (
    <button className={styles.btnFollow} onClick={toggle} disabled={busy}>
      Follow
    </button>
  );
}
