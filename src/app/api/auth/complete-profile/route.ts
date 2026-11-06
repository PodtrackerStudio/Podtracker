import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Creates the `User` profile row for someone who signed in with Google.
 *
 * **Why this exists at all.** Signing up with email and password creates both
 * halves of an account in one request: Supabase mints the credential and
 * `/api/auth/signup` writes the profile row under the id it returns. Google
 * gives us the first half only. It hands back a verified email and a display
 * name and **no username** — and `User.username` is required and unique, so
 * there is nothing to write until the person picks one.
 *
 * Until they do they are in a genuinely odd state: Supabase considers them
 * signed in, while `getCurrentUser` looks up the profile row, finds nothing and
 * reports them signed out. Every page would treat them as a visitor. `/welcome`
 * is the only way out of that, and this is what it posts to.
 *
 * **The age and terms confirmation is captured here too.** Google sign-in never
 * touches the signup form, so the checkbox added on 2026-11-04 would simply be
 * skipped — an account created without the confirmation every other account
 * makes. Same strict `!== true` check as `/api/auth/signup`.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Sign-in is not configured." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  // `getUser`, never `getSession` — the same rule as `getCurrentUser`. This
  // request creates a row keyed to whoever it says is signed in, so the token
  // has to be verified with Supabase rather than read out of a cookie.
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "You're not signed in." }, { status: 401 });
  }

  const { username, agreedToTerms } = await request.json().catch(() => ({}));

  if (!username?.trim()) {
    return NextResponse.json({ error: "Please choose a username." }, { status: 400 });
  }
  if (agreedToTerms !== true) {
    return NextResponse.json(
      { error: "Please confirm your age and that you've read the terms." },
      { status: 400 },
    );
  }

  const cleanUsername = String(username).trim();
  const email = authUser.email;

  if (!email) {
    // Google always returns one, but the column is required and unique, so a
    // provider that did not would otherwise fail deep inside Prisma with
    // nothing useful to show.
    return NextResponse.json(
      { error: "Your Google account didn't share an email address, which Podtracker needs." },
      { status: 400 },
    );
  }

  try {
    // Already finished? Say so rather than failing on the primary key — this is
    // reachable by double-submitting the form.
    const existingProfile = await db.user.findUnique({
      where: { id: authUser.id },
      select: { username: true },
    });
    if (existingProfile) {
      return NextResponse.json({ username: existingProfile.username, alreadyExisted: true });
    }

    const takenName = await db.user.findUnique({ where: { username: cleanUsername }, select: { id: true } });
    if (takenName) {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }

    // **The collision that matters.** `User.email` is unique. If this address
    // already has a profile under a *different* id, there is an existing
    // password account and Supabase minted a second, separate identity rather
    // than linking them. Creating a row would fail on the unique index; worse,
    // silently making a second account would split somebody's ratings and
    // reviews across two profiles with no way back.
    const takenEmail = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (takenEmail) {
      return NextResponse.json(
        {
          error:
            "There's already an account with this email address. Sign in with your password instead.",
          code: "email-has-password-account",
        },
        { status: 409 },
      );
    }

    await db.user.create({
      data: {
        id: authUser.id,
        email,
        username: cleanUsername,
        // Google's own name if it gave one, otherwise the username — the same
        // default `/api/auth/signup` uses.
        displayName:
          (authUser.user_metadata?.full_name as string | undefined)?.trim() || cleanUsername,
        avatarUrl: (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
      },
    });

    return NextResponse.json({ username: cleanUsername });
  } catch (error) {
    // Two people claiming the same username can both pass the check above
    // before either writes. The database constraint is the real guarantee, so
    // the loser is told the truth rather than "something went wrong".
    if ((error as { code?: string })?.code === "P2002") {
      const target = (error as { meta?: { target?: string[] | string } })?.meta?.target;
      const fields = Array.isArray(target) ? target.join(",") : String(target ?? "");
      if (fields.includes("username")) {
        return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
      }
      return NextResponse.json(
        { error: "There's already an account with this email address.", code: "email-has-password-account" },
        { status: 409 },
      );
    }
    console.error("[complete-profile] failed:", error);
    return NextResponse.json({ error: "Could not finish setting up your account." }, { status: 503 });
  }
}
