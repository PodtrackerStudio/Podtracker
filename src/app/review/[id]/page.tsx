import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { episodeHref } from "@/lib/episodeKey";
import { Comments } from "@/components/Comments";
import { LikeButton } from "@/components/LikeButton";
import styles from "./review.module.css";

/** RatingTier enum → the label and colour class the design uses. */
const TIER_DISPLAY: Record<string, { label: string; className: string }> = {
  HIGHLY_RECOMMEND: { label: "Highly Recommend", className: "highly" },
  RECOMMEND: { label: "Recommend", className: "recommend" },
  OK: { label: "Ok", className: "ok" },
  DONT_RECOMMEND: { label: "Don't recommend", className: "dont" },
  DIDNT_FINISH: { label: "Didn't finish", className: "didnt" },
};

// timeZone pinned, like every other date formatter in the app. Without it this
// renders in the *server's* zone, so the same entry showed one date here and
// another on /user/[username]/ratings — and west of UTC a diary entry saved for
// the 1st displayed as the 31st.
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "numeric",
  day: "numeric",
  year: "2-digit",
  timeZone: "UTC",
});

/**
 * A single review, opened from anywhere one is listed.
 *
 * A "review" is a `LogEntry` carrying `reviewText` — there is no separate table.
 * The tier shown is the author's **current** rating of the same target rather
 * than `LogEntry.tier`, matching how the profile's reviews tab does it, since a
 * review can exist without a rating and vice versa.
 */
/**
 * A review's own title and preview.
 *
 * Reviews are the one kind of page here that nothing else on the internet has:
 * the platforms host the audio, the show's own site hosts the show, and neither
 * hosts what listeners thought of it. Giving each review a real title is what
 * lets "<show name> review" find this site rather than a directory listing.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;

  const entry = await db.logEntry
    .findUnique({
      where: { id },
      select: {
        reviewText: true,
        user: { select: { displayName: true, username: true } },
        episode: { select: { title: true, podcast: { select: { title: true } } } },
        podcast: { select: { title: true } },
      },
    })
    .catch(() => null);

  if (!entry?.reviewText) return {};

  const subject = entry.episode?.title ?? entry.podcast?.title ?? entry.episode?.podcast?.title ?? "a podcast";
  const author = entry.user.displayName || entry.user.username;
  const body = entry.reviewText.replace(/\s+/g, " ").trim();

  return {
    title: `${author}'s review of ${subject}`,
    description: body.length > 200 ? `${body.slice(0, 197).trimEnd()}…` : body,
    alternates: { canonical: `/review/${id}` },
    openGraph: {
      type: "article",
      title: `${author}'s review of ${subject}`,
      description: body,
      url: `/review/${id}`,
    },
  };
}

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const entry = await db.logEntry.findUnique({
    where: { id },
    include: {
      // Only the three fields this page renders. `user: true` pulled the whole
      // row, password hash and email included, into a Server Component that
      // hands data to Client Components — nothing leaked, but the shape made a
      // leak one careless prop away.
      user: { select: { username: true, displayName: true, avatarUrl: true } },
      episode: { include: { podcast: true } },
      podcast: true,
    },
  });

  // Log entries without review text are diary entries, not reviews.
  if (!entry || !entry.reviewText) notFound();

  const podcast = entry.podcast ?? entry.episode?.podcast ?? null;

  const rating = entry.episodeId
    ? await db.episodeRating.findUnique({
        where: { userId_episodeId: { userId: entry.userId, episodeId: entry.episodeId } },
        select: { tier: true },
      })
    : entry.podcastId
      ? await db.podcastRating.findUnique({
          where: { userId_podcastId: { userId: entry.userId, podcastId: entry.podcastId } },
          select: { tier: true },
        })
      : null;

  const [viewer, comments, likeCount] = await Promise.all([
    getCurrentUser(),
    db.comment.findMany({
      where: { logEntryId: entry.id },
      // Same reasoning as above — these three fields are what a comment shows.
      include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.like.count({ where: { logEntryId: entry.id } }),
  ]);

  // Asked separately because it depends on `viewer`, which the block above
  // is still resolving.
  const likedByViewer = viewer
    ? Boolean(await db.like.findFirst({ where: { userId: viewer.id, logEntryId: entry.id }, select: { id: true } }))
    : false;

  const tier = rating?.tier ?? entry.tier ?? null;
  const display = tier ? TIER_DISPLAY[tier] : null;

  const title = entry.episode?.title ?? podcast?.title ?? "Untitled";
  const cover = entry.episode?.coverUrl ?? podcast?.coverUrl ?? "/default-avatar.webp";
  // episodeHref, not entry.episodeId — that is a database cuid, and a link
  // built from it matches no episode in any feed, so it landed on the
  // placeholder episode instead of the one being reviewed.
  const href = entry.episode
    ? (episodeHref(podcast?.externalId, entry.episode.externalId) ?? "#")
    : podcast?.externalId
      ? `/podcast/${podcast.externalId}`
      : "#";

  return (
    <>
      <SiteNav />
      <main className={styles.main}>
        <article className={styles.reviewHeader}>
          <Link href={href}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.cover} src={cover} alt={title} />
          </Link>

          <div>
            <h1 className={styles.title}>
              <Link href={href}>{title}</Link>
            </h1>
            {entry.episode && podcast && <div className={styles.showName}>{podcast.title}</div>}

            <div className={styles.byline}>
              <span>
                Review by{" "}
                <Link href={`/user/${entry.user.username}`} className={styles.author}>
                  {entry.user.displayName}
                </Link>
              </span>
              <span className={styles.date}>Date: {dateFormatter.format(entry.listenedDate)}</span>
            </div>

            {/* Tier and heart share a row, as the frame shows. The tier can be
                absent — a review doesn't require a rating — and the heart
                stands alone then. */}
            <div className={styles.tierRow}>
              {display && <div className={`${styles.tier} ${styles[display.className]} rating-label`}>{display.label}</div>}
              <LikeButton logEntryId={entry.id} initialCount={likeCount} initialLiked={likedByViewer} signedIn={Boolean(viewer)} />
            </div>

            <p className={styles.body}>{entry.reviewText}</p>
          </div>
        </article>

        <Comments
          logEntryId={entry.id}
          canComment={Boolean(viewer)}
          comments={comments.map((c) => ({
            id: c.id,
            text: c.text,
            authorName: c.user.displayName,
            authorUsername: c.user.username,
            authorAvatarUrl: c.user.avatarUrl,
          }))}
        />
      </main>
      <SiteFooter />
    </>
  );
}
