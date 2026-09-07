import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authErrorMessage } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit, resetRateLimit, clientKey, AUTH_LIMIT, RATE_LIMITED_MESSAGE } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const { email, password } = await request.json().catch(() => ({}));

  if (!email?.trim() || !password) {
    return NextResponse.json({ error: "Please enter both an email and a password." }, { status: 400 });
  }

  // Supabase rate-limits its own endpoints, but this route is still reachable
  // directly, and an attacker hammering it costs us the requests whether or not
  // Supabase eventually refuses them. Kept as the outer layer.
  const limitKey = clientKey(request, "login", email);
  const limited = rateLimit(limitKey, AUTH_LIMIT);
  if (!limited.allowed) {
    return NextResponse.json({ error: RATE_LIMITED_MESSAGE }, {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSeconds) },
    });
  }

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
    return NextResponse.json(
      { error: authErrorMessage(error?.message) },
      { status: rejected ? 401 : 503 },
    );
  }

  resetRateLimit(limitKey);

  // Supabase set the session cookies itself, through the cookie adapter in
  // `createSupabaseServerClient` — there is no token for this route to manage.
  // The profile lookup is only so the client knows where to navigate.
  const profile = await db.user.findUnique({
    where: { id: data.user.id },
    select: { username: true },
  }).catch(() => null);

  return NextResponse.json({ id: data.user.id, username: profile?.username ?? null });
}
