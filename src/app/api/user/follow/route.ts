import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { usernameFromParam } from "@/lib/routeParams";
import { getFollowState, type FollowState } from "@/lib/userFollow";
import { guardWrite, tooManyRequests } from "@/lib/rateLimit";

/**
 * Follow and unfollow a **person**.
 *
 * Not to be confused with `/api/follow`, which follows a **show**. The two were
 * nearly given the same route; they share a verb and nothing else.
 *
 * Takes a username rather than a user id, because that is what the client has
 * — profile pages are `/user/[username]` and internal ids are never sent to the
 * browser.
 */

/** Both handlers answer with the button's next state, so the client never guesses. */
function stateResponse(state: FollowState) {
  return NextResponse.json({ ok: true, state });
}

export async function POST(request: Request) {
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { username } = await request.json().catch(() => ({}));
  if (typeof username !== "string" || !username.trim()) {
    return NextResponse.json({ error: "Missing username." }, { status: 400 });
  }
  const writeLimit = guardWrite(viewer.id);
  if (!writeLimit.allowed) return tooManyRequests(writeLimit);

  const target = await db.user.findUnique({
    where: { username: usernameFromParam(username) },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "No such person." }, { status: 404 });

  // Following yourself would put a "you followed you" row in your own
  // notifications and make the friends count include you.
  if (target.id === viewer.id) {
    return NextResponse.json({ error: "You can't follow yourself." }, { status: 400 });
  }

  // Read before writing: whether they already follow back decides which kind
  // of notification this is, and whether the viewer already follows decides
  // whether anything happens at all.
  let theyFollowBack = false;
  let alreadyFollowing = false;
  try {
    const edges = await db.follow.findMany({
      where: {
        OR: [
          { followerId: viewer.id, followingId: target.id },
          { followerId: target.id, followingId: viewer.id },
        ],
      },
      select: { followerId: true },
    });
    alreadyFollowing = edges.some((e) => e.followerId === viewer.id);
    theyFollowBack = edges.some((e) => e.followerId === target.id);
  } catch (error) {
    console.error("[user-follow] could not read follow state:", error);
    return NextResponse.json(
      { error: "Could not do that just now. Please try again." },
      { status: 503 },
    );
  }

  const state: FollowState = theyFollowBack ? "friends" : "following";

  // ── The follow itself. This is what the person actually asked for. ──
  if (!alreadyFollowing) {
    try {
      await db.follow.create({ data: { followerId: viewer.id, followingId: target.id } });
    } catch (error) {
      // P2002 is the unique constraint on (followerId, followingId): two
      // clicks raced and the other won. The end state is the one that was
      // wanted, so report it rather than an error.
      if ((error as { code?: string })?.code !== "P2002") {
        console.error("[user-follow] follow failed:", error);
        return NextResponse.json(
          { error: "Could not do that just now. Please try again." },
          { status: 503 },
        );
      }
    }

    // ── The notification. Deliberately NOT in a transaction with the follow. ──
    //
    // It was, until 2026-11-14, on the reasoning that a follow should never
    // exist without its notification. That had the priority backwards and it
    // broke the feature in production: the `Notification` table did not exist
    // there yet — migrations are applied by hand on this project, not by the
    // build — so every insert failed, took the whole transaction down with it,
    // and the follow button silently did nothing.
    //
    // Following is the thing the person clicked. A notification is a courtesy
    // to somebody else. If the courtesy fails, the click must still work.
    //
    // The type is fixed here and never recomputed: derived at read time,
    // "X followed you" would silently become "you're friends now" the day you
    // followed back, rewriting what actually happened.
    //
    // At most one per pair per day. Unfollowing keeps the notification, so a
    // script looping follow/unfollow used to add one to the other person's
    // list on every pass, without limit.
    try {
      const recent = await db.notification.findFirst({
        where: {
          userId: target.id,
          actorId: viewer.id,
          createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
      });
      if (!recent) {
        await db.notification.create({
          data: {
            userId: target.id,
            actorId: viewer.id,
            type: theyFollowBack ? "FRIEND" : "FOLLOW",
          },
        });
      }
    } catch (error) {
      console.error(
        "[user-follow] the follow succeeded but its notification did not. " +
          "If this is P2021 (table does not exist), the notifications migration " +
          "has not been applied to this database:",
        error,
      );
    }
  }

  return stateResponse(state);
}

export async function DELETE(request: Request) {
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { username } = await request.json().catch(() => ({}));
  if (typeof username !== "string" || !username.trim()) {
    return NextResponse.json({ error: "Missing username." }, { status: 400 });
  }
  const writeLimit = guardWrite(viewer.id);
  if (!writeLimit.allowed) return tooManyRequests(writeLimit);

  const target = await db.user.findUnique({
    where: { username: usernameFromParam(username) },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "No such person." }, { status: 404 });

  try {
    // deleteMany rather than delete: unfollowing something you are not
    // following should quietly succeed, not throw P2025. The button can be
    // stale, and the end state is the same either way.
    await db.follow.deleteMany({
      where: { followerId: viewer.id, followingId: target.id },
    });
  } catch (error) {
    console.error("[user-follow] unfollow failed:", error);
    return NextResponse.json(
      { error: "Could not do that just now. Please try again." },
      { status: 503 },
    );
  }

  // Deliberately leaves any notification in place. The follow genuinely
  // happened, and silently deleting the record of it when someone unfollows
  // would let a person poke at somebody's notifications and then erase the
  // evidence.
  return stateResponse("none");
}
