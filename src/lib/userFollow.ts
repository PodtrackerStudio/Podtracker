import { db } from "./db";

/**
 * Following between people, and the friendship that falls out of it.
 *
 * **Friends are not stored.** There is no friends table and no accept step: two
 * people are friends when each follows the other, which is a query over
 * `Follow`, not a row of its own. Sasha's instruction (2026-11-14) was
 * explicit — "friends is only when two people follow each other" — and the
 * Figma frame he chose shows one button cycling Follow → Following → Friends
 * rather than the request/accept flow his other frame explored.
 *
 * Storing friendship separately would mean two sources of truth that can
 * disagree: a friends row saying yes while one of the follows is gone. Deriving
 * it means it cannot drift.
 */

/** What the button on someone else's profile should say. */
export type FollowState =
  /** Neither follows the other, or only they follow you. */
  | "none"
  /** You follow them; they do not follow you back. */
  | "following"
  /** Each follows the other. */
  | "friends";

/**
 * How `viewerId` relates to `profileId`, in one round trip.
 *
 * Reads both directions at once rather than two counts, because the answer
 * needs both and the pair is tiny. Returns "none" for a signed-out viewer or
 * for your own profile — neither has a button.
 */
export async function getFollowState(
  viewerId: string | null,
  profileId: string,
): Promise<FollowState> {
  if (!viewerId || viewerId === profileId) return "none";

  const edges = await db.follow.findMany({
    where: {
      OR: [
        { followerId: viewerId, followingId: profileId },
        { followerId: profileId, followingId: viewerId },
      ],
    },
    select: { followerId: true },
  });

  const viewerFollows = edges.some((e) => e.followerId === viewerId);
  const theyFollowBack = edges.some((e) => e.followerId === profileId);

  if (viewerFollows && theyFollowBack) return "friends";
  if (viewerFollows) return "following";
  return "none";
}

/** The three counts under a profile name. Friends is the mutual overlap. */
export async function getFollowCounts(userId: string) {
  const [followers, following, friends] = await Promise.all([
    db.follow.count({ where: { followingId: userId } }),
    db.follow.count({ where: { followerId: userId } }),
    // People this user follows who follow back. Expressed as a count of their
    // outgoing follows whose target follows them in return.
    db.follow.count({
      where: {
        followerId: userId,
        following: { following: { some: { followingId: userId } } },
      },
    }),
  ]);

  return { followers, following, friends };
}
