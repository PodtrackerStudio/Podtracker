import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 *
 * `cookies()` is async in this version of Next, hence the await — a synchronous
 * call returns a promise and every cookie read comes back undefined.
 *
 * A new client per request is correct and not wasteful: it is a thin wrapper
 * around fetch, and it must close over *this* request's cookies. Do not hoist
 * it into a module-level singleton the way `db` in `src/lib/db.ts` is — that
 * one is a connection pool, which is the opposite situation.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components have a read-only cookie store, so this throws
          // whenever Supabase tries to write a refreshed token during a render.
          // Safe to swallow *only because* `src/proxy.ts` refreshes the session
          // on every matched request, where cookies are writable. If the proxy
          // is ever removed, sessions will stop refreshing and users will be
          // logged out when their token expires.
        }
      },
    },
  });
}
