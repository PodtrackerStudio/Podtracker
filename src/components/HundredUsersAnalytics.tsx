"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

/**
 * Hundred Users analytics, with the auth pages held back.
 *
 * **Why this wrapper exists instead of the bare tag in the layout.**
 * `/auth/confirm` is a rendered page, not a server redirect, and it is reached
 * from an emailed link that carries a live sign-in token in the query string:
 *
 *   /auth/confirm?token_hash=<token>&type=signup&next=/home
 *
 * That token is a working credential for an hour. Page-view analytics almost
 * always record `location.href`, so loading a third-party script there would
 * copy sign-in tokens into somebody else's database. `SiteAnalytics` solves the
 * same problem for Vercel with its `beforeSend` hook; this script takes a key
 * and nothing else, so the only control available is not loading it.
 *
 * The cost is small and known: page views on `/auth/*` are not counted. Those
 * are transient machine-to-machine steps, not pages anyone browses, and
 * `robots.txt` already excludes them. Every page a visitor actually reads
 * still reports.
 *
 * **To go back to the unguarded version** Sasha originally asked for, delete
 * this file and put the tag straight in `layout.tsx`. Please don't, without
 * reading the paragraph above first.
 */
export function HundredUsersAnalytics() {
  const pathname = usePathname();

  // Prefix match, not equality: /auth/callback and anything added under /auth
  // later gets the same protection without anyone having to remember.
  if (pathname?.startsWith("/auth/")) return null;

  return (
    <Script
      src="https://hundredusers.com/t.js"
      data-key="hu_8fbd67513003"
      strategy="afterInteractive"
    />
  );
}
