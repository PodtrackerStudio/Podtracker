/**
 * What to tell someone when the database is unreachable.
 *
 * Kept in one place because login and signup must say the same thing, and
 * because the wrong message here is actively harmful: before this existed, a
 * database outage surfaced on the signup form as the generic *"Something went
 * wrong. Please try again."* — which reads as "your details are bad, try
 * different ones". People retype their password, fail again, and conclude the
 * site is broken in a way they caused.
 *
 * The wording says it is our side rather than theirs, and does not mention
 * Postgres, Neon or connection strings — those are for the server log, not for
 * whoever is trying to sign up.
 */
export const DB_UNREACHABLE_MESSAGE =
  "We couldn't reach our database, so that didn't go through. This is a problem on our end, not with what you entered — please try again in a moment.";

/**
 * Logs the real error where a developer will see it, and returns the message
 * safe to show a user.
 *
 * `label` identifies the route, so a server log line points at the failing
 * endpoint without the caller having to format anything.
 */
export function reportDatabaseFailure(label: string, error: unknown): string {
  console.error(`[${label}] database unreachable:`, error);
  return DB_UNREACHABLE_MESSAGE;
}
