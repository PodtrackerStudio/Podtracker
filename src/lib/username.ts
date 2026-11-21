/**
 * Rules for choosing a username, shared by signup and Settings.
 *
 * **Printable ASCII only.** Usernames are how people recognise each other, and
 * with any Unicode allowed, a Cyrillic "а" or an invisible character makes a
 * name that looks exactly like someone else's. Spaces and ASCII punctuation
 * stay allowed because existing accounts use them (13 of 53 on 2026-11-21);
 * none used anything outside ASCII.
 *
 * **Some names are reserved.** `sasha` renders the demo profile at
 * `/user/sasha` (see `DEMO_USERNAME`), so whoever registered it would have their
 * real profile replaced by the demo and could pass as the site's owner. The
 * others are names people would reasonably read as official.
 *
 * Uniqueness is case-insensitive too, but that is a database question, asked
 * where the database is — see the signup and account routes.
 */
const RESERVED = new Set(["sasha", "admin", "administrator", "podtracker", "support", "moderator", "staff"]);

const PRINTABLE_ASCII = /^[\x20-\x7E]+$/;

/** The reason this username can't be chosen, or null if it can. */
export function usernameProblem(username: string): string | null {
  if (!PRINTABLE_ASCII.test(username)) {
    return "Usernames can only use English letters, numbers, spaces and standard punctuation.";
  }
  // Worded as "taken" rather than "reserved": it is the same outcome for the
  // person choosing, and no list of protected names needs advertising.
  if (RESERVED.has(username.toLowerCase())) return "That username is already taken.";
  return null;
}
