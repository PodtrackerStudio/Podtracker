import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, authErrorMessage } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
