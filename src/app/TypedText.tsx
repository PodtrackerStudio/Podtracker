"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import styles from "./landing.module.css";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

type TypedTextProps = {
  text: string;
  /** Delay between characters, in milliseconds. */
  speedMs?: number;
  /** Pause before the first character appears, in milliseconds. */
  startDelayMs?: number;
};

/**
 * Types `text` out one character at a time, then leaves a blinking caret at the
 * end. The caret is solid while typing and only starts blinking once the text
 * is complete, the way a real cursor behaves.
 */
export function TypedText({ text, speedMs = 70, startDelayMs = 350 }: TypedTextProps) {
  const [typedCount, setTypedCount] = useState(0);

  // The server has no media query to read, so it renders as "motion allowed";
  // that matches the client's first paint, where nothing has been typed yet.
  const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, getReducedMotion, () => false);

  useEffect(() => {
    if (reducedMotion) return;

    let timer: ReturnType<typeof setTimeout>;
    let count = 0;

    const typeNextCharacter = () => {
      count += 1;
      setTypedCount(count);
      if (count < text.length) timer = setTimeout(typeNextCharacter, speedMs);
    };

    timer = setTimeout(typeNextCharacter, startDelayMs);
    return () => clearTimeout(timer);
  }, [text, speedMs, startDelayMs, reducedMotion]);

  // Reduced motion skips straight to the finished state. The clamp keeps a
  // stale count from over-running a shorter `text` if the prop ever changes.
  const visibleCount = reducedMotion ? text.length : Math.min(typedCount, text.length);
  const finished = visibleCount >= text.length;

  return (
    <span className={styles.typedWrap}>
      {/* Screen readers get the whole heading at once — the animation is decorative. */}
      <span className={styles.typedSrOnly}>{text}</span>

      {/* Hidden copy holds the final width so the line doesn't shift while typing.
          It carries a caret of its own so the real one always has room to sit on
          the last line instead of wrapping onto a new one. */}
      <span className={styles.typedGhost} aria-hidden="true">
        {text}
        <span className={styles.typedCaret} />
      </span>

      <span className={styles.typedVisible} aria-hidden="true">
        {text.slice(0, visibleCount)}
        <span className={finished ? styles.typedCaretBlinking : styles.typedCaret} />
      </span>
    </span>
  );
}
