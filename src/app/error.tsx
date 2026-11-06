"use client";

import Link from "next/link";
import { useEffect } from "react";
import styles from "./status.module.css";

/**
 * What a visitor sees when a page throws.
 *
 * **Before this existed, they saw Next's bare "Application error: a
 * server-side exception has occurred" and a digest string.** That is what
 * "this page doesn't load" looked like on an episode whose feed could not be
 * reached — no nav, no explanation, no way back, and nothing saying it was
 * worth trying again.
 *
 * **Trying again is the point.** The one throw this app does on purpose —
 * `getEpisodeDetail` returning `unavailable` — means iTunes or the feed host
 * did not answer *this time*. The episode is almost certainly fine. That case
 * is transient by definition, so `reset()` re-renders the route, and the same
 * URL usually works on the second press. Sending someone to a dead end for a
 * blip is the failure this page exists to stop.
 *
 * The wording stays specific and unalarming. An earlier attempt at a failure
 * message on this site said "Sorry something went wrong.. we are working to
 * fix it" on a signup that had worked perfectly, and had to be reverted. This
 * one renders only when something genuinely threw, and says what probably
 * happened rather than apologising in the abstract.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Client-side throws never reach the server log otherwise, so the first
    // anyone would know is a user mentioning it.
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>This page didn&apos;t load</h1>
      <p className={styles.body}>
        Podcast and episode data comes from Apple and from each show&apos;s own feed, and sometimes
        one of them doesn&apos;t answer in time. That&apos;s usually over in a few seconds — trying
        again normally works.
      </p>
      <div className={styles.actions}>
        <button className={styles.btn} onClick={reset}>
          Try again
        </button>
        <Link href="/explore" className={`${styles.btn} ${styles.btnQuiet}`}>
          Go to Explore
        </Link>
      </div>
      {error.digest && <p className={styles.digest}>Reference: {error.digest}</p>}
    </div>
  );
}
