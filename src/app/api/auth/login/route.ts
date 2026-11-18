import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authErrorMessage } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { guardAuth, resetRateLimitDurable, tooManyRequests } from "@/lib/rateLimit";

export async function POST(request: Request) {
  // `?? {}`: a body of JSON `null` parses fine and then cannot be destructured.
  const { email, password } = (await request.json().catch(() => null)) ?? {};

  // Strings, not just truthy: `email.trim()` on a number threw, and the 500
  // came before the limiter, so it was free to repeat.
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    return NextResponse.json({ error: "Please enter both an email and a password." }, { status: 400 });
  }

  // Supabase rate-limits its own endpoints, but this route is still reachable
  // directly, and an attacker hammering it costs us the requests whether or not
  // Supabase eventually refuses them. Kept as the outer layer.
  const { result: limited, subjectKey } = await guardAuth(request, "login", email);
  if (!limited.allowed) return tooManyRequests(limited);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.user) {
    // 401 only for an actual credential rejection. Anything else — Supabase
    // unreachable, misconfigured keys, their outage — is a 503: the request was
    // fine, a dependency wasn't. Returning 401 for those repeats the mistake
    // this codebase already fixed once, where an outage was indistinguishable
    // from a wrong password.
    const rejected = /invalid login credentials|email not confirmed/i.test(error?.message ?? "");
    if (!rejected) console.error("[login] supabase error:", error?.message);

    // A machine-readable marker for the one case the form can actually help
    // with. Without it the client would have to string-match the prose from
    // `authErrorMessage`, which breaks the moment that wording is edited.
    //
    // Safe to disclose: reaching this means the password was correct, so it
    // tells the caller nothing they did not already supply.
    const unconfirmed = /email not confirmed/i.test(error?.message ?? "");

    return NextResponse.json(
      { error: authErrorMessage(error?.message), ...(unconfirmed && { code: "email-not-confirmed" }) },
      { status: rejected ? 401 : 503 },
    );
  }

  // Only the per-account count. The per-address one stands, or one working
  // login would wipe the record of guesses against every other account.
  if (subjectKey) await resetRateLimitDurable(subjectKey);

  // Supabase set the session cookies itself, through the cookie adapter in
  // `createSupabaseServerClient` — there is no token for this route to manage.
  // The profile lookup is only so the client knows where to navigate.
  const profile = await db.user.findUnique({
    where: { id: data.user.id },
    select: { username: true },
  }).catch(() => null);

  return NextResponse.json({ id: data.user.id, username: profile?.username ?? null });
}
