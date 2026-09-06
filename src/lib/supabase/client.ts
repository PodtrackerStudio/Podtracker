"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

/**
 * Supabase client for Client Components — the sign-in and sign-up forms, and
 * anything that needs to react to auth state in the browser.
 *
 * `createBrowserClient` memoises internally, so calling this in several
 * components does not open several connections.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
