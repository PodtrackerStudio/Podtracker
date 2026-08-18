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
