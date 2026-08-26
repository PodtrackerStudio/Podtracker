import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensurePodcast, ensureEpisode } from "@/lib/ensureRecords";

type IncomingItem = { externalId?: string; episodeKey?: string | null };

/**
 * Create a list from the Create List page.
 *
 * The whole form arrives at once — title, description, ranked flag and every
 * title the user added — because that page is a single submit, not an
 * incremental editor. Adding to a list afterwards goes through
 * `/api/lists/items` instead.
 *
 * `ensurePodcast` / `ensureEpisode` materialise the rows `ListItem`
 * foreign-keys to, same as every other write on this site.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const isRanked = Boolean(body?.isRanked);
  const incoming: IncomingItem[] = Array.isArray(body?.items) ? body.items : [];

  if (!title) return NextResponse.json({ error: "A list needs a title." }, { status: 400 });
  if (incoming.length === 0) return NextResponse.json({ error: "Add at least one title." }, { status: 400 });

  try {
    // Everything is resolved BEFORE the list is created, so a lookup that
    // fails can't leave a half-built list behind. Dropping the failures
    // silently would be worse — the user would see a list missing entries it
    // never told them about.
    const targets: { podcastId: string | null; episodeId: string | null }[] = [];
    for (const item of incoming) {
      if (!item?.externalId) continue;

      if (item.episodeKey) {
        const episodeId = await ensureEpisode(String(item.externalId), String(item.episodeKey));
        if (!episodeId) {
          return NextResponse.json({ error: "One of those episodes is no longer in its show's feed." }, { status: 404 });
        }
        targets.push({ podcastId: null, episodeId });
      } else {
        targets.push({ podcastId: await ensurePodcast(String(item.externalId)), episodeId: null });
      }
    }

    if (targets.length === 0) return NextResponse.json({ error: "Add at least one title." }, { status: 400 });

    const list = await db.list.create({
      data: { userId: user.id, title, description: description || null, isRanked },
      select: { id: true },
    });

    // Positions are the order the user arranged them in, which is what a
    // ranked list numbers and what "List order" sorts by. Duplicates were
    // already prevented client-side, so this can be a straight createMany.
    await db.listItem.createMany({
      data: targets.map((target, i) => ({ listId: list.id, position: i + 1, ...target })),
    });

    return NextResponse.json({ ok: true, id: list.id });
  } catch {
    return NextResponse.json({ error: "Could not create that list." }, { status: 502 });
  }
}
