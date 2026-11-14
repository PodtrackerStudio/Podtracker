"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { FollowState } from "@/lib/userFollow";
import styles from "./unfollowConfirm.module.css";

/**
 * The one button on someone else's profile, in the slot Sasha's frame puts it:
 * left column, under the follower counts.
 *
 * Three states, from "Profile page 4":
 *
 *   none      "+ Follow"   blue   — you do not follow them
 *   following "Following"  blue   — you follow them, they do not follow back
 *   friends   "Friends"    green  — each follows the other
 *
 * **Friends is not a separate action.** Nothing is clicked to become friends —
 * it happens when the second follow lands, from either side. So the button only
 * ever does two things: follow, or unfollow.
 *
 * **Following is optimistic; unfollowing is not.** Following is cheap to get
 * wrong — the label flips at once and reverts if the request fails. Unfollowing
 * throws away a relationship, so it asks first (Sasha, 2026-11-14) and only
 * changes once the server has confirmed.
 *
 * What the client cannot predict is whether a follow makes you friends — that
 * depends on whether they already follow you, which only the server knows — so
 * it shows "Following" immediately and upgrades to "Friends" if the response
 * says so.
 */
export function UserFollowButton({
  styles: profileStyles,
  username,
  displayName,
  initialState,
}: {
  styles: Record<string, string>;
  username: string;
  displayName?: string;
  initialState: FollowState;
}) {
  const router = useRouter();
  const [state, setState] = useState<FollowState>(initialState);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const isFollowing = state === "following" || state === "friends";
  const who = displayName || username;

  // Focus lands on Cancel, not Unfollow: the safe option should be the one a
  // stray Enter hits. Escape closes, like every other dismissible thing.
  useEffect(() => {
    if (!confirming) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirming(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirming]);

  async function send(method: "POST" | "DELETE", optimistic: FollowState | null) {
    const previous = state;
    if (optimistic) setState(optimistic);
    setBusy(true);
    try {
      const res = await fetch("/api/user/follow", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.state) {
        setState(previous);
        return;
      }
      setState(data.state as FollowState);
      // The follower and friend counts beside this button are rendered on the
      // server, so they are stale the moment this succeeds.
      router.refresh();
    } catch {
      setState(previous);
    } finally {
      setBusy(false);
    }
  }

  function onClick() {
    if (busy) return;
    if (isFollowing) {
      setConfirming(true);
      return;
    }
    void send("POST", "following");
  }

  async function confirmUnfollow() {
    setConfirming(false);
    // No optimistic state: they have just been asked to confirm, so a label
    // that flips and then flips back would be worse than a brief wait.
    await send("DELETE", null);
  }

  const label = state === "friends" ? "Friends" : state === "following" ? "Following" : "+ Follow";
  const className =
    state === "friends"
      ? profileStyles.btnFriends
      : state === "following"
        ? profileStyles.btnFollowingUser
        : profileStyles.btnFollowUser;

  return (
    <>
      <button
        className={className}
        onClick={onClick}
        disabled={busy}
        /* The label alone does not say what clicking does — "Friends" and
           "Following" both lead to unfollowing, which the word does not. */
        title={isFollowing ? `Unfollow ${who}` : `Follow ${who}`}
        aria-label={isFollowing ? `Unfollow ${who}` : `Follow ${who}`}
      >
        {label}
      </button>

      {confirming && (
        <div
          className={styles.backdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="unfollow-title"
          /* Clicking away cancels. The check is on the backdrop itself so a
             click inside the card does not close it. */
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfirming(false);
          }}
        >
          <div className={styles.card}>
            <h2 id="unfollow-title" className={styles.title}>
              Unfollow {who}?
            </h2>
            <p className={styles.body}>
              {state === "friends"
                ? "You're friends at the moment. Unfollowing ends that for both of you, and their new episodes and reviews stop showing up for you."
                : "Their new episodes and reviews will stop showing up for you. You can follow them again whenever you like."}
            </p>
            <div className={styles.actions}>
              <button ref={cancelRef} className={styles.cancel} onClick={() => setConfirming(false)}>
                Cancel
              </button>
              <button className={styles.confirm} onClick={confirmUnfollow} disabled={busy}>
                Unfollow
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
