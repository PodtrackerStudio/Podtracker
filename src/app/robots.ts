import type { MetadataRoute } from "next";
import { staticSiteOrigin } from "@/lib/siteUrl";

/**
 * Served at `/robots.txt`.
 *
 * Crawlers look for this file before anything else, and its absence is not
 * neutral — some treat a 404 as a reason to crawl conservatively. More
 * importantly it is where the sitemap is announced, which is how a new site
 * with no inbound links gets discovered at all.
 *
 * **What is disallowed and why.** None of it is secret — every one of these is
 * already behind an auth check. They are excluded because they waste the crawl
 * budget on pages that cannot be usefully indexed:
 *
 * - `/api/` returns JSON, never a page.
 * - `/auth/callback` is a one-time code exchange that errors when replayed.
 * - `/settings`, `/log` and the password-reset pages are signed-in-only, so a
 *   crawler sees a redirect or an empty shell.
 * - `/episode/find` resolves a title to an episode and redirects. Indexing it
 *   would fill results with a URL that is really a lookup.
 * - `/genres` is deliberately unlinked and not part of the MVP.
 *
 * Note that disallowing a path is a request, not access control. Anything that
 * must not be reachable needs an auth check, and all of these have one.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = staticSiteOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/settings",
        "/log",
        "/forgot-password",
        "/reset-password",
        "/episode/find",
        "/genres",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
