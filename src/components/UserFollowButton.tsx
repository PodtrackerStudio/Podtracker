"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FollowState } from "@/lib/userFollow";

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
 * His other frame ("Profile page 3") showed "+ Friend request" / "Requested" /
 * "Friends", a request-and-accept flow. He chose this one: "friends is only
 * when two people follow each other".
 *
 * **Friends is not a separate action.** There is nothing to click to become
 * friends — it happens when the second follow lands, from either side. So the
 * button only ever does two things: follow, or unfollow.
 *
 * Optimistic, like `FollowButton` for shows: the label changes at once and
 * reverts if the request fails. What it cannot predict is whether a follow
 * makes you friends — that depends on whether they already follow you, which
 * only the server knows — so it shows "Following" immediately and upgrades to
 * "Friends" when the response says so.
 */
export function UserFollowButton({
  styles,
  username,
  initialState,
}: {
  styles: Record<string, string>;
  username: string;
  initialState: FollowState;
}) {
  const router = useRouter();
  const [state, setState] = useState<FollowState>(initialState);
  const [busy, setBusy] = useState(false);

  const isFollowing = state === "following" || state === "friends";

  async function toggle() {
    if (busy) return;
    const previous = state;
    // The optimistic guess. Unfollowing always lands on "none"; following lands
    // on at least "following", and the server may say "friends".
    setState(isFollowing ? "none" : "following");
    setBusy(true);

    try {
      const res = await fetch("/api/user/follow", {
        method: isFollowing ? "DELETE" : "POST",
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

  const label = state === "friends" ? "Friends" : state === "following" ? "Following" : "+ Follow";
  const className =
    state === "friends"
      ? styles.btnFriends
      : state === "following"
        ? styles.btnFollowingUser
        : styles.btnFollowUser;

  return (
    <button
      className={className}
      onClick={toggle}
      disabled={busy}
      /* The label alone does not say what clicking does — "Friends" and
         "Following" both unfollow, which is not obvious from the word. */
      title={isFollowing ? `Unfollow ${username}` : `Follow ${username}`}
      aria-label={isFollowing ? `Unfollow ${username}` : `Follow ${username}`}
    >
      {label}
    </button>
  );
}
