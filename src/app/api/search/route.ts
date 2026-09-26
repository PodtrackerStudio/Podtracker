import { NextResponse } from "next/server";
import { quickSearch, type SearchScope } from "@/lib/search";

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
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Number(searchParams.get("limit")) || 5, 25);
  const requested = searchParams.get("scope") ?? "all";
  const scope: SearchScope = SCOPES.includes(requested as SearchScope) ? (requested as SearchScope) : "all";
  // Opt-in, so the add bars — which never pass it — cannot be handed a member
  // to add to a list. See the note on `search` in lib/search.ts.
  const includeUsers = searchParams.get("users") === "1";

  if (!q) return NextResponse.json({ results: [] });

  const results = await quickSearch(q, limit, scope, { includeUsers });
  return NextResponse.json({ results });
}
