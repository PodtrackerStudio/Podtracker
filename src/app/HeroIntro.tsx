"use client";

import { useState } from "react";
import { TypedText } from "./TypedText";
import styles from "./landing.module.css";

/**
 * The landing headline and the two lines under it.
 *
 * **Why these sit in one component.** The subheading fades in *after* the
 * headline finishes typing, so something has to know when that is — and the
 * only thing that does is `TypedText`. The landing page is a Server Component
 * and cannot hand it a callback, so the pair lives here together and the page
 * renders this instead of the bare `<h1>`.
 *
 * The timing is not recreated from `speedMs` and `startDelayMs`. Doing so would
 * break under reduced motion, where the heading is complete on the first paint
 * and the subheading should simply be there.
 */
export function HeroIntro() {
  const [headlineDone, setHeadlineDone] = useState(false);

  return (
    <>
      <h1>
        <TypedText text="Welcome to Podtracker!" onFinished={() => setHeadlineDone(true)} />
      </h1>

      {/* aria-hidden is deliberately NOT set: the fade is decorative, and these
          two lines are the clearest statement of what the site is, so they
          belong in the accessibility tree and in what a crawler reads whether
          or not the animation has run. opacity leaves both intact. */}
      <p className={`${styles.heroSub} ${headlineDone ? styles.heroSubVisible : ""}`}>
        <span className={styles.heroSubLead}>Your Podcast listening diary.</span>
        <span className={styles.heroSubDetail}>
          Log, rate, and review every podcast you listen to.
        </span>
      </p>
    </>
  );
}
