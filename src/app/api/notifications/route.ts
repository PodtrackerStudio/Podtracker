import { NextResponse, after } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getNotifications, markAllNotificationsRead } from "@/lib/notifications";
import { avatarSrc } from "@/lib/avatar";
import { guardWrite, tooManyRequests } from "@/lib/rateLimit";

/**
 * What the bell popup loads when it opens.
 *
 * Fetched on open rather than rendered with the nav, because the nav is on
 * every page and nobody needs a list of notifications attached to every render
 * of every page. The badge count is the only thing worth paying for up front.
 *
 * Opening the popup marks everything read, which is what a bell is expected to
 * do — but through `POST` below, which the bell sends once this list has
 * arrived. It used to happen inside this GET, and a GET that changes state can
 * be triggered by any page that links or navigates here.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  try {
    const rows = await getNotifications(user.id, 20);

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

/**
 * Marks everything read. Sent by the bell after the list has loaded, so the
 * list it shows still says which were unread.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  const writeLimit = guardWrite(user.id);
  if (!writeLimit.allowed) return tooManyRequests(writeLimit);

  // In `after()`, not a bare promise — the instance can be frozen the moment
  // the response is sent, which dropped the write and brought the badge back.
  after(() =>
    markAllNotificationsRead(user.id).catch((error) => {
      console.error("[notifications] could not mark read:", error);
    }),
  );
  return NextResponse.json({ ok: true });
}
