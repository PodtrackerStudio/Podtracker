/**
 * A small in-process rate limiter for the auth routes.
 *
 * **Know its limits before trusting it.** State lives in this process's memory,
 * so it resets on restart and is not shared between instances. On a single
 * long-running server it works. On Vercel, where each serverless instance has
 * its own memory, an attacker spread across instances gets one bucket per
 * instance — it raises the cost of brute force without eliminating it.
 *
 * It is here because the alternative was *nothing*, and nothing meant an
 * attacker could try passwords against `/api/auth/login` as fast as the network
 * allowed. A durable limiter needs shared storage (a Postgres table, or Redis);
 * Supabase applies its own limits to auth endpoints, so when that migration
 * lands this file should be deleted rather than upgraded.
 */

type Attempt = { count: number; firstAt: number; blockedUntil: number };

const buckets = new Map<string, Attempt>();

/** Stops a long-running process accumulating a bucket per attacker IP forever. */
const MAX_BUCKETS = 10_000;

function sweep(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, attempt] of buckets) {
    if (attempt.blockedUntil < now && now - attempt.firstAt > 60 * 60 * 1000) buckets.delete(key);
  }
  // Still full of live entries — drop the oldest rather than grow without
  // bound. Under a distributed attack this degrades to no limiting, which is
  // the same as before this file existed, rather than to an outage.
  if (buckets.size >= MAX_BUCKETS) {
    const oldest = [...buckets.entries()].sort((a, b) => a[1].firstAt - b[1].firstAt).slice(0, MAX_BUCKETS / 2);
    for (const [key] of oldest) buckets.delete(key);
  }
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * Records an attempt and says whether it may proceed.
 *
 * @param key       what to count against — see `clientKey`
 * @param limit     attempts permitted per window
 * @param windowMs  the window
 * @param blockMs   how long to lock out after the limit is hit
 */
export function rateLimit(
  key: string,
  { limit, windowMs, blockMs }: { limit: number; windowMs: number; blockMs: number },
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);

  if (existing && existing.blockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((existing.blockedUntil - now) / 1000) };
  }

  // No bucket, or the window has rolled over — start a fresh one.
  if (!existing || now - existing.firstAt > windowMs) {
    buckets.set(key, { count: 1, firstAt: now, blockedUntil: 0 });
    return { allowed: true };
  }

  existing.count += 1;

  if (existing.count > limit) {
    existing.blockedUntil = now + blockMs;
    return { allowed: false, retryAfterSeconds: Math.ceil(blockMs / 1000) };
  }

  return { allowed: true };
}

/** Clears a bucket — called after a *successful* login so one shared office
 *  IP getting a password wrong a few times doesn't lock out the next person. */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/**
 * Identifies the caller for limiting purposes.
 *
 * `x-forwarded-for` is set by the proxy in front of the app; its first entry is
 * the client. It is trivially spoofed when nothing trusted sets it, which is why
 * the limit is keyed on **IP plus the account being targeted** — an attacker
 * rotating the header still collides on the account they are attacking, and one
 * rotating accounts still collides on their IP.
 */
export function clientKey(request: Request, scope: string, subject?: string): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return `${scope}:${ip}:${subject?.trim().toLowerCase() ?? ""}`;
}

/** Login and change-password: slow, because each attempt is a password guess. */
export const AUTH_LIMIT = { limit: 8, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 };

/** Signup: looser, since a person filling in a form legitimately retries, but
 *  tight enough to stop bulk account creation from one address. */
export const SIGNUP_LIMIT = { limit: 5, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 };

export const RATE_LIMITED_MESSAGE =
  "Too many attempts. Please wait a few minutes before trying again.";
