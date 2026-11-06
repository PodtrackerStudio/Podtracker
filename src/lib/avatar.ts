/**
 * Where a user's profile picture is served from.
 *
 * **Why pages link to this instead of embedding the picture.** Avatars are
 * stored as data URIs in `User.avatarUrl`. Rendering that string as an `<img
 * src>` put the whole image inside the HTML, and again inside the RSC payload,
 * on every page that showed it. With phone photos of up to 3.9 MB, `/home`'s
 * eight review cards could carry tens of megabytes, re-sent on every visit
 * because base64 doesn't compress or cache. `/api/avatar/<id>` serves the same
 * bytes as an ordinary cached image, and pages no longer select the column.
 *
 * Imports nothing, so client components can use it.
 */
export function avatarSrc(userId: string): string {
  return `/api/avatar/${encodeURIComponent(userId)}`;
}
