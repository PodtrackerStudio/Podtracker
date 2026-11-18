import { NextResponse } from "next/server";
import { quickSearch, type SearchScope } from "@/lib/search";
import { rateLimit, clientKey, tooManyRequests, SEARCH_LIMIT } from "@/lib/rateLimit";

const SCOPES: SearchScope[] = ["all", "shows", "episodes", "users"];

/**
 * Typeahead search for client components.
 *
 * They can't call `quickSearch` directly any more: it went from a synchronous
 * lookup in a local array to a live network call, and browsers shouldn't hit
 * the iTunes API themselves — going through here keeps the request server-side,
 * so it shares Next's cache and needs no CORS handling.
 *
 * `scope` is what the add bars' Shows only / Episodes only control sets. Left
 * off, it's "all", which shows episodes only once the query has reached past a
 * show's name — see `queryReachesPastShowName`.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Capped: every distinct query is an outbound request to Apple and a cache
  // entry, and nothing legitimate searches for a paragraph.
  const q = (searchParams.get("q")?.trim() ?? "").slice(0, 100);
  // A whole number from 1 to 25. `limit=0.5` used to reach Prisma's `take` and
  // throw; a negative one went into Apple's URL.
  const limit = Math.max(1, Math.min(Math.trunc(Number(searchParams.get("limit"))) || 5, 25));
  const requested = searchParams.get("scope") ?? "all";
  const scope: SearchScope = SCOPES.includes(requested as SearchScope) ? (requested as SearchScope) : "all";
  // Opt-in, so the add bars — which never pass it — cannot be handed a member
  // to add to a list. See the note on `search` in lib/search.ts.
  const includeUsers = searchParams.get("users") === "1";

  if (!q) return NextResponse.json({ results: [] });

  // Public and unauthenticated, and each call spends some of the quota Apple
  // gives this deployment's addresses — the same quota show pages need. A loop
  // of random queries could get every show page throttled.
  const limited = rateLimit(clientKey(request, "search"), SEARCH_LIMIT);
  if (!limited.allowed) return tooManyRequests(limited);

  try {
    const results = await quickSearch(q, limit, scope, { includeUsers });
    return NextResponse.json({ results });
  } catch (error) {
    // Apple down or the database blinking. An empty list, not a 500: the
    // dropdown keeps what it had and the next keystroke tries again.
    console.error("[search] failed:", (error as Error)?.message);
    return NextResponse.json({ results: [] }, { status: 200 });
  }
}
