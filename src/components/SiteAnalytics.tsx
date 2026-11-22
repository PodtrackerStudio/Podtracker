"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { VisitTracker } from "./VisitTracker";

/**
 * Vercel Web Analytics, with secrets stripped from the URLs it records.
 *
 * **Why this is a client component and not `<Analytics />` straight in the
 * layout.** `beforeSend` is a function, and a Server Component cannot pass a
 * function to a Client Component.
 *
 * **Why `beforeSend` exists at all.** Emailed links carry a one-time login
 * token in the query string (`/auth/confirm?token_hash=…`, and the older
 * `/auth/callback?code=…`). Recording those would put working credentials into
 * a third-party dashboard. Every `/auth/*` URL is reported as its bare path.
 *
 * **Speed Insights (added 2026-11-18) gets the same treatment.** It reports
 * real visitors' load times per page — and so records URLs too, through the
 * same kind of hook. It only sends data from a Vercel deployment, and only
 * once Speed Insights is switched on for the project in the Vercel dashboard.
 *
 * Generic so one function serves both: the two packages' event types differ,
 * but each has a `url`, which is all this touches.
 */
function stripSecrets<E extends { url: string }>(event: E): E {
  const url = new URL(event.url);
  if (url.pathname.startsWith("/auth/")) {
    url.search = "";
    url.hash = "";
  }
  return { ...event, url: url.toString() };
}

export function SiteAnalytics() {
  return (
    <>
      <Analytics beforeSend={stripSecrets} />
      <SpeedInsights beforeSend={stripSecrets} />
      {/* Bounce rate and time on site, which Vercel's API doesn't offer. */}
      <VisitTracker />
    </>
  );
}
