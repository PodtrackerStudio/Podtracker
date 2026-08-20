import { NextResponse } from "next/server";
import { quickSearch } from "@/lib/search";

/**
 * Typeahead search for client components.
 *
 * They can't call `quickSearch` directly any more: it went from a synchronous
 * lookup in a local array to a live network call, and browsers shouldn't hit
 * the iTunes API themselves — going through here keeps the request server-side,
 * so it shares Next's cache and needs no CORS handling.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Number(searchParams.get("limit")) || 5, 25);

  if (!q) return NextResponse.json({ results: [] });

  const results = await quickSearch(q, limit);
  return NextResponse.json({ results });
}
