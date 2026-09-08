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

/**
 * Turns a Supabase auth error into something worth showing a person.
 *
 * Supabase's own messages are aimed at developers ("Invalid login credentials",
 * "User already registered"), and a couple leak more than we want to say — see
 * the note about email enumeration in the signup route.
 */
export function authErrorMessage(message: string | undefined): string {
  const raw = (message ?? "").toLowerCase();

  if (raw.includes("invalid login credentials")) return "Incorrect email or password.";
  if (raw.includes("email not confirmed")) {
    return "Please confirm your email address first — check your inbox for the link.";
  }
  if (raw.includes("rate limit")) {
    return "Too many attempts. Please wait a few minutes before trying again.";
  }
  // Supabase rejects addresses it considers unroutable, `example.com` among
  // them, so the obvious placeholder to test with is the one it refuses.
  if (raw.includes("invalid") && raw.includes("email")) {
    return "That email address wasn't accepted. Please use a real address you can receive mail at.";
  }
  if (raw.includes("already registered") || raw.includes("already been registered")) {
    return "An account with that email already exists.";
  }
  // Signups are switchable off per-project in the Supabase dashboard.
  if (raw.includes("signups not allowed") || raw.includes("signup is disabled")) {
    return "New accounts are disabled at the moment.";
  }
  if (raw.includes("password")) return "That password isn't allowed. Please pick another.";

  // Deliberately not "signing you in" — this is shared by signup, login and the
  // password routes, and the wrong verb sends people looking in the wrong place.
  return "Something went wrong. Please try again.";
}
