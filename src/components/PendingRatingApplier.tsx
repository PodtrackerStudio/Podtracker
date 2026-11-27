"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { readPendingRating, clearPendingRating } from "@/lib/pendingRating";

/**
 * Saves the rating a visitor picked before they had an account, then sends them
 * back to the page they picked it on.
 *
 * Mounted on `/home` because every way into a session lands there: a straight
 * signup (`SignupForm`), a login (`LoginForm`), and an emailed confirmation
 * link, which `/api/auth/confirm` sends to `/home` too. Putting it in the root
 * layout instead would fire a write attempt on every page a signed-out visitor
 * with a stash loaded, for nothing.
 *
 * Renders nothing. On success it replaces the history entry rather than pushing
 * one, so Back does not come straight back to `/home` and trigger this again.
 */
export function PendingRatingApplier() {
  const router = useRouter();
  // React runs effects twice in development's Strict Mode, and this one posts.
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const pending = readPendingRating();
    if (!pending) return;

    void (async () => {
      try {
        const res = await fetch("/api/rate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            externalId: pending.externalId,
            episodeKey: pending.episodeKey,
            episodeTitle: pending.episodeTitle,
            tier: pending.tier,
          }),
        });

        // Still signed out — the only case worth keeping the stash for, since
        // the next arrival here may well be signed in.
        if (res.status === 401) return;

        // The server answered, so there is nothing to retry: a 404 for an
        // episode the feed has dropped will never start working, and quietly
        // re-posting a write on every visit to /home is worse than losing one
        // rating.
        clearPendingRating();

        if (res.ok) {
          router.replace(pending.returnPath);
          router.refresh();
        }
      } catch {
        // Network failure rather than a refusal. Leave the stash: the next
        // visit retries it, and it expires on its own either way.
      }
    })();
  }, [router]);

  return null;
}
