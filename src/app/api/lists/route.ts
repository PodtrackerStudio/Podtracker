import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensurePodcast, ensureEpisode } from "@/lib/ensureRecords";

/** How many covers the picker stacks on a row before it shows a "+N". */
const COVERS_PER_ROW = 4;

/**
 * The signed-in user's lists, for the "Add to list" picker.
 *
 * Shaped for the row the Figma draws — avatar, title, author, a stack of the
 * first few covers — rather than returning whole `List` rows and making the
 * client dig the covers out of nested includes.
 *
 * Next listening is excluded: it is a `List` with `isWatchlist`, it has its own
 * button right next to this one, and it is not a list the user made.
 */
export async function GET() {
  const user = await getCurrentUser();
  // Not an error — the picker uses this to offer a login link instead.
  if (!user) return NextResponse.json({ lists: [], loggedIn: false });

  const lists = await db.list.findMany({
    where: { userId: user.id, isWatchlist: false },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        orderBy: { position: "asc" },
        take: COVERS_PER_ROW,
        include: { podcast: true, episode: { include: { podcast: true } } },
      },
      _count: { select: { items: true } },
    },
  });

  return NextResponse.json({
    loggedIn: true,
    // The owner is the same on every row — these are the viewer’s own lists —
    // and avatarUrl is often a base64 data URI running to ~90KB, so repeating
    // it per row would multiply the payload for nothing.
    owner: { name: user.displayName, avatarUrl: user.avatarUrl },
    lists: lists.map((list) => ({
      id: list.id,
      title: list.title,
      itemCount: list._count.items,
      covers: list.items
        .map((i) => i.podcast?.coverUrl ?? i.episode?.coverUrl ?? i.episode?.podcast?.coverUrl ?? null)
        .filter((c): c is string => Boolean(c)),
    })),
  });
}

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
    for (const [index, item] of incoming.entries()) {
      if (!item?.externalId) continue;

      if (item.episodeKey) {
        const episodeId = await ensureEpisode(String(item.externalId), String(item.episodeKey));
        // Apple only seems to index episodes its feed still carries, so this is
        // rare — but a show that truncates its feed between the search and the
        // submit would land here. failedIndex lets the form name the title
        // instead of making the user guess which one to remove.
        if (!episodeId) {
          return NextResponse.json(
            { error: "That episode is no longer in its show's feed.", failedIndex: index },
            { status: 404 },
          );
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
