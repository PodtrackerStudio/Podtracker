import { NextResponse, after } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getNotifications, markAllNotificationsRead } from "@/lib/notifications";
import { avatarSrc } from "@/lib/avatar";

/**
 * What the bell popup loads when it opens.
 *
 * Fetched on open rather than rendered with the nav, because the nav is on
 * every page and nobody needs a list of notifications attached to every render
 * of every page. The badge count is the only thing worth paying for up front.
 *
 * Opening the popup marks everything read, which is what a bell is expected to
 * do. That happens here rather than in a second request so the two cannot
 * disagree.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  try {
    // Read before marking, so this response still says which were unread. Mark
    // first and the popup would open with everything already looking old.
    const rows = await getNotifications(user.id, 20);

    // Not awaited into the response: clearing the badge is a nicety, and the
    // list is what the person opened the popup to see. But in `after()`, not
    // a bare promise — the instance can be frozen the moment the response is
    // sent, which dropped the write and brought the badge back.
    after(() =>
      markAllNotificationsRead(user.id).catch((error) => {
        console.error("[notifications] could not mark read:", error);
      }),
    );

    return NextResponse.json({
      notifications: rows.map((n) => ({
        id: n.id,
        type: n.type,
        unread: n.readAt === null,
        createdAt: n.createdAt.toISOString(),
        actor: {
          username: n.actor.username,
          displayName: n.actor.displayName,
          avatar: avatarSrc(n.actor.id),
        },
      })),
    });
  } catch (error) {
    // Most likely cause on a database that has not had the notifications
    // migration applied: the table does not exist.
    //
    // This used to answer with an empty list, on the reasoning that a quiet
    // bell beats a broken one. That was wrong, and it cost two days: an empty
    // list renders as "No new notifications", which is indistinguishable from
    // genuinely having none. The migration had not been applied to production,
    // every write was failing, and the popup calmly reported that there was
    // nothing to see. Nobody could tell the difference, including whoever
    // built it.
    //
    // So say which it is. `error` makes the popup admit it could not read
    // them, rather than assert something untrue about somebody's account.
    console.error(
      "[notifications] could not read the list. If this is P2021 (table does " +
        "not exist), the notifications migration has not been applied here:",
      error,
    );
    return NextResponse.json({ notifications: [], error: true });
  }
}
