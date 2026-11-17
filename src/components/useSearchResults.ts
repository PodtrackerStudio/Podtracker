"use client";

import { useState, useEffect } from "react";
import type { SearchItem, SearchScope } from "@/lib/searchItem";

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
export function useSearchResults(
  query: string,
  limit = 5,
  scope: SearchScope = "all",
  options: { includeUsers?: boolean } = {},
): SearchItem[] {
  return useSearchResultsState(query, limit, scope, options).results;
}

/**
 * The same search, plus whether the results on screen are for what is typed
 * now. The nav search uses it to say "Searching…" rather than flashing "No
 * matches." for the 200ms debounce and the round trip after every keystroke.
 */
export function useSearchResultsState(
  query: string,
  limit = 5,
  scope: SearchScope = "all",
  { includeUsers = false }: { includeUsers?: boolean } = {},
): { results: SearchItem[]; loading: boolean } {
  // Results and the request they answer, kept together so `loading` is derived
  // rather than set — no extra state to fall out of step.
  const [state, setState] = useState<{ key: string; results: SearchItem[] }>({ key: "", results: [] });
  const q = query.trim();
  const key = `${scope}|${includeUsers ? 1 : 0}|${limit}|${q}`;

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
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&limit=${limit}&scope=${scope}${includeUsers ? "&users=1" : ""}`,
          {
            signal: controller.signal,
          },
        );
        const data = await res.json();
        setState({ key, results: data.results ?? [] });
      } catch {
        // Aborted or offline — keep the previous results rather than flashing
        // an empty dropdown under the user's cursor. Offline still marks this
        // query answered, so "Searching…" doesn't spin forever.
        if (!controller.signal.aborted) setState((s) => ({ ...s, key }));
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, limit, scope, includeUsers, key]);

  // Stale results from a previous query never show, because an empty query
  // returns empty regardless of what state still holds.
  if (!q) return { results: [], loading: false };
  return { results: state.results, loading: state.key !== key };
}
