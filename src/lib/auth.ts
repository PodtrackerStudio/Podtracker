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
 * **`getClaims`, never `getSession`.** `getSession` reads the cookie and trusts
 * it, so a forged cookie would authenticate. `getClaims` verifies the token's
 * signature. This project signs with an asymmetric key (ES256), so that
 * check runs here against Supabase's public key, which is fetched once and
 * cached per process. No network call per request.
 *
 * Until 2026-11-06 this used `getUser`, which asks Supabase's server on every
 * call. Together with the proxy doing the same, every page and API request made
 * two round trips to Supabase before running any code of its own.
 *
 * **The trade-off:** a valid token is trusted until it expires (an hour by
 * default) even if the session was revoked in the meantime, for example by
 * "sign out other devices". That is what Supabase recommends for page renders.
 * The routes where it matters check with Supabase's server themselves:
 * password change and reset call `getUser`, and `updateUser` validates
 * server-side.
 *
 * Wrapped in React's `cache` so the several components that ask "who is signed
 * in?" during one render share a single verification instead of each making
 * their own round trip to Supabase.
 */
/** Per server instance; see the email sync below. */
const emailSyncFailedAt = new Map<string, number>();
const EMAIL_SYNC_BACKOFF_MS = 60 * 60 * 1000;

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
  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : data?.claims;
  if (!claims?.sub) return null;

  const authUser = { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };

  // Explicit field list, not `select: undefined` — this shape is what all 29
  // callers see, and several of them hand it to Client Components. Nothing
  // secret should be able to ride along.
  const profile = await db.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      createdAt: true,
      // Three short strings, read here because the nav, which already calls
      // this on every page, writes the person's theme into the page.
      themeMain: true,
      themeAccent: true,
      themeFont: true,
      // Not `avatarUrl`, `bio`, `longBio` or `externalLink`. This runs on every
      // page and API call, and the avatar alone was a data URI of up to 3.9 MB
      // pulled from the database each time, for pages that never used it. The
      // two that need them (Settings, list owner) ask for them, or use
      // `avatarSrc`.
    },
  });

  // Supabase owns the email. After a confirmed change, bring the profile's copy
  // into line the first time the person is seen. See `api/account/route.ts`.
  // A failure here only delays the copy, so it never blocks the request.
  if (
    profile &&
    authUser.email &&
    authUser.email.toLowerCase() !== profile.email.toLowerCase() &&
    (emailSyncFailedAt.get(profile.id) ?? 0) < Date.now() - EMAIL_SYNC_BACKOFF_MS
  ) {
    try {
      await db.user.update({ where: { id: profile.id }, data: { email: authUser.email } });
      profile.email = authUser.email;
      emailSyncFailedAt.delete(profile.id);
    } catch (error) {
      // Typically P2002: another profile already holds the address. That won't
      // fix itself on the next request, and retrying on *every* page and API
      // call cost a write plus a log line each time. Try again in an hour.
      emailSyncFailedAt.set(profile.id, Date.now());
      console.error("[auth] could not sync the profile email:", error);
    }
  }

  return profile;
});

// `authErrorMessage` moved to `authErrors.ts` (2026-10-24) and is re-exported
// here so every existing import keeps working. It left because this module
// imports `db`, and therefore `pg`, so nothing importing it can be compiled and
// run without a database — which is how its password branch went unexamined
// until a real signup was refused by it. Same split as `ratingScale.ts` and
// `searchItem.ts`.
export { authErrorMessage } from "./authErrors";
