/**
 * Rate limiting, in two strengths.
 *
 * **`rateLimit` — in this process's memory.** Resets on restart and is not
 * shared between instances, so on Vercel an attacker spread across instances
 * gets one bucket per instance. Cheap, and good enough to stop one account or
 * one address hammering an ordinary write route.
 *
 * **`rateLimitDurable` — in Postgres (the `RateLimit` table).** One atomic
 * statement per attempt, shared by every instance and surviving restarts. Used
 * where each attempt is a password guess or sends an email. If the table is
 * missing or the database is unreachable it falls back to the in-memory
 * limiter rather than failing the request: a limiter must never be the reason
 * somebody cannot log in.
 *
 * **`guardAuth` counts twice** — once per address and once per account — as two
 * separate buckets. The old single `ip:account` key reset every time an
 * attacker changed address, so there was no per-account limit at all, despite
 * the comment that said there was.
 */
import { db } from "./db";

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
 * The caller's address. `x-forwarded-for` is set by the proxy in front of the
 * app (Vercel overwrites whatever the client sent); its first entry is the
 * client. Anywhere nothing trusted sets it, it is trivially spoofed — which is
 * why anything that matters is also counted per account, see `guardAuth`.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

/** One bucket per scope + address (+ subject). For the in-memory limiter. */
export function clientKey(request: Request, scope: string, subject?: string): string {
  return `${scope}:${clientIp(request)}:${typeof subject === "string" ? subject.trim().toLowerCase() : ""}`;
}

type LimitOptions = { limit: number; windowMs: number; blockMs: number };

/**
 * The durable limiter. One statement, so two instances counting the same key
 * at the same moment cannot both read "under the limit".
 */
export async function rateLimitDurable(key: string, opts: LimitOptions): Promise<RateLimitResult> {
  // Keys are built from request input (an email address); bounded so one
  // cannot be megabytes long.
  const k = key.slice(0, 300);
  try {
    const rows = await db.$queryRaw<{ blocked_for: number | null }[]>`
      INSERT INTO "RateLimit" AS r ("key", "count", "windowStart", "blockedUntil")
      VALUES (${k}, 1, now(), NULL)
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN r."blockedUntil" IS NOT NULL AND r."blockedUntil" > now() THEN r."count"
          WHEN r."windowStart" < now() - make_interval(secs => ${opts.windowMs / 1000}) THEN 1
          ELSE r."count" + 1 END,
        "windowStart" = CASE
          WHEN r."blockedUntil" IS NOT NULL AND r."blockedUntil" > now() THEN r."windowStart"
          WHEN r."windowStart" < now() - make_interval(secs => ${opts.windowMs / 1000}) THEN now()
          ELSE r."windowStart" END,
        "blockedUntil" = CASE
          WHEN r."blockedUntil" IS NOT NULL AND r."blockedUntil" > now() THEN r."blockedUntil"
          WHEN r."windowStart" >= now() - make_interval(secs => ${opts.windowMs / 1000})
               AND r."count" + 1 > ${opts.limit}
            THEN now() + make_interval(secs => ${opts.blockMs / 1000})
          ELSE NULL END
      RETURNING CEIL(EXTRACT(EPOCH FROM ("blockedUntil" - now())))::int AS blocked_for`;
    // Old counters are swept here, occasionally, rather than by a cron job
    // this project does not otherwise need.
    if (Math.random() < 0.01) {
      void db.$executeRaw`DELETE FROM "RateLimit" WHERE "windowStart" < now() - interval '1 day' AND ("blockedUntil" IS NULL OR "blockedUntil" < now())`.catch(() => {});
    }
    const blockedFor = rows[0]?.blocked_for ?? null;
    if (blockedFor !== null && blockedFor > 0) return { allowed: false, retryAfterSeconds: blockedFor };
    return { allowed: true };
  } catch (error) {
    // Table not migrated yet, or the database is having a moment. Logged once
    // per instance so a missing table is noticed without flooding the log.
    if (!warnedDurable) {
      warnedDurable = true;
      console.error("[rateLimit] durable limiter unavailable, using in-memory:", (error as Error)?.message);
    }
    return rateLimit(k, opts);
  }
}
let warnedDurable = false;

/** Forget a durable bucket — after a successful login. Best effort. */
export async function resetRateLimitDurable(key: string) {
  resetRateLimit(key.slice(0, 300));
  await db.$executeRaw`DELETE FROM "RateLimit" WHERE "key" = ${key.slice(0, 300)}`.catch(() => {});
}

/**
 * The check every password or email-sending route makes, in three buckets:
 *
 * 1. **per address**, across all accounts (`AUTH_IP_LIMIT`);
 * 2. **per account *and* address** (`AUTH_LIMIT`) — this is what stops one
 *    source guessing one account's password;
 * 3. **per account, from anywhere** (`accountTotal`) — a much looser ceiling
 *    for attacks spread over many addresses.
 *
 * Until 2026-11-21 the per-account bucket was (3) with (2)'s numbers, so it
 * counted *anyone's* attempts: eight requests every 15 minutes, from a stranger
 * who only knew the email address, kept the owner out indefinitely, correct
 * password and all, and stopped their reset emails too. Now a stranger fills
 * their own bucket (2), and reaching (3) takes several addresses working
 * together.
 *
 * Returns the per-account-and-address key, which a successful login clears.
 */
export async function guardAuth(
  request: Request,
  scope: string,
  subject?: string,
  accountTotal: LimitOptions = AUTH_ACCOUNT_LIMIT,
): Promise<{ result: RateLimitResult; subjectKey: string | null }> {
  const ip = clientIp(request);
  const perIp = await rateLimitDurable(`${scope}:ip:${ip}`, AUTH_IP_LIMIT);
  if (!perIp.allowed) return { result: perIp, subjectKey: null };
  if (typeof subject !== "string" || !subject.trim()) return { result: perIp, subjectKey: null };

  const account = subject.trim().toLowerCase();
  const subjectKey = `${scope}:acct:${account}:ip:${ip}`;
  const perSource = await rateLimitDurable(subjectKey, AUTH_LIMIT);
  if (!perSource.allowed) return { result: perSource, subjectKey };
  return { result: await rateLimitDurable(`${scope}:acct:${account}`, accountTotal), subjectKey };
}

/** The 429 every limited route returns. */
export function tooManyRequests(result: { retryAfterSeconds: number }, message = RATE_LIMITED_MESSAGE) {
  return Response.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
  );
}

/**
 * Ordinary signed-in writes (follow, like, rate, log, list edits), per account.
 * Far above what a person clicking does; low enough that a script cannot run
 * thousands a minute. In memory — see the note at the top.
 */
export function guardWrite(userId: string, scope: "write" | "lists-create" = "write"): RateLimitResult {
  // Creating a list can look up to 100 shows on Apple and parse their feeds,
  // so it gets a much smaller allowance than a like or a follow.
  return rateLimit(`${scope}:${userId}`, scope === "lists-create" ? LIST_CREATE_LIMIT : WRITE_LIMIT);
}

/** Per account. Login and change-password: slow, because each attempt is a password guess. */
export const AUTH_LIMIT = { limit: 8, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 };

/**
 * Per account from every address together. One address manages at most 32
 * attempts an hour on one account (`AUTH_LIMIT`), so reaching 100 needs at
 * least four working together — and 100 guesses an hour is still hopeless
 * against the password policy.
 */
export const AUTH_ACCOUNT_LIMIT = { limit: 100, windowMs: 60 * 60 * 1000, blockMs: 15 * 60 * 1000 };

/**
 * The same, for routes that send an email to the address (reset, resend
 * confirmation). Lower, because every allowed request lands in somebody's
 * inbox; Supabase's own per-address email limit sits behind it.
 */
export const EMAIL_TARGET_LIMIT = { limit: 20, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 };

/** Per address, across all accounts. Looser than per-account: an office or a
 *  campus shares one address. */
export const AUTH_IP_LIMIT = { limit: 30, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 };

export const WRITE_LIMIT = { limit: 60, windowMs: 60 * 1000, blockMs: 60 * 1000 };
export const LIST_CREATE_LIMIT = { limit: 6, windowMs: 60 * 1000, blockMs: 2 * 60 * 1000 };

/** The public episode-page API, per address. "Load more" is a few a minute. */
export const FEED_API_LIMIT = { limit: 60, windowMs: 60 * 1000, blockMs: 2 * 60 * 1000 };

/** Search, per address: a fast typist makes a handful a second at most. */
export const SEARCH_LIMIT = { limit: 90, windowMs: 60 * 1000, blockMs: 60 * 1000 };

/** Signup: looser, since a person filling in a form legitimately retries, but
 *  tight enough to stop bulk account creation from one address. */
/** Comments, per account: a lively thread is a few a minute, not dozens. */
export const COMMENT_LIMIT = { limit: 8, windowMs: 60 * 1000, blockMs: 2 * 60 * 1000 };

export const SIGNUP_LIMIT = { limit: 5, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 };

export const RATE_LIMITED_MESSAGE =
  "Too many attempts. Please wait a few minutes before trying again.";
