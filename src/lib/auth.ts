import { cache } from "react";
import { db } from "./db";
import { createSupabaseServerClient } from "./supabase/server";

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
  if (raw.includes("email rate limit") || raw.includes("rate limit")) {
    return "Too many attempts. Please wait a few minutes before trying again.";
  }
  if (raw.includes("password")) return "That password isn't allowed. Please pick another.";

  return "Something went wrong signing you in. Please try again.";
}
