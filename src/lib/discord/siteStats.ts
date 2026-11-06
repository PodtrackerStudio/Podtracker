import { db } from "@/lib/db";

/**
 * Podtracker's own numbers: what Vercel Analytics cannot see.
 *
 * Analytics counts visits. These count what people did once they were here.
 * The queries mirror `scripts/stats.mjs` (`npm run stats`), so the bot and the
 * script agree. "Accounts" are profile rows, as they are there.
 *
 * Read-only: every statement is a SELECT.
 */
export type SiteStats = {
  accounts: number;
  accountsThisWeek: number;
  activeAccounts: number;
  reviewers: number;
  logs: number;
  logsThisWeek: number;
  reviews: number;
  ratings: number;
  follows: number;
  lists: number;
  likes: number;
  comments: number;
};

export async function getSiteStats(): Promise<SiteStats> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    accounts,
    accountsThisWeek,
    activeRows,
    reviewerRows,
    logs,
    logsThisWeek,
    reviews,
    podcastRatings,
    episodeRatings,
    follows,
    lists,
    likes,
    comments,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gt: weekAgo } } }),
    db.$queryRaw<{ n: number }[]>`
      SELECT count(DISTINCT id)::int AS n FROM (
        SELECT "userId" AS id FROM "LogEntry"
        UNION SELECT "userId" FROM "PodcastRating"
        UNION SELECT "userId" FROM "EpisodeRating"
        UNION SELECT "userId" FROM "PodcastFollow"
      ) AS acted`,
    db.$queryRaw<{ n: number }[]>`
      SELECT count(DISTINCT "userId")::int AS n FROM "LogEntry" WHERE "reviewText" IS NOT NULL`,
    db.logEntry.count(),
    db.logEntry.count({ where: { createdAt: { gt: weekAgo } } }),
    db.logEntry.count({ where: { reviewText: { not: null } } }),
    db.podcastRating.count(),
    db.episodeRating.count(),
    db.podcastFollow.count(),
    // Next listening is stored as a List too; it is not one somebody made.
    db.list.count({ where: { isWatchlist: false } }),
    db.like.count(),
    db.comment.count(),
  ]);

  return {
    accounts,
    accountsThisWeek,
    activeAccounts: activeRows[0]?.n ?? 0,
    reviewers: reviewerRows[0]?.n ?? 0,
    logs,
    logsThisWeek,
    reviews,
    ratings: podcastRatings + episodeRatings,
    follows,
    lists,
    likes,
    comments,
  };
}
