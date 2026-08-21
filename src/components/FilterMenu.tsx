"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import styles from "./filterMenu.module.css";

export type FilterOption = {
  /** Value written to the query string. Empty string clears the param. */
  value: string;
  label: string;
  /** Optional colour class, used for the rating tiers. */
  tierClass?: string;
};

/**
 * One collapsed dropdown. Shows the current selection as its trigger and only
 * reveals options when opened — Sasha's note that all the choices shouldn't be
 * on screen at once, and less crowded than Letterboxd's always-visible rows.
 *
 * Selection lives in the query string, not component state, so a filtered view
 * is linkable — which is what lets the five tiers in the profile's distribution
 * be plain links into this same page.
 */
export function FilterMenu({
  param,
  options,
  defaultLabel,
}: {
  param: string;
  options: FilterOption[];
  /** Shown when the param is absent, e.g. "All Ratings". */
  defaultLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const currentValue = searchParams.get(param) ?? "";
  const currentLabel = options.find((o) => o.value === currentValue)?.label ?? defaultLabel;
  const currentTierClass = options.find((o) => o.value === currentValue)?.tierClass;

  // Click-away and Escape both close it.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function select(value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(param, value);
    else next.delete(param);
    // Any filter change invalidates the current page number.
    next.delete("page");
    router.push(`${pathname}${next.toString() ? `?${next}` : ""}`);
    setOpen(false);
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button className={styles.trigger} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className={currentTierClass ? `${styles[currentTierClass]} rating-label` : undefined}>{currentLabel}</span>
        <span className={styles.caret} aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className={styles.menu} role="listbox">
          <button className={styles.option} onClick={() => select("")} role="option" aria-selected={currentValue === ""}>
            {defaultLabel}
          </button>
          {options.map((o) => (
            <button
              className={styles.option}
              key={o.value}
              onClick={() => select(o.value)}
              role="option"
              aria-selected={currentValue === o.value}
            >
              <span className={o.tierClass ? `${styles[o.tierClass]} rating-label` : undefined}>{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
