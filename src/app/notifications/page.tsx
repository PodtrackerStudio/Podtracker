import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { getCurrentUser } from "@/lib/auth";
import { getNotifications, markAllNotificationsRead } from "@/lib/notifications";
import { usernameToPath } from "@/lib/routeParams";
import { avatarSrc } from "@/lib/avatar";
import styles from "./notifications.module.css";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

/**
 * Where the nav bell goes.
 *
 * **There is no Figma frame for this page.** Sasha designed the bell and its
 * badge (Frame 21, 2026-11-14) and said so — "I designed the notification part
 * on the nav bar" — but not the destination. A bell that links nowhere is
 * useless, so this is deliberately plain: the site's existing tokens, the same
 * centred column the other list pages use, and nothing invented beyond what a
 * list of "X followed you" needs. Replace it wholesale when a frame exists.
 *
 * Read on open, not per item. Opening the page clears the badge, which is what
 * people expect from a bell and avoids building per-row read tracking for a
 * page with one kind of row on it.
 */
export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Fetched before marking read, so this render still shows which ones were
  // new. Mark first and the page would arrive with everything already looking
  // old, and the thing you came to see would be indistinguishable.
  const notifications = await getNotifications(user.id);
  await markAllNotificationsRead(user.id).catch((error) => {
    // Failing to clear the badge is annoying, not fatal. Showing the list is
    // the point of the page.
    console.error("[notifications] could not mark read:", error);
  });

  return (
    <>
      <SiteNav />
      <main className={styles.main}>
        <h1 className={styles.heading}>Notifications</h1>

        {notifications.length === 0 ? (
          <p className={styles.empty}>
            Nothing yet. When someone follows you, it&apos;ll show up here.
          </p>
        ) : (
          <ul className={styles.list}>
            {notifications.map((n) => (
              <li key={n.id} className={n.readAt ? styles.row : `${styles.row} ${styles.unread}`}>
                <Link href={`/user/${usernameToPath(n.actor.username)}`} className={styles.avatarLink}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.avatar} src={avatarSrc(n.actor.id)} alt="" />
                </Link>
                <div className={styles.body}>
                  <p className={styles.text}>
                    <Link href={`/user/${usernameToPath(n.actor.username)}`} className={styles.name}>
                      {n.actor.displayName}
                    </Link>{" "}
                    {/* The wording is fixed at the moment it happened — see the
                        note on NotificationType in schema.prisma. A FOLLOW that
                        later became mutual still reads as a follow, because
                        that is what it was. */}
                    {n.type === "FRIEND" ? "followed you back — you're friends now." : "followed you."}
                  </p>
                  <time className={styles.when} dateTime={n.createdAt.toISOString()}>
                    {relativeTime(n.createdAt)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

/**
 * "3 days ago", rendered on the server.
 *
 * Deliberately coarse. A precise timestamp formatted on the server is in the
 * server's timezone, not the reader's, and fixing that properly means a client
 * component for every row. Nothing here needs that: the difference between two
 * notifications an hour apart does not matter.
 */
function relativeTime(date: Date): string {
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.round(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}
