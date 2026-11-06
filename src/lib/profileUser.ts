/**
 * The columns a public profile page shows, for `db.user.findUnique` on
 * `/user/[username]` and its tabs.
 *
 * Those pages used to load the whole row. That meant the email address, never
 * shown, and `avatarUrl`, a data URI of up to 3.9 MB, pulled from the database
 * on every profile view and every tab switch. The picture now comes from
 * `avatarSrc(id)` (`src/lib/avatar.ts`), so the column is never needed here.
 */
export const PUBLIC_PROFILE_SELECT = {
  id: true,
  username: true,
  displayName: true,
  bio: true,
  longBio: true,
  externalLink: true,
  createdAt: true,
} as const;
