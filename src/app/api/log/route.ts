import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensurePodcast, ensureEpisode } from "@/lib/ensureRecords";
import { RatingTier } from "@/generated/prisma/enums";

const TIERS = new Set<string>(Object.values(RatingTier));

/**
 * Log a listen — a diary entry, optionally carrying a rating and a review.
 *
 * **Log is rating plus diary** (Sasha's distinction). So when a tier is given
 * this writes *two* records: the `LogEntry`, and an upserted current rating.
 * `/api/rate` writes only the latter.
 *
 * `LogEntry.tier` is a snapshot, deliberately duplicated from the rating table.
 * The diary is a time capsule: re-rating later must not rewrite what an old
 * entry says you thought at the time. Averages read the *current* rating, never
 * these, so relistens can't inflate a show's numbers.
 *
 * A rating is optional — you can log that you listened without judging it.
 *
 * Many entries per user per item are allowed on purpose: relistens are real.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { externalId, episodeKey, tier, reviewText, listenedDate } = await request.json().catch(() => ({}));

  if (!externalId) return NextResponse.json({ error: "Missing externalId." }, { status: 400 });
  if (tier != null && !TIERS.has(tier)) {
    return NextResponse.json({ error: `tier must be one of: ${[...TIERS].join(", ")}` }, { status: 400 });
  }

  // Default to today, but respect a chosen date — logging something you heard
  // last week is the whole point of the date picker.
  const listenedAt = listenedDate ? new Date(listenedDate) : new Date();
  if (Number.isNaN(listenedAt.getTime())) {
    return NextResponse.json({ error: "listenedDate is not a valid date." }, { status: 400 });
  }

  try {
    if (episodeKey) {
      const episodeId = await ensureEpisode(String(externalId), String(episodeKey));
      if (!episodeId) {
        return NextResponse.json({ error: "That episode could not be found in the show's feed." }, { status: 404 });
      }

      // Both writes together: a diary entry claiming a rating that never landed
      // would be a lie, and a rating with no entry would lose the listen.
      const entry = await db.$transaction(async (tx) => {
        const created = await tx.logEntry.create({
          data: { userId: user.id, episodeId, listenedDate: listenedAt, reviewText: reviewText || null, tier: tier ?? null },
          select: { id: true },
        });
        if (tier) {
          await tx.episodeRating.upsert({
            where: { userId_episodeId: { userId: user.id, episodeId } },
            create: { userId: user.id, episodeId, tier },
            update: { tier },
          });
        }
        return created;
      });

      return NextResponse.json({ ok: true, target: "episode", logEntryId: entry.id, rated: Boolean(tier) });
    }

    const podcastId = await ensurePodcast(String(externalId));
    const entry = await db.$transaction(async (tx) => {
      const created = await tx.logEntry.create({
        data: { userId: user.id, podcastId, listenedDate: listenedAt, reviewText: reviewText || null, tier: tier ?? null },
        select: { id: true },
      });
      if (tier) {
        await tx.podcastRating.upsert({
          where: { userId_podcastId: { userId: user.id, podcastId } },
          create: { userId: user.id, podcastId, tier },
          update: { tier },
        });
      }
      return created;
    });

    return NextResponse.json({ ok: true, target: "podcast", logEntryId: entry.id, rated: Boolean(tier) });
  } catch {
    return NextResponse.json({ error: "Could not save that log." }, { status: 502 });
  }
}

/**
 * Delete one `LogEntry` by id — which is what "delete my review" means, since a
 * review is a `LogEntry` carrying `reviewText` and there is no separate table.
 *
 * **The whole entry goes, not just the text.** Clearing `reviewText` would
 * leave the listen sitting in the diary with its date and tier snapshot, which
 * is an edit, not a delete — and `/review/[id]` 404s without review text, so
 * the row would survive as something with no page and no way to reach it. The
 * caller is told what is being removed before it asks for this.
 *
 * **Comments and likes need no cleanup.** Both relate to `LogEntry` with
 * `onDelete: Cascade`, so Postgres removes them with the row.
 *
 * **The rating is deliberately left alone.** `PodcastRating`/`EpisodeRating` is
 * the author's *current* opinion and is separate from the diary on purpose —
 * see the schema. Deleting one of three relistens must not wipe a rating that
 * describes all of them, and a rating is changed through `/api/rate`.
 */
export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { logEntryId } = await request.json().catch(() => ({}));
  if (!logEntryId) return NextResponse.json({ error: "Missing logEntryId." }, { status: 400 });

  const entry = await db.logEntry.findUnique({
    where: { id: String(logEntryId) },
    select: { id: true, userId: true },
  });

  // Already gone is a success, matching /api/lists/items: a double click, or a
  // page left open while another tab deleted the same entry, is not an error.
  if (!entry) return NextResponse.json({ ok: true, deleted: false });

  // Checked against the row's own userId rather than anything the client sent —
  // a request body can claim to be anyone.
  if (entry.userId !== user.id) {
    return NextResponse.json({ error: "That isn't your review." }, { status: 403 });
  }

  try {
    await db.logEntry.delete({ where: { id: entry.id } });
  } catch {
    return NextResponse.json({ error: "Could not delete that review." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, deleted: true });
}
