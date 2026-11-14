import { db } from "./db";

/**
 * Reading notifications. Writing them happens where the thing happens — see
 * `api/user/follow`, which creates one inside the same transaction as the
 * follow, so a follow can never exist without its notification.
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
 * Called when the notifications page is opened, so the badge clears by looking
 * rather than by clicking each one. The alternative — per-notification read
 * state driven by what scrolled into view — is a lot of machinery for a page
 * with one kind of entry on it.
 */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  const { count } = await db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return count;
}
