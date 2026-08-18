import { db } from "./db";
import { getPodcastDetail } from "./podcastDetail";
import { episodeKeyFromGuid } from "./episodeKey";

/**
 * Materialises the `Podcast` / `Episode` rows a write needs.
 *
 * **Why this is necessary.** Favourites, follows, ratings and log entries are
 * all foreign keys to `Podcast` or `Episode`. Podcast pages render straight
 * from the iTunes API and nothing ever wrote a row, so every one of those
 * writes would fail on a foreign-key violation. That is why favouriting has
 * never worked, not a bug in the endpoint.
 *
 * **Called on write, never on read.** Doing it on page view would turn every
 * visit into a database write, and would fill the table with shows nobody
 * interacted with.
 *
 * `Podcast.externalId` holds the id the route uses — the iTunes id. The field
 * was originally commented as a Podcast Index id; nothing ever wrote that, and
 * the routes are iTunes-based, so this is now its meaning.
 */
export async function ensurePodcast(externalId: string): Promise<string> {
  const existing = await db.podcast.findUnique({ where: { externalId }, select: { id: true } });
  if (existing) return existing.id;

  // Only reached the first time anyone acts on a show, so the API round-trip
  // costs nothing on the common path.
  const detail = await getPodcastDetail(externalId);

  const created = await db.podcast.upsert({
    where: { externalId },
    create: {
      externalId,
      title: detail.title,
      author: detail.author,
      description: detail.description,
      coverUrl: detail.coverUrl,
      bannerUrl: detail.bannerUrl,
    },
    update: {},
    select: { id: true },
  });
  return created.id;
}

/**
 * Materialises one `Episode` row, creating its `Podcast` first if needed.
 *
 * `episodeKey` is the hashed guid from the route. The episode is located by
 * matching that hash against the show's feed, so the row stores the real guid
 * and the same episode always resolves to the same row — even after the show
 * publishes and every feed position shifts.
 *
 * Returns null when the key matches nothing in the current feed, which happens
 * for the legacy placeholder episodes and for items that have fallen out of the
 * feed entirely. Callers must treat null as "cannot store this yet" rather than
 * inventing a row.
 */
export async function ensureEpisode(podcastExternalId: string, episodeKey: string): Promise<string | null> {
  const detail = await getPodcastDetail(podcastExternalId);
  if (!detail.isLive) return null;

  const match = detail.recentEpisodes.find((e) => e.id === episodeKey);
  // Episode.publishedAt is required, and an episode with no date in its feed
  // can't be stored honestly — better to refuse than invent one.
  if (!match?.publishedAtIso) return null;

  const podcastId = await ensurePodcast(podcastExternalId);

  const existing = await db.episode.findFirst({
    where: { podcastId, externalId: match.guid },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await db.episode.create({
    data: {
      podcastId,
      externalId: match.guid,
      title: match.title,
      description: match.guest,
      coverUrl: match.img,
      publishedAt: new Date(match.publishedAtIso),
    },
    select: { id: true },
  });
  return created.id;
}

export { episodeKeyFromGuid };
