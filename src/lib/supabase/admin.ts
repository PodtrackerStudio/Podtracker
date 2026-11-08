import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * Supabase client with the **service-role key**, which bypasses Row Level
 * Security entirely and can act on any user.
 *
 * **This is the only privileged credential in the app.** Everything else runs
 * on the anon key, where what you may touch is decided by RLS policies. The
 * service-role key has no such limit — it is closer to the database password
 * than to an API key.
 *
 * Rules that follow from that, none of them optional:
 *
 *  - **Never `NEXT_PUBLIC_`.** Anything with that prefix is inlined into the
 *    JavaScript sent to browsers, which would hand every visitor full control
 *    of the auth system. The variable below is deliberately unprefixed, so in
 *    a client bundle it is `undefined` and `isSupabaseAdminConfigured` is
 *    false — the module cannot silently half-work in the wrong place.
 *  - **Never import this from a Client Component**, directly or through a
 *    chain. There is no `server-only` package in this project to enforce it,
 *    so the guard in `createSupabaseAdminClient` does it at runtime instead.
 *  - **Never pass the client or its results to the browser.**
 *
 * Added 2026-11-07 for one job: deleting a user's login when they delete their
 * account. `auth.admin.deleteUser` is the only way to do that — a user cannot
 * delete themselves with the anon key, by design. If this file ever grows a
 * second caller, that caller needs the same scrutiny.
 */

/**
 * Not read through a helper or a dynamic index: see the note in `env.ts` about
 * Next matching the literal `process.env.X` expression.
 */
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * False until the key is set, which it is **not** by default — it has to be
 * added in Vercel and in each developer's `.env`.
 *
 * Callers must check this and refuse the whole operation rather than do the
 * half they can. Deleting someone's data while leaving their login behind
 * would mean they could never sign up with that address again, and the site
 * would show them as signed in with no profile.
 */
export const isSupabaseAdminConfigured =
  SUPABASE_URL !== "" && SUPABASE_SERVICE_ROLE_KEY !== "";

/**
 * A fresh client each call. Unlike `createSupabaseServerClient` this one holds
 * no cookies and represents no user — it acts as the project itself, so there
 * is nothing per-request about it, but it is cheap and keeping it out of
 * module scope means the key is never held in memory on a request that does
 * not need it.
 */
export function createSupabaseAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "createSupabaseAdminClient was called in the browser. The service-role " +
        "key must never reach client code — move this call to a Route Handler " +
        "or Server Component.",
    );
  }
  if (!isSupabaseAdminConfigured) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Check `isSupabaseAdminConfigured` " +
        "before calling this.",
    );
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      // No session to keep: this client is not a user, and persisting or
      // refreshing one on the server would be meaningless at best.
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
