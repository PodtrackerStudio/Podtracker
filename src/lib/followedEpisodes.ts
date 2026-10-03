import { unstable_cache } from "next/cache";
import { db } from "./db";
import { getPodcastDetail } from "./podcastDetail";

/**
 * New episodes from the shows someone follows — the home page's feed.
 *
 * **The cost here is feed parsing, and it is the whole design.** Podcast feeds
 * run 2.5–7MB, parse in seconds, and parsing is CPU-bound and single-threaded,
 * so following ten shows means ten parses queued behind one another. The same
 * arithmetic took `/explore` past 400s and failed a Vercel build outright. Three
 * things keep that from happening again, and none of them is optional:
 *
 * 1. **`MAX_SHOWS`.** Only the most recently followed shows are read.
 * 2. **A per-show cache.** `latestForShow` is keyed on the show, not the
 *    viewer, so a show five people follow is parsed once an hour, not five
 *    times a render. This is the part that makes the feature scale with users.
 * 3. **A hard deadline.** The cap bounds how many feeds are asked for, not how
 *    long they take. Whatever has arrived when the clock runs out is what gets
 *    rendered — a feed with four shows in it beats a page that hangs.
 */

export type FollowedEpisode = {
  key: string;
  href: string;
  title: string;
  showTitle: string;
  showHref: string;
  coverUrl: string;
  /** For sorting; the display string is `dateLabel`. */
  publishedAtIso: string;
  dateLabel: string;
};

/** Most recently followed shows win when someone follows more than this. */
const MAX_SHOWS = 12;

/** See the note above — the cap is not a time bound, and this is. */
const BUDGET_MS = 10_000;

/**
 * One show's newest episodes, cached by show rather than by viewer.
 *
 * Caching the *derived* handful rather than the feed is deliberate: feeds blow
 * past Next's 2MB fetch-cache limit, so Next stores none of them, while four
 * episodes' worth of strings stores fine.
 */
const latestForShow = unstable_cache(
  async (externalId: string) => {
    const detail = await getPodcastDetail(externalId);
    // `isLive` false means the lookup failed and this is the built-in
    // placeholder. Its episodes are invented, and inventing uploads in
    // someone's feed is worse than a shorter feed.
    if (!detail.isLive) return [];

    return detail.recentEpisodes
      .filter((ep) => ep.publishedAtIso)
      .map((ep) => ({
        key: `${externalId}:${ep.id}`,
        href: `/podcast/${externalId}/episode/${ep.id}`,
        title: ep.title,
        showTitle: detail.title,
        showHref: `/podcast/${externalId}`,
        coverUrl: ep.img || detail.coverUrl,
        publishedAtIso: ep.publishedAtIso as string,
        dateLabel: ep.date,
      }));
  },
  ["followed-show-latest"],
  { revalidate: 1800, tags: ["followed-show-latest"] },
);

/**
 * Newest first, across every show the viewer follows.
 *
 * Returns `[]` rather than throwing on a database problem: the home page has
 * other sections, and losing the feed should not take the page with it.
 */
export async function getFollowedEpisodes(userId: string, limit = 12): Promise<FollowedEpisode[]> {
  if (!userId) return [];

  let follows: { podcast: { externalId: string | null } }[];
  try {
    follows = await db.podcastFollow.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: MAX_SHOWS,
      select: { podcast: { select: { externalId: true } } },
    });
  } catch {
    return [];
  }

  const externalIds = [
    ...new Set(follows.map((f) => f.podcast.externalId).filter((v): v is string => Boolean(v))),
  ];
  if (externalIds.length === 0) return [];

  const collected: FollowedEpisode[] = [];
  const fetchAll = Promise.all(
    externalIds.map(async (externalId) => {
      try {
        collected.push(...(await latestForShow(externalId)));
      } catch {
        // One unreachable feed shouldn't empty the whole feed.
      }
    }),
  );

  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, BUDGET_MS);
  });
  await Promise.race([fetchAll, deadline]);
  clearTimeout(timer);

  return collected
    .sort((a, b) => Date.parse(b.publishedAtIso) - Date.parse(a.publishedAtIso))
    .slice(0, limit);
}
