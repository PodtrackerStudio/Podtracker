"use client";

import { useState, useEffect } from "react";
import type { SearchItem } from "@/lib/search";

/**
 * Debounced live search for client components.
 *
 * Search used to be a synchronous lookup in a local array, so callers could do
 * `query ? quickSearch(query) : []` inline. It is a network call now, and three
 * components needed the same debounce-and-abort dance, so it lives here once.
 *
 * Goes through `/api/search` rather than calling iTunes from the browser, so
 * the request stays server-side and shares Next's cache.
 */
export function useSearchResults(query: string, limit = 5): SearchItem[] {
  const [results, setResults] = useState<SearchItem[]>([]);
  const q = query.trim();

  useEffect(() => {
    // No setState for the empty case — clearing state synchronously inside an
    // effect triggers a cascading render. The empty result is derived on the
    // way out instead.
    if (!q) return;

    const controller = new AbortController();
    // 200ms: long enough to skip most intermediate keystrokes, short enough
    // that the dropdown still feels immediate.
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=${limit}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        // Aborted or offline — keep the previous results rather than flashing
        // an empty dropdown under the user's cursor.
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, limit]);

  // Stale results from a previous query never show, because an empty query
  // returns empty regardless of what state still holds.
  return q ? results : [];
}
