import { redirect, notFound } from "next/navigation";
import { lookupPodcast, fetchPodcastFeed } from "@/lib/podcastApi";
import { episodeKeyFromGuid } from "@/lib/episodeKey";
import { normaliseEpisodeTitle } from "@/lib/trendingEpisodes";

/**
 * Resolves one chart episode to its real page, then redirects. Renders nothing.
 *
 * **Why this exists.** Apple's trending chart gives a show id and an episode
 * *title*, but our routes need the hashed feed guid, and the only way to get it
 * is to parse that show's RSS feed. Doing that for a 100-entry list at render
 * time meant ~40 feeds — measured at over 280 seconds, which is why the full
 * list linked to shows instead of episodes.
 *
 * Resolving on click inverts the cost: **one feed for the one episode someone
 * actually opened**, instead of forty for a page they may only scroll past.
 * `fetchPodcastFeed` caches the parse for an hour, so the second click on the
 * same show is instant. It also removes the concurrent-feed burst that made
 * every trending link 404 on 2026-08-27.
 *
 * Every failure lands on the show page rather than an error — the documented
 * degradation for an unmatched title, and a working show link beats a dead end.
 */
export default async function FindEpisodePage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; title?: string }>;
}) {
  const { show, title } = await searchParams;

  // Without a usable show id there is no feed to search and nowhere to fall
  // back to, so this is a genuinely bad URL.
  if (!show || !/^\d+$/.test(show)) notFound();

  const showPage = `/podcast/${show}`;
  if (!title) redirect(showPage);

  const podcast = await lookupPodcast(show).catch(() => null);
  if (!podcast?.feedUrl) redirect(showPage);

  const feed = await fetchPodcastFeed(podcast.feedUrl).catch(() => null);
  if (!feed) redirect(showPage);

  const wanted = normaliseEpisodeTitle(title);
  const match = feed.episodes.find((e) => normaliseEpisodeTitle(e.title) === wanted);
  if (!match) redirect(showPage);

  redirect(`${showPage}/episode/${episodeKeyFromGuid(match.guid)}`);
}
