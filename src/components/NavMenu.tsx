"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Wraps the nav links so they can collapse behind a button on narrow screens.
 *
 * **Why this exists.** `nav.site-nav` was a single flex row with no wrapping and
 * no media query anywhere in `globals.css`. Measured at 1280px the signed-in nav
 * used 1075px of 1169px available — it fits on a laptop and squeezes below
 * roughly 1150px, which is every phone. Instagram and TikTok traffic arrives on
 * phones.
 *
 * Above the breakpoint nothing changes: the button is hidden and the links are
 * the same row they always were. All of the collapsing is in CSS; this only
 * holds the open/closed state.
 */
export function NavMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  // Escape closes it, matching every other dismissible thing on the site.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="nav-burger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="site-nav-links"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {/* Three bars, or a cross when open — drawn rather than an icon font so
            it inherits the nav's colour. */}
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
          {open ? (
            <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
          )}
        </svg>
      </button>

      {/* Closing on click rather than on a pathname effect: navigating with the
          menu open would leave it hanging over the new page, and watching the
          path means calling setState from an effect, which the linter rejects
          and which renders twice. This also covers Logout, which is a button
          rather than a link. */}
      <div
        id="site-nav-links"
        className={`nav-links ${open ? "open" : ""}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a, button")) setOpen(false);
        }}
      >
        {children}
      </div>
    </>
  );
}
