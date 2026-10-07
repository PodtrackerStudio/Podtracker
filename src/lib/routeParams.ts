/**
 * Turning a URL segment back into the value it stands for.
 *
 * **Why this exists.** Next hands a dynamic segment over exactly as it appears
 * in the URL, percent-escapes and all. Every `/user/[username]` route took that
 * string and passed it straight to `findUnique({ where: { username } })`, so a
 * member whose username contains a space was looked up as
 * `Palm%20Beach%20Pete`, matched nothing, and got "No user found" — on their
 * profile, their reviews, their lists, their diary, everything. Reported
 * 2026-10-07, and the error message printed the escapes, which is what gave it
 * away.
 *
 * Nothing was wrong with the links: search builds `/user/<username>` correctly
 * and the browser escapes the space on the way out, as it must. The missing
 * half was undoing that on the way in.
 *
 * Signup does not restrict what a username may contain — only that it is
 * non-empty, trimmed and unique — so spaces are legal and real accounts have
 * them. That is a separate question from this bug, and changing it now would
 * strand the people who already signed up.
 */

/**
 * Decodes a route segment, surviving input that isn't valid encoding.
 *
 * `decodeURIComponent` throws `URIError` on a stray `%` — so `/user/%` would
 * have turned a 404 into a 500. Malformed input is passed through untouched
 * instead: it will not match a username either, which is the same honest "no
 * such user" answer, without the crash.
 */
export function decodeRouteParam(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * A username as stored, from the segment in the URL.
 *
 * Trimmed to match how signup stores it, so a trailing space in a hand-typed
 * URL still finds the account.
 */
export function usernameFromParam(raw: string): string {
  return decodeRouteParam(raw).trim();
}

/**
 * The reverse: a username as it must appear inside a path.
 *
 * Needed because the value is decoded now — building `/user/${username}` from
 * "Palm Beach Pete" would otherwise emit a path with raw spaces in it. Browsers
 * paper over that; canonical tags, link previews and anything parsing the URL
 * do not.
 */
export function usernameToPath(username: string): string {
  return encodeURIComponent(username);
}
