import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * A user's profile picture as an image, for `avatarSrc` in `src/lib/avatar.ts`.
 *
 * - **Cached** for a minute in the browser and on Vercel's CDN, with an ETag,
 *   so repeat views cost a 304 and a changed picture shows within a minute.
 * - **Only raster types are served.** An SVG avatar could carry script, so
 *   anything that isn't PNG, JPEG, WebP or GIF gets the default picture, and
 *   `nosniff` stops a browser second-guessing the type.
 * - **No user, no picture, or a malformed one** all fall back to the default.
 *   This is an `<img>` source, so an error page would only show as a broken
 *   image.
 *
 * Public by design: profile pictures already appear on public profiles.
 */

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const DATA_URI = /^data:([a-z]+\/[a-z0-9.+-]+);base64,(.+)$/i;
const CACHE = "public, max-age=60, s-maxage=60, stale-while-revalidate=3600";

function fallback(request: Request) {
  return NextResponse.redirect(new URL("/default-avatar.webp", request.url), {
    status: 307,
    headers: { "Cache-Control": CACHE },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!userId || userId.length > 64) return fallback(request);

  const user = await db.user
    .findUnique({ where: { id: userId }, select: { avatarUrl: true } })
    .catch((error: unknown) => {
      console.error("[avatar] lookup failed:", error);
      return null;
    });

  const match = user?.avatarUrl ? DATA_URI.exec(user.avatarUrl) : null;
  const type = match?.[1].toLowerCase();
  if (!match || !type || !ALLOWED.has(type)) return fallback(request);

  const etag = `"${createHash("sha1").update(match[2]).digest("base64url").slice(0, 16)}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": CACHE } });
  }

  const bytes = Buffer.from(match[2], "base64");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": type,
      "Content-Length": String(bytes.length),
      "Cache-Control": CACHE,
      ETag: etag,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
