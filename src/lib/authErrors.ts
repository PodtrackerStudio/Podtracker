/**
 * Turning a Supabase auth error into something worth showing a person.
 *
 * Supabase's own messages are aimed at developers ("Invalid login credentials",
 * "User already registered"), and a couple leak more than we want to say — see
 * the note about email enumeration in the signup route.
 *
 * **Split out of `auth.ts` (2026-10-24) so it can be run on its own.** That
 * module imports `db`, and therefore `pg`, so nothing that imports it can be
 * compiled and exercised without a database — which is how the password branch
 * below went two months without anyone checking what it actually said. Same
 * split, same reason, as `ratingScale.ts` and `searchItem.ts`. `auth.ts`
 * re-exports this, so every existing import still works.
 *
 * Nothing here imports anything.
 */
export function authErrorMessage(message: string | undefined): string {
  const raw = (message ?? "").toLowerCase();

  if (raw.includes("invalid login credentials")) return "Incorrect email or password.";
  if (raw.includes("email not confirmed")) {
    return "Please confirm your email address first — check your inbox for the link.";
  }
  // **Two different rate limits, and they must not share a message.** Supabase
  // caps how many *emails a project may send*, separately from how many times a
  // person may try. When the mail cap is hit — which is what happens when a lot
  // of people sign up at once, exactly the situation a launch creates — the
  // account is usually created fine and only the email fails. Telling that
  // person "too many attempts" blames them for something the server did, and
  // sends them away retrying instead of waiting for an email that is coming.
  //
  // If this is showing up in the logs during a push for users, the fix is not
  // in this file: it is custom SMTP in the Supabase dashboard. See
  // `docs/supabase-smtp.md`.
  if (raw.includes("email rate limit") || (raw.includes("rate limit") && raw.includes("email"))) {
    return "We couldn't send that email just now — too many going out at once. Your account is fine; wait a minute and ask for the link again.";
  }
  if (raw.includes("rate limit") || raw.includes("too many requests")) {
    return "Too many attempts. Please wait a few minutes before trying again.";
  }
  // Supabase rejects addresses it considers unroutable, `example.com` among
  // them, so the obvious placeholder to test with is the one it refuses.
  if (raw.includes("invalid") && raw.includes("email")) {
    return "That email address wasn't accepted. Please use a real address you can receive mail at.";
  }
  if (raw.includes("already registered") || raw.includes("already been registered")) {
    return "An account with that email already exists.";
  }
  // Signups are switchable off per-project in the Supabase dashboard.
  if (raw.includes("signups not allowed") || raw.includes("signup is disabled")) {
    return "New accounts are disabled at the moment.";
  }

  // **A password rejection says which rule was broken.** This used to collapse
  // every one of them into "That password isn't allowed. Please pick another." —
  // which tells somebody to change something without saying what. Reported
  // 2026-10-23: a friend of Sasha's was refused with a password well over the
  // ten-character minimum and had no way to find out why. During a push for
  // users that is a lost signup each time it happens.
  //
  // **Being specific is safe here**, unlike the email cases above. Every message
  // below describes the password that was just typed, so it discloses nothing
  // the person did not supply themselves — there is no account to enumerate.
  //
  // Note these are Supabase's rules, not ours. `passwordPolicy.ts` runs first
  // and returns its own wording; anything reaching here was refused *after* our
  // checks passed, which is why the rules can disagree.
  if (raw.includes("password")) {
    // Leaked-password protection, which checks Have I Been Pwned. Length is not
    // the problem, so "pick a longer one" would send them round in circles —
    // this is the case most likely to confuse someone with a long password.
    if (raw.includes("known to be weak") || raw.includes("easy to guess") || raw.includes("pwned")) {
      return "That password has appeared in a known data breach, so it isn't safe to use. Please pick a different one.";
    }

    // Supabase's minimum is configured separately from `MIN_PASSWORD_LENGTH` and
    // can be set higher, in which case a password this app accepts is refused
    // there — with, until now, nothing on screen to explain the gap. The number
    // is lifted from Supabase's message so the two can never disagree.
    const minimum = raw.match(/at least (\d+) characters/)?.[1];
    if (minimum) return `Password needs to be at least ${minimum} characters.`;

    // Supabase states this one by listing every acceptable character, alphabet
    // and all, so its raw text is unusable on a form.
    if (raw.includes("one character of each") || raw.includes("should contain at least one character")) {
      return "Password needs a mix of upper and lower case letters, numbers and symbols.";
    }

    // Anything else, in Supabase's own words. Slightly developer-ish phrasing
    // beats "pick another" with no reason attached, and it means a rule added in
    // the dashboard tomorrow reaches the person instead of vanishing here.
    return message?.trim() || "That password isn't allowed. Please pick another.";
  }

  // Deliberately not "signing you in" — this is shared by signup, login and the
  // password routes, and the wrong verb sends people looking in the wrong place.
  return "Something went wrong. Please try again.";
}
