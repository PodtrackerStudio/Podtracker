import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { usernameFromParam } from "@/lib/routeParams";
import { getFollowState, type FollowState } from "@/lib/userFollow";

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

  try {
    const state = await db.$transaction(async (tx) => {
      // Does the target already follow the viewer? Read inside the transaction,
      // because it decides which notification gets written and the answer must
      // not change underneath us.
      const theyFollowBack = await tx.follow.findUnique({
        where: { followerId_followingId: { followerId: target.id, followingId: viewer.id } },
        select: { followerId: true },
      });

      // Was the viewer already following? If so this is a no-op repeat — a
      // double click, or a stale button — and must not write a second
      // notification.
      const alreadyFollowing = await tx.follow.findUnique({
        where: { followerId_followingId: { followerId: viewer.id, followingId: target.id } },
        select: { followerId: true },
      });

      if (!alreadyFollowing) {
        await tx.follow.create({
          data: { followerId: viewer.id, followingId: target.id },
        });

        // The type is fixed at the moment it happens and never recomputed. If
        // this were derived at read time, "X followed you" would silently turn
        // into "you are now friends" the day you followed back, rewriting what
        // the notification originally reported.
        await tx.notification.create({
          data: {
            userId: target.id,
            actorId: viewer.id,
            type: theyFollowBack ? "FRIEND" : "FOLLOW",
          },
        });
      }

      return theyFollowBack ? ("friends" as const) : ("following" as const);
    });

    return stateResponse(state);
  } catch (error) {
    // P2002 is the unique constraint on (followerId, followingId): two clicks
    // raced and the other one won. The desired end state is reached either
    // way, so report where things actually stand rather than an error.
    if ((error as { code?: string })?.code === "P2002") {
      return stateResponse(await getFollowState(viewer.id, target.id));
    }
    console.error("[user-follow] follow failed:", error);
    return NextResponse.json(
      { error: "Could not do that just now. Please try again." },
      { status: 503 },
    );
  }
}

export async function DELETE(request: Request) {
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { username } = await request.json().catch(() => ({}));
  if (typeof username !== "string" || !username.trim()) {
    return NextResponse.json({ error: "Missing username." }, { status: 400 });
  }

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
