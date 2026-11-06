import { NextResponse } from "next/server";
import { getEpisodePage, EPISODE_PAGE_MAX } from "@/lib/episodeDetail";

/**
 * One page of a show's episodes, for "Load more" and the Newest/Oldest switch on
 * `/podcast/[id]/episodes`. See `getEpisodePage`.
 *
 * Public data, so it's cached at Vercel's edge for a few minutes. Feeds
 * themselves only refresh hourly.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const query = new URL(request.url).searchParams;

  const sort = query.get("sort") === "oldest" ? "oldest" : "newest";
  const offset = Number(query.get("offset") ?? 0);
  const limit = Number(query.get("limit") ?? 20);
  if (!Number.isFinite(offset) || offset < 0 || !Number.isFinite(limit) || limit < 1 || limit > EPISODE_PAGE_MAX) {
    return NextResponse.json({ error: "Bad offset or limit." }, { status: 400 });
  }

  const page = await getEpisodePage(id, { sort, offset, limit });
  return NextResponse.json(
    { episodes: page.episodes, total: page.total },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } },
  );
}
