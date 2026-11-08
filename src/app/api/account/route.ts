import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, authErrorMessage } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { rateLimit, clientKey, AUTH_LIMIT, RATE_LIMITED_MESSAGE } from "@/lib/rateLimit";
import { siteOrigin } from "@/lib/siteUrl";

/**
 * Save Account Settings → Display.
 *
 * **Email is not written here.** Until 2026-11-06 this route copied a changed
 * email straight into our `User` table, while Supabase, which owns the login,
 * kept the old one. Two things followed:
 *
 *   - Changing your password afterwards always failed with "Current password is
 *     incorrect", because that check signed in with the profile's email, which
 *     Supabase had never heard of.
 *   - Anyone could put someone else's address on their profile. When that person
 *     later signed up, our unique constraint refused them, after Supabase had
 *     already created their login.
 *
 * Now a new address goes to Supabase, which emails a confirmation link. The
 * profile copy catches up in `getCurrentUser` once Supabase has switched over,
 * so the two can only disagree until the link is clicked.
 */

/** Generous: the longest values in use on 2026-11-06 were 23, 23, none, 46. */
const LIMITS = { username: 40, displayName: 80, externalLink: 200, bio: 500 } as const;
const FIELD_NAMES = { username: "username", displayName: "display name", externalLink: "link", bio: "bio" } as const;

/** Data URIs only, because that is what the form sends. */
const AVATAR_PATTERN = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;

/**
 * About 225 KB of image. The settings form now shrinks a photo to 256px before
 * sending it, which comes to roughly 20–40 KB. Before that, avatars of up to
 * 3.9 MB were stored and then sent inside every page that showed them.
 */
const AVATAR_MAX_CHARS = 300_000;

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "That request couldn't be read." }, { status: 400 });
  }

  const fields = {
    username: str(body.username),
    displayName: str(body.displayName),
    externalLink: str(body.externalLink),
    bio: str(body.bio),
  };
  const email = str(body.email);
  const avatarUrl: unknown = body.avatarUrl;

  if (!fields.username || !email) {
    return NextResponse.json({ error: "Username and email can't be empty." }, { status: 400 });
  }
  for (const key of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    const value = fields[key];
    if (value && value.length > LIMITS[key]) {
      return NextResponse.json(
        { error: `That ${FIELD_NAMES[key]} is too long (${LIMITS[key]} characters at most).` },
        { status: 400 },
      );
    }
  }
  if (avatarUrl !== undefined && avatarUrl !== null) {
    if (typeof avatarUrl !== "string" || !AVATAR_PATTERN.test(avatarUrl)) {
      return NextResponse.json({ error: "That picture couldn't be used. Try a PNG, JPEG, WebP or GIF." }, { status: 400 });
    }
    if (avatarUrl.length > AVATAR_MAX_CHARS) {
      return NextResponse.json({ error: "That picture is too large. Try a smaller one." }, { status: 400 });
    }
  }

  const username = fields.username;
  const emailChanged = email.toLowerCase() !== user.email.toLowerCase();

  try {
    const existing = await db.user.findFirst({
      where: {
        id: { not: user.id },
        OR: [
          { username },
          ...(emailChanged ? [{ email: { equals: email, mode: "insensitive" as const } }] : []),
        ],
      },
      select: { username: true },
    });
    if (existing) {
      const which = existing.username === username ? "username" : "email";
      return NextResponse.json({ error: `That ${which} is already taken.` }, { status: 409 });
    }

    if (emailChanged) {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.updateUser(
        { email },
        { emailRedirectTo: `${siteOrigin(request)}/auth/confirm?type=email_change&next=/settings` },
      );
      if (error) {
        console.error("[account] email change rejected:", error.status, error.message);
        return NextResponse.json({ error: authErrorMessage(error.message) }, { status: 400 });
      }
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        username,
        displayName: fields.displayName || username,
        externalLink: fields.externalLink || null,
        bio: fields.bio || null,
        ...(avatarUrl !== undefined ? { avatarUrl: (avatarUrl as string | null) || null } : {}),
      },
      select: { username: true },
    });

    return NextResponse.json({ username: updated.username, ...(emailChanged && { emailPending: email }) });
  } catch (error) {
    // Two people claiming the same username between the check and the write.
    if ((error as { code?: string })?.code === "P2002") {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }
    console.error("[account] save failed:", error);
    return NextResponse.json({ error: "We couldn't save that just now. Please try again." }, { status: 503 });
  }
}

/**
 * Delete the signed-in user's account, permanently.
 *
 * Until 2026-11-07 there was no way to do this. Terms §10 and the Privacy
 * Policy both promised deletion on request, and the only way to honour that
 * was Sasha editing Supabase by hand. This is that promise, built.
 *
 * ## An account lives in two systems, and both halves must go
 *
 * The login (email, password, session) is Supabase's. The profile and
 * everything hanging off it is ours. Deleting one and not the other leaves a
 * broken account in a different way each time, so this refuses to start unless
 * it can finish — see the `isSupabaseAdminConfigured` check below.
 *
 * ## Why our database goes first
 *
 * If the auth user went first and our delete then failed, the person could no
 * longer log in while every review, list and diary entry of theirs stayed
 * public — the privacy promise broken, and no way for them to retry. The other
 * order fails safe: their data is gone, which is what was actually promised,
 * and a stranded login is something we can clear up and they can tell us
 * about. So: database, then Supabase.
 *
 * ## One delete is enough
 *
 * Every relation to `User` in `schema.prisma` is `onDelete: Cascade`, so a
 * single `user.delete` takes the ratings, episode ratings, log entries, lists
 * and their items, follows in both directions, podcast follows, favorites,
 * comments and likes with it. No transaction is needed and none is used —
 * Postgres does the cascade in one statement. If a relation is ever added
 * **without** `onDelete: Cascade`, this route starts failing with a foreign
 * key error rather than silently orphaning rows, which is the right way round.
 */
export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  // Same limit as the password form: this takes a password and is therefore
  // something to guess at, and it is the most destructive call on the site.
  const limitKey = clientKey(request, "delete-account", user.id);
  const limited = rateLimit(limitKey, AUTH_LIMIT);
  if (!limited.allowed) {
    return NextResponse.json({ error: RATE_LIMITED_MESSAGE }, {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSeconds) },
    });
  }

  // Checked before anything is touched. Half-deleting is worse than not
  // starting: see the note above. The same shape as /api/donate's Stripe
  // check — the code is fine, the key is simply not set in this environment.
  if (!isSupabaseAdminConfigured) {
    console.error(
      "[account] SUPABASE_SERVICE_ROLE_KEY is not set, so account deletion is refused. " +
        "Nothing was deleted. Add it in Vercel (Project → Settings → Environment Variables) " +
        "and in .env locally — Supabase → Project Settings → API → service_role.",
    );
    return NextResponse.json(
      {
        error:
          "Account deletion isn't switched on yet. Nothing has been deleted — " +
          "email podtracker13@gmail.com and we'll do it by hand.",
      },
      { status: 503 },
    );
  }

  const { password, confirmUsername } = await request.json().catch(() => ({}));

  if (!password) {
    return NextResponse.json({ error: "Please enter your password." }, { status: 400 });
  }
  // Proves intent, the way GitHub asks you to type a repository's name. The
  // password alone proves who you are, not that you meant to do this — a
  // signed-in browser with a saved password is one stray click otherwise.
  if (typeof confirmUsername !== "string" || confirmUsername.trim() !== user.username) {
    return NextResponse.json(
      { error: `Type your username exactly — ${user.username} — to confirm.` },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();

  // Supabase's copy of the address, not the profile's: the two differ while an
  // email change waits for its link. Signing in with the profile's copy would
  // fail and read as a wrong password. Same reasoning as the password route.
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser?.email) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: authUser.email,
    password,
  });
  if (verifyError) {
    return NextResponse.json({ error: "That password is incorrect." }, { status: 403 });
  }

  // ── Past this line things are destroyed. ──

  try {
    await db.user.delete({ where: { id: user.id } });
  } catch (error) {
    // P2025: already gone. Someone double-clicked, or it was deleted by hand.
    // Not an error from the person's point of view — carry on and clear the
    // login, which is the half that would otherwise be left behind.
    if ((error as { code?: string })?.code !== "P2025") {
      console.error("[account] delete failed, nothing removed:", error);
      return NextResponse.json(
        { error: "We couldn't delete your account just now. Nothing has been removed — please try again." },
        { status: 503 },
      );
    }
  }

  const admin = createSupabaseAdminClient();
  const { error: authDeleteError } = await admin.auth.admin.deleteUser(user.id);

  if (authDeleteError) {
    // Their data is gone, which is what was promised, but the login survives —
    // so that address cannot be signed up again until someone clears it. Loud,
    // with the id, because fixing it means finding this user in the dashboard.
    console.error(
      `[account] profile ${user.id} was deleted but its Supabase login was not: ` +
        `${authDeleteError.message}. Delete the user with that id in ` +
        `Supabase → Authentication → Users, or that email cannot sign up again.`,
    );
    return NextResponse.json(
      {
        ok: true,
        warning:
          "Your profile and everything in it has been deleted. One part of your login " +
          "couldn't be removed automatically — email podtracker13@gmail.com and we'll " +
          "finish it off. You won't be able to sign up with the same address until then.",
      },
      { status: 200 },
    );
  }

  // Clears this browser's cookies. The user it referred to no longer exists,
  // so Supabase may well reject the call — the cookies are cleared either way,
  // and there is nothing left to fail at.
  await supabase.auth.signOut().catch(() => null);

  return NextResponse.json({ ok: true });
}
