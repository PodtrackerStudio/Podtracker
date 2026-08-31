"use client";

import { useMemo, useState } from "react";
import styles from "./profile.module.css";

export type ListenedEntry = {
  /** `LogEntry.listenedDate` as ISO. Turned into a calendar day in the browser. */
  date: string;
  title: string;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Monday-first, matching the M T W T F S S labels in Sasha's design. */
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function monthKey(year: number, month: number) {
  return `${year}-${month}`;
}

/**
 * The profile's listening calendar, from real `LogEntry.listenedDate` rows.
 *
 * Replaces `demoListenedDays` + `juneWeeks`, which were a hardcoded June 2026
 * rendered only for `DEMO_USERNAME` — the `<` and `>` buttons had no handlers
 * and the leading/trailing muted cells were literal, because June 2026 happens
 * to start on a Monday.
 *
 * **Days are computed in the browser's timezone, not the server's**, because
 * that is where the date was chosen: the log popup sends
 * `selectedDate.toISOString()` from a local date. Reading it back as UTC would
 * shift a log to the previous day for anyone east of Greenwich.
 *
 * Every entry is passed in and grouped here rather than refetching per month,
 * so the arrows are instant. Fine at the scale a diary reaches; if someone ever
 * logs tens of thousands, this is the thing to paginate.
 */
export function ProfileCalendar({ entries }: { entries: ListenedEntry[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // day-of-month → titles, per month, so switching months is a lookup.
  const byMonth = useMemo(() => {
    const map = new Map<string, Record<number, string[]>>();
    for (const e of entries) {
      const d = new Date(e.date);
      if (Number.isNaN(d.getTime())) continue;
      const key = monthKey(d.getFullYear(), d.getMonth());
      const days = map.get(key) ?? {};
      (days[d.getDate()] ??= []).push(e.title);
      map.set(key, days);
    }
    return map;
  }, [entries]);

  const listenedDays = byMonth.get(monthKey(year, month)) ?? {};

  // Monday-first offset: getDay() is Sunday-first, so Sunday (0) becomes 6.
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { label: number; muted: boolean }[] = [];
  for (let i = firstWeekday - 1; i >= 0; i--) cells.push({ label: daysInPrevMonth - i, muted: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ label: d, muted: false });
  // Fill the last row so the grid stays rectangular, as the design shows.
  const trailing = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= trailing; d++) cells.push({ label: d, muted: true });

  function shift(by: number) {
    const d = new Date(year, month + by, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  return (
    <div className={styles.calendar}>
      <div className={styles.calendarHeader}>
        <span className={styles.calendarMonth}>
          {MONTHS[month]} {year}
        </span>
        <div className={styles.calendarNav}>
          <button onClick={() => shift(-1)} aria-label="Previous month">
            &lt;
          </button>
          <button onClick={() => shift(1)} aria-label="Next month">
            &gt;
          </button>
        </div>
      </div>
      <div className={styles.calendarGrid}>
        {DAY_LABELS.map((d, i) => (
          <div className={styles.dayLabel} key={`label-${i}`}>
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          // A muted cell belongs to a neighbouring month, so it never carries
          // this month's listens even when the numbers collide.
          const episodes = cell.muted ? undefined : listenedDays[cell.label];
          const isListened = Boolean(episodes?.length);
          const isMulti = (episodes?.length ?? 0) > 1;

          return (
            <div
              className={`${styles.dayCell} ${cell.muted ? styles.muted : ""} ${isListened ? styles.listened : ""} ${isMulti ? styles.multi : ""}`}
              key={`${i}-${cell.label}`}
            >
              {cell.label}
              {isListened && (
                <span className={styles.tooltip}>
                  {isMulti ? (
                    <ul className={styles.tooltipEpisodeList}>
                      {episodes!.map((ep, n) => (
                        <li key={`${ep}-${n}`}>{ep}</li>
                      ))}
                    </ul>
                  ) : (
                    episodes![0]
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
