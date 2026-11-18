"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "./icons";
import { LogoutButton } from "./LogoutButton";
import { usernameToPath } from "@/lib/routeParams";

/**
 * "Profile ▾" in the signed-in nav, holding the account links that used to sit
 * in the bar on their own: Logout and Donate (Phillip, 2026-11-17: "declutter
 * this, maybe make it a drop down"). Settings joins them — it was reachable
 * only through Edit profile.
 *
 * Below the nav's 1100px breakpoint the links already live in the burger
 * panel, and a menu inside a menu is one tap too many, so CSS hides the
 * trigger there and shows these links as ordinary rows.
 */
export function ProfileMenu({ username, active }: { username: string; active: boolean }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Click outside or Escape closes it, like the search dropdown and the bell.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="profile-menu" ref={wrapRef}>
      <button
        type="button"
        className={`profile-menu-trigger ${active ? "active" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          // The burger panel closes on any button click inside it; this one
          // only ever shows on desktop, but keep it from counting anyway.
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        Profile
        <ChevronDownIcon size={16} />
      </button>

      <div
        className={`profile-menu-list ${open ? "open" : ""}`}
        role="menu"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a, button")) setOpen(false);
        }}
      >
        <Link href={`/user/${usernameToPath(username)}`} role="menuitem">
          Your profile
        </Link>
        <Link href="/settings" role="menuitem">
          Settings
        </Link>
        <Link href="/donate" role="menuitem">
          Donate
        </Link>
        <LogoutButton className="profile-menu-logout" />
      </div>
    </div>
  );
}
