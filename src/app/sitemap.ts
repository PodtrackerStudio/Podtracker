import type { MetadataRoute } from "next";
import { getPopularPodcasts } from "@/lib/popularPodcasts";
import { staticSiteOrigin } from "@/lib/siteUrl";

/** Refresh hourly, matching the chart data the show entries come from. */
export const revalidate = 3600;

/** Pages that always exist and do not depend on data. */
const STATIC_PATHS = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/explore", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/explore/top-podcasts", priority: 0.7, changeFrequency: "daily" as const },
  { path: "/explore/trending-episodes", priority: 0.7, changeFrequency: "daily" as const },
  { path: "/donate", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/login", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/signup", priority: 0.5, changeFrequency: "yearly" as const },
];

/**
 * Served at `/sitemap.xml`, and announced from `robots.txt`.
 *
 * **Why this matters more than usual here.** Search engines find pages by
 * following links. A brand-new site has no inbound links, and the show pages
 * are reachable only through Explore, so a crawler arriving at the homepage
 * would find a handful of pages and stop. The sitemap hands it the list
 * directly.
 *
 * The show entries come from Apple's chart — the same source Explore uses — so
 * the hundred podcasts most likely to be searched for each have a URL a crawler
 * can reach. That is where realistic search traffic comes from: nobody finds
 * this site by searching "podcasts", but somebody searching a specific show's
 * name plus "reviews" is a page we can actually rank for.
 *
 * Signed-in and user-specific pages are deliberately absent — see `robots.ts`.
 * Profile pages are omitted too, until there are real accounts worth indexing.
 *
 * Degrades to the static list if the chart is unreachable: `getPopularPodcasts`
 * returns `[]` rather than throwing, and a sitemap missing its show entries is
 * a much smaller problem than a build that fails on a third-party outage.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = staticSiteOrigin();
  const now = new Date();

  const staticEntries = STATIC_PATHS.map(({ path, priority, changeFrequency }) => ({
    url: `${origin}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const podcasts = await getPopularPodcasts(100);
  const podcastEntries = podcasts.map((p) => ({
    url: `${origin}/podcast/${p.id}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...podcastEntries];
}
