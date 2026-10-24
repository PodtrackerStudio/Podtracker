import { cache } from "react";
import { db } from "./db";
import { createSupabaseServerClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/env";

/**
 * Says once, loudly, what silently signing everybody out actually means — so a
 * missing `.env` reads as a setup step rather than as a broken site. Once,
 * because this is reached on every render and a per-request warning would bury
 * the request log it sits in.
 */
let warnedAboutMissingKeys = false;
function warnOnceAboutMissingKeys() {
  if (warnedAboutMissingKeys) return;
  warnedAboutMissingKeys = true;
  console.warn(
    "[auth] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set, " +
      "so nobody can sign in and every visitor is treated as logged out. " +
      "The rest of the site works. Add both to .env — they are gitignored, so " +
      "each machine needs its own copy.",
  );
}

/**
 * Who is signed in, or null.
 *
 * **This is the single seam between the app and its auth system.** 29 files call
 * it and none of them know or care what is behind it — which is why swapping
 * bcrypt-and-database-sessions for Supabase changed this file and the four auth
 * routes, and nothing else. Keep the signature and the returned shape stable.
 *
 * The credential half of an account (email, password, session) lives in
 * Supabase. The profile half (username, display name, bio, and every rating,
 * review and list hanging off it) lives in our own `User` table, keyed by the
 * same id Supabase issues.
 *
 * **`getUser`, never `getSession`.** `getSession` reads the cookie and trusts
 * it; `getUser` verifies the token with Supabase. Using the former here would
 * mean a forged cookie authenticates.
 *
 * Wrapped in React's `cache` so the several components that ask "who is signed
 * in?" during one render share a single verification instead of each making
 * their own round trip to Supabase.
 */
export const getCurrentUser = cache(async () => {
  // No Supabase keys — nobody can be signed in, so say so instead of throwing.
  //
  // `createServerClient` rejects empty credentials, and because this function
  // runs on **every** page, that exception took the whole site down with a 500:
  // a checkout without keys rendered nothing at all, with an error pointing at
  // a library rather than at the missing configuration. Whoever pulls this
  // branch before setting up their own `.env` — which is gitignored and never
  // travels — would have hit exactly that.
  if (!isSupabaseConfigured) {
    warnOnceAboutMissingKeys();
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  // Explicit field list, not `select: undefined` — this shape is what all 29
  // callers see, and several of them hand it to Client Components. Nothing
  // secret should be able to ride along.
  return db.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      longBio: true,
      externalLink: true,
      createdAt: true,
    },
  });
});

// `authErrorMessage` moved to `authErrors.ts` (2026-10-24) and is re-exported
// here so every existing import keeps working. It left because this module
// imports `db`, and therefore `pg`, so nothing importing it can be compiled and
// run without a database — which is how its password branch went unexamined
// until a real signup was refused by it. Same split as `ratingScale.ts` and
// `searchItem.ts`.
export { authErrorMessage } from "./authErrors";
