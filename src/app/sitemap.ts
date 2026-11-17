import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getPopularPodcasts } from "@/lib/popularPodcasts";
import { staticSiteOrigin } from "@/lib/siteUrl";
import { db } from "@/lib/db";
import { episodeHref } from "@/lib/episodeKey";
import { usernameToPath } from "@/lib/routeParams";

/** Pages that always exist and do not depend on data. */
const STATIC_PATHS = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/explore", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/explore/top-podcasts", priority: 0.7, changeFrequency: "daily" as const },
  { path: "/explore/trending-episodes", priority: 0.7, changeFrequency: "daily" as const },
  { path: "/donate", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" as const },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" as const },
  { path: "/login", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/signup", priority: 0.5, changeFrequency: "yearly" as const },
];

/**
 * Per-query ceiling. The protocol allows 50,000 URLs per file; five queries at
 * 5,000 stays well inside it. Past that this needs `generateSitemaps` to split
 * into several files — not a problem the site has yet.
 */
const TAKE = 5000;

type Entry = MetadataRoute.Sitemap[number];

/**
 * Served at `/sitemap.xml`, and announced from `robots.txt`.
 *
 * **Why this matters more than usual here.** Search engines find pages by
 * following links. A new site has few inbound links, and show, episode and
 * review pages are only reachable by clicking through, so a crawler arriving at
 * the homepage finds a handful of pages and stops. The sitemap hands it the
 * list directly.
 *
 * **Two sources, so it never collapses to the static ten.**
 *
 * 1. Apple's top-100 chart — the shows most likely to be searched for.
 * 2. **Podtracker's own pages** — every show and episode somebody has rated,
 *    logged or followed, every review, every list with something in it, and
 *    every profile with activity. These are the pages nothing else on the
 *    internet has: "<show> review" is winnable precisely because the platforms
 *    host no reviews.
 *
 * Until 2026-11-17 it was only (1), and **production served 10 URLs**: Apple's
 * chart failed during the build, and Vercel shipped the result as a static
 * file (`accept-ranges`, `etag`, a fixed `last-modified`), so the hourly
 * `revalidate` never ran and the empty answer stayed live. Hence:
 *
 * - **`connection()` renders it per request.** Not `force-dynamic`, which would
 *   turn the chart fetch's own one-hour cache off and call Apple on every hit.
 *   Crawlers fetch a sitemap a few times a day; five indexed queries is cheap.
 * - **Every source fails soft.** A dead chart or database costs its own
 *   entries, never the file.
 *
 * Signed-in and user-specific pages are absent — see `robots.ts`. So is Next
 * listening (`isWatchlist`), whose url only redirects to its owner's profile.
 *
 * `lastModified` is given only where it is true. A sitemap that stamps every
 * url with "now" teaches Google to ignore the field for the whole site, which
 * would waste it on reviews, where it is accurate — they are never edited.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const origin = staticSiteOrigin();

  const [chart, podcasts, episodes, reviews, lists, users] = await Promise.all([
    getPopularPodcasts(100),
    db.podcast
      .findMany({
        where: {
          externalId: { not: null },
          OR: [{ ratings: { some: {} } }, { logEntries: { some: {} } }, { followers: { some: {} } }],
        },
        select: { externalId: true },
        take: TAKE,
      })
      .catch(() => []),
    db.episode
      .findMany({
        where: {
          externalId: { not: null },
          podcast: { externalId: { not: null } },
          OR: [{ ratings: { some: {} } }, { logEntries: { some: {} } }],
        },
        select: { externalId: true, podcast: { select: { externalId: true } } },
        take: TAKE,
      })
      .catch(() => []),
    db.logEntry
      .findMany({
        // The review page 404s on an empty review, so those are diary entries.
        where: { reviewText: { not: null }, NOT: { reviewText: "" } },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: TAKE,
      })
      .catch(() => []),
    db.list
      .findMany({
        where: { isWatchlist: false, items: { some: {} } },
        select: { id: true },
        orderBy: { createdAt: "desc" },
        take: TAKE,
      })
      .catch(() => []),
    db.user
      .findMany({
        // A profile with nothing on it is a thin page; one with ratings or a
        // diary is the thing someone might search a username to find.
        where: {
          OR: [{ logEntries: { some: {} } }, { podcastRatings: { some: {} } }, { episodeRatings: { some: {} } }],
        },
        select: { username: true },
        take: TAKE,
      })
      .catch(() => []),
  ]);

  const entries: Entry[] = STATIC_PATHS.map(({ path, priority, changeFrequency }) => ({
    url: `${origin}${path}`,
    changeFrequency,
    priority,
  }));

  // Shows come from two places and overlap, so dedupe on the url.
  const seen = new Set(entries.map((e) => e.url));
  const add = (entry: Entry) => {
    if (seen.has(entry.url)) return;
    seen.add(entry.url);
    entries.push(entry);
  };

  for (const p of podcasts) {
    add({ url: `${origin}/podcast/${p.externalId}`, changeFrequency: "weekly", priority: 0.7 });
  }
  for (const p of chart) {
    add({ url: `${origin}/podcast/${p.id}`, changeFrequency: "weekly", priority: 0.6 });
  }
  for (const e of episodes) {
    // episodeHref, never the database cuid — see lib/episodeKey.ts for the
    // four pages that got this wrong and linked to the placeholder episode.
    const href = episodeHref(e.podcast.externalId, e.externalId);
    if (href) add({ url: `${origin}${href}`, changeFrequency: "monthly", priority: 0.6 });
  }
  for (const r of reviews) {
    add({ url: `${origin}/review/${r.id}`, lastModified: r.createdAt, changeFrequency: "monthly", priority: 0.6 });
  }
  for (const l of lists) {
    // No lastModified: items are added after a list is created, and nothing
    // records when, so createdAt would understate it.
    add({ url: `${origin}/list/${l.id}`, changeFrequency: "weekly", priority: 0.5 });
  }
  for (const u of users) {
    add({ url: `${origin}/user/${usernameToPath(u.username)}`, changeFrequency: "weekly", priority: 0.4 });
  }

  return entries;
}
