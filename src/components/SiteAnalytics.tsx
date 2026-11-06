"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

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
 */
function stripSecrets(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = new URL(event.url);
  if (url.pathname.startsWith("/auth/")) {
    url.search = "";
    url.hash = "";
  }
  return { ...event, url: url.toString() };
}

export function SiteAnalytics() {
  return <Analytics beforeSend={stripSecrets} />;
}
