import Link from "next/link";
import styles from "./status.module.css";

/**
 * What a visitor sees when a route calls `notFound()`, or asks for a URL that
 * does not exist.
 *
 * Five pages already called `notFound()` — the episode page, the review page,
 * a list, a profile's Next listening, and the episode finder — and none of
 * them had this, so every one served Next's unstyled default.
 *
 * **The second sentence is the honest part.** On an episode URL, "not found"
 * very often does not mean the link was wrong: episode pages are resolved
 * against the show's live RSS feed, and plenty of feeds only carry their most
 * recent episodes. An episode logged months ago can roll out of the feed and
 * its page stops resolving, even though the rating and the review are still in
 * our database. Saying only "this page doesn't exist" would be misleading for
 * what is probably the most common way somebody lands here.
 */
export default function NotFound() {
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>We couldn&apos;t find that</h1>
      <p className={styles.body}>
        This page doesn&apos;t exist — or it&apos;s an episode we can&apos;t read. Podtracker builds
        episode pages from each show&apos;s public RSS feed, so two kinds of episode end up here:
        ones from subscriber-only shows, which Apple lists but keeps behind a paid feed, and older
        ones from shows that only publish their recent episodes. Any ratings and reviews you wrote
        are kept either way.
      </p>
      <div className={styles.actions}>
        <Link href="/explore" className={styles.btn}>
          Go to Explore
        </Link>
        <Link href="/" className={`${styles.btn} ${styles.btnQuiet}`}>
          Home
        </Link>
      </div>
    </div>
  );
}
