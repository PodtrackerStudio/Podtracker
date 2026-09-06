/**
 * One password policy, shared by signup and the change-password route so the
 * two cannot drift. Previously both hardcoded `length < 6` separately.
 *
 * **This only applies to passwords being set.** Existing accounts with shorter
 * passwords keep working — the rule is enforced where a password is chosen, not
 * where one is checked, so nobody is locked out by tightening it.
 */

export const MIN_PASSWORD_LENGTH = 10;

/**
 * The handful of passwords that turn up first in every credential-stuffing
 * list. This is not a substitute for a full breach corpus (that is what Have I
 * Been Pwned's range API is for, and is worth adding later) — it exists to stop
 * the small set that a bot will try in its first few attempts.
 *
 * Compared case-insensitively.
 */
const BANNED_PASSWORDS = new Set(
  [
    "password", "password1", "password123", "passw0rd", "p@ssword", "p@ssw0rd",
    "123456", "1234567", "12345678", "123456789", "1234567890", "12345678910",
    "qwerty", "qwerty123", "qwertyuiop", "asdfghjkl", "1q2w3e4r", "zaq12wsx",
    "letmein", "welcome", "welcome1", "iloveyou", "monkey", "dragon",
    "sunshine", "princess", "football", "baseball", "trustno1", "superman",
    "admin", "administrator", "root", "guest", "changeme", "secret",
    "abc123", "abcd1234", "aaaaaaaa", "11111111", "00000000",
    "podtracker", "podcast", "podcasts",
  ].map((p) => p.toLowerCase()),
);

export type PasswordCheck = { ok: true } | { ok: false; error: string };

/**
 * Validates a password someone is trying to set.
 *
 * `identifiers` are the email and username being registered — a password that
 * is just your own email is trivially guessable by anyone who knows it, and
 * that is precisely the person attacking the account.
 */
export function checkPassword(password: string, identifiers: (string | undefined)[] = []): PasswordCheck {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Password needs to be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  // 72 bytes is bcrypt's hard limit: anything past it is silently ignored, so a
  // longer password would be truncated rather than rejected, which would make
  // two different passwords equivalent. Rejecting is the honest behaviour.
  if (Buffer.byteLength(password, "utf8") > 72) {
    return { ok: false, error: "Password is too long — 72 characters at most." };
  }

  const lower = password.toLowerCase();

  if (BANNED_PASSWORDS.has(lower)) {
    return { ok: false, error: "That password is one of the most commonly used ones. Please pick another." };
  }

  for (const identifier of identifiers) {
    const value = identifier?.trim().toLowerCase();
    if (!value) continue;
    // Both directions: "phillip@podtracker.studio" as a password, and "phillip"
    // when the email is phillip@…
    if (lower === value || lower === value.split("@")[0]) {
      return { ok: false, error: "Your password can't be your email or username." };
    }
  }

  // A single repeated character passes the length check but is trivially
  // guessed; "aaaaaaaaaa" would otherwise satisfy a 10-character minimum.
  if (new Set(lower).size < 4) {
    return { ok: false, error: "Password needs a few different characters." };
  }

  return { ok: true };
}
