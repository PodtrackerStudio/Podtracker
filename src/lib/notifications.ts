import { db } from "./db";

/**
 * Reading notifications. Writing them happens where the thing happens — see
 * `api/user/follow`, which creates one after the follow is written and
 * deliberately not alongside it, so a failed notification cannot cost the
 * follow. Note that only following writes one; unfollowing writes nothing and
 * leaves any existing notification alone.
 */

/** How many unread, for the badge on the nav bell. */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, readAt: null } });
}

/**
 * The list, newest first.
 *
 * Capped rather than paginated. A hundred is far more than anyone will scroll,
 * and a page nobody can reach the bottom of is not worth the paging code until
 * somebody actually has that many.
 */
export async function getNotifications(userId: string, take = 100) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      readAt: true,
      createdAt: true,
      actor: { select: { id: true, username: true, displayName: true } },
    },
  });
}

/**
 * Mark everything unread as read.
 *
 * Called when the bell popup is opened, so the badge clears by looking rather
 * than by clicking each one. The alternative — per-notification read state
 * driven by what scrolled into view — is a lot of machinery for a popup with
 * one kind of entry in it.
 */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  const { count } = await db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return count;
}
