import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authErrorMessage } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkPassword } from "@/lib/passwordPolicy";
import { rateLimit, clientKey, SIGNUP_LIMIT, RATE_LIMITED_MESSAGE } from "@/lib/rateLimit";
import { reportDatabaseFailure } from "@/lib/dbError";

/**
 * Create an account.
 *
 * Two systems, in this order, and the order matters:
 *   1. our `User` table — check the username is free
 *   2. Supabase — create the credential, which mints the id
 *   3. our `User` table — write the profile under that id
 *
 * The username check comes first because it is the failure that actually
 * happens. If Supabase created the credential first and step 3 then failed on a
 * taken username, the person would own an auth account with no profile: unable
 * to use the site, and unable to sign up again because their email is taken.
 * Undoing that needs the service-role key, which this app deliberately does not
 * hold. Checking first makes the bad state unreachable in the common case.
 */
export async function POST(request: Request) {
  const { email, username, password } = await request.json().catch(() => ({}));

  if (!email?.trim() || !username?.trim() || !password) {
    return NextResponse.json({ error: "Please fill in every field." }, { status: 400 });
  }

  const limited = rateLimit(clientKey(request, "signup"), SIGNUP_LIMIT);
  if (!limited.allowed) {
    return NextResponse.json({ error: RATE_LIMITED_MESSAGE }, {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSeconds) },
    });
  }

  // Our policy, not Supabase's — theirs is a 6-character minimum by default.
  const policy = checkPassword(password, [email, username]);
  if (!policy.ok) {
    return NextResponse.json({ error: policy.error }, { status: 400 });
  }

  const cleanEmail = email.trim();
  const cleanUsername = username.trim();

  try {
    const taken = await db.user.findUnique({ where: { username: cleanUsername }, select: { id: true } });
    if (taken) {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password });

    if (error) {
      // The raw message goes to the server log, always. `authErrorMessage`
      // deliberately generalises for the person reading the form, and the first
      // time this fired in anger the useful half — Supabase's own wording — was
      // nowhere to be found, which made a five-second diagnosis take a round
      // trip.
      console.error("[signup] supabase rejected:", error.status, error.message);
      return NextResponse.json({ error: authErrorMessage(error.message) }, { status: 400 });
    }
    if (!data.user) {
      return NextResponse.json({ error: "Could not create that account. Please try again." }, { status: 400 });
    }

    // `session` is null when Supabase is set to confirm email addresses: the
    // credential exists but nobody is signed in until the link is clicked. The
    // profile row is still written now, so it is waiting when they return.
    const needsEmailConfirmation = data.session === null;

    // Supabase's id, not a generated one — see the note on `User.id`.
    await db.user.create({
      data: {
        id: data.user.id,
        email: cleanEmail,
        username: cleanUsername,
        displayName: cleanUsername,
      },
    });

    return NextResponse.json({
      id: data.user.id,
      username: cleanUsername,
      needsEmailConfirmation,
    });
  } catch (error) {
    return NextResponse.json({ error: reportDatabaseFailure("signup", error) }, { status: 503 });
  }
}
