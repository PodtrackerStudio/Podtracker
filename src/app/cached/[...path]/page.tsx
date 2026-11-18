import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LandingPage from "@/app/(landing)/page";
import ExplorePage, { metadata as exploreMetadata } from "@/app/explore/page";
import TopPodcastsPage, { metadata as topPodcastsMetadata } from "@/app/explore/top-podcasts/page";
import TrendingEpisodesPage, { metadata as trendingEpisodesMetadata } from "@/app/explore/trending-episodes/page";
import PodcastPage, { generateMetadata as podcastMetadata } from "@/app/podcast/[id]/page";
import EpisodePage, { generateMetadata as episodeMetadata } from "@/app/podcast/[id]/episode/[epId]/page";
import FullEpisodeListPage, { generateMetadata as episodeListMetadata } from "@/app/podcast/[id]/episodes/page";
import TopRatedEpisodesPage, { generateMetadata as topRatedMetadata } from "@/app/podcast/[id]/top-rated/page";

/**
 * **Cached copies of the public pages, for visitors who are not signed in.**
 *
 * Every page on the site was rebuilt from scratch for every visitor, because
 * the nav checks who is signed in and that makes a page uncacheable. But a
 * signed-out visitor — every first-time visitor and every search crawler —
 * gets the same page as every other signed-out visitor. Rendering it once and
 * reusing it for a few minutes is free speed.
 *
 * How it works:
 *
 *   1. `src/proxy.ts` sees a GET for one of the pages below with **no auth
 *      cookie and no query string**, and rewrites it to `/cached/…`. The URL
 *      in the browser does not change.
 *   2. This route renders the *real* page component — the same one, imported,
 *      not a copy — under `force-static`. That setting makes `cookies()` come
 *      back empty, so `getCurrentUser()` is null and the page renders exactly
 *      as it does for someone signed out. No page had to be changed.
 *   3. Next keeps the result for `revalidate` seconds, per path, and serves it
 *      from the CDN. After that the next visit gets the old copy while a fresh
 *      one is built behind it.
 *
 * Signed-in people never come here: their cookie keeps them on the normal,
 * per-request pages, with their own follow state, ratings and nav.
 *
 * **A catch-all with an empty `generateStaticParams`, on purpose.** One
 * `force-static` page file per route would be prerendered at *build* time, and
 * `/explore` reaching Apple's charts during a build has failed a deploy before
 * (see docs/change-log.md). This way nothing is built until someone asks.
 *
 * **What goes stale.** A new rating or review can take up to five minutes to
 * show for signed-out visitors. The person who made it is signed in and sees
 * it immediately.
 *
 * **Adding a page:** add it to `resolve` below AND to `CACHEABLE` in
 * `src/proxy.ts`. Only pages that are the same for every signed-out visitor
 * and do not read `searchParams` belong here.
 */
export const dynamic = "force-static";
export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ path: string[] }> };

type Resolved =
  | { kind: "landing" }
  | { kind: "explore" }
  | { kind: "top-podcasts" }
  | { kind: "trending-episodes" }
  | { kind: "podcast"; id: string }
  | { kind: "episodes"; id: string }
  | { kind: "top-rated"; id: string }
  | { kind: "episode"; id: string; epId: string };

/** `/cached/<this>` → which page. Mirrors `CACHEABLE` in the proxy. */
function resolve(path: string[]): Resolved | null {
  const [a, b, c, d, ...rest] = path;
  if (rest.length > 0) return null;

  if (a === "landing" && b === undefined) return { kind: "landing" };
  if (a === "explore") {
    if (b === undefined) return { kind: "explore" };
    if (c !== undefined) return null;
    if (b === "top-podcasts") return { kind: "top-podcasts" };
    if (b === "trending-episodes") return { kind: "trending-episodes" };
    return null;
  }
  if (a === "podcast" && b) {
    if (c === undefined) return { kind: "podcast", id: b };
    if (c === "episodes" && d === undefined) return { kind: "episodes", id: b };
    if (c === "top-rated" && d === undefined) return { kind: "top-rated", id: b };
    if (c === "episode" && d) return { kind: "episode", id: b, epId: d };
  }
  return null;
}

/** The episode page reads `?t=`; requests with a query string are never sent here. */
const NO_SEARCH = Promise.resolve({});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path } = await params;
  const page = resolve(path);
  if (!page) return {};

  switch (page.kind) {
    case "landing":
      return {};
    case "explore":
      return exploreMetadata;
    case "top-podcasts":
      return topPodcastsMetadata;
    case "trending-episodes":
      return trendingEpisodesMetadata;
    case "podcast":
      return podcastMetadata({ params: Promise.resolve({ id: page.id }) });
    case "episodes":
      return episodeListMetadata({ params: Promise.resolve({ id: page.id }) });
    case "top-rated":
      return topRatedMetadata({ params: Promise.resolve({ id: page.id }) });
    case "episode":
      return episodeMetadata({
        params: Promise.resolve({ id: page.id, epId: page.epId }),
        searchParams: NO_SEARCH,
      });
  }
}

export default async function CachedPage({ params }: Props) {
  const { path } = await params;
  const page = resolve(path);
  if (!page) notFound();

  switch (page.kind) {
    case "landing":
      return <LandingPage />;
    case "explore":
      return <ExplorePage />;
    case "top-podcasts":
      return <TopPodcastsPage />;
    case "trending-episodes":
      return <TrendingEpisodesPage />;
    case "podcast":
      return <PodcastPage params={Promise.resolve({ id: page.id })} />;
    case "episodes":
      return <FullEpisodeListPage params={Promise.resolve({ id: page.id })} />;
    case "top-rated":
      return <TopRatedEpisodesPage params={Promise.resolve({ id: page.id })} />;
    case "episode":
      return (
        <EpisodePage params={Promise.resolve({ id: page.id, epId: page.epId })} searchParams={NO_SEARCH} />
      );
  }
}
