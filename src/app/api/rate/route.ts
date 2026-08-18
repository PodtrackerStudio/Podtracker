import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensurePodcast, ensureEpisode } from "@/lib/ensureRecords";
import { RatingTier } from "@/generated/prisma/enums";

const TIERS = new Set<string>(Object.values(RatingTier));

/**
 * Rate a show or an episode.
 *
 * **Rate is not log.** This records the tier and nothing else — no diary entry,
 * no date. Sasha's use case: rating something you listened to a while ago. The
 * diary entry belongs to `/api/log`.
 *
 * Show ratings and episode ratings are independent, IMDb-style: rating a show
 * is its own act, not an average of its episodes. Hence two tables and the
 * either/or below.
 *
 * Upsert, because a user has exactly one current rating per item — re-rating
 * replaces it. Past opinions live on in `LogEntry.tier`.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { externalId, episodeKey, tier } = await request.json().catch(() => ({}));

  if (!externalId) return NextResponse.json({ error: "Missing externalId." }, { status: 400 });
  if (!tier || !TIERS.has(tier)) {
    return NextResponse.json({ error: `tier must be one of: ${[...TIERS].join(", ")}` }, { status: 400 });
  }

  try {
    // An episodeKey means the episode is being rated; without one it's the show.
    if (episodeKey) {
      const episodeId = await ensureEpisode(String(externalId), String(episodeKey));
      if (!episodeId) {
        return NextResponse.json({ error: "That episode could not be found in the show's feed." }, { status: 404 });
      }
      await db.episodeRating.upsert({
        where: { userId_episodeId: { userId: user.id, episodeId } },
        create: { userId: user.id, episodeId, tier },
        update: { tier },
      });
      return NextResponse.json({ ok: true, target: "episode", tier });
    }

    const podcastId = await ensurePodcast(String(externalId));
    await db.podcastRating.upsert({
      where: { userId_podcastId: { userId: user.id, podcastId } },
      create: { userId: user.id, podcastId, tier },
      update: { tier },
    });
    return NextResponse.json({ ok: true, target: "podcast", tier });
  } catch {
    return NextResponse.json({ error: "Could not save that rating." }, { status: 502 });
  }
}
