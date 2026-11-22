import { createHmac } from "node:crypto";
import { db } from "./db";
import { clientIp } from "./rateLimit";

/**
 * First-party visit measurement: bounce rate, how long people stay, and the
 * signup funnel. Vercel Web Analytics covers page views and visitors, but its
 * API has no bounce rate and no visit length, so those are measured here.
 *
 * **What identifies a visit.** A random UUID the browser keeps in
 * sessionStorage (`VisitTracker`), which the browser deletes when the tab
 * closes. Nothing links two visits, and nothing here is a cookie. The privacy
 * page says this in as many words — keep it true if this changes.
 *
 * **What a visit records.** The entry path, the referring site's hostname,
 * a page count, first and last activity, whether the visitor had a login
 * cookie, whether they opened /signup, and the account created during it.
 *
 * Rows older than `VISIT_RETENTION_DAYS` are swept occasionally by the route
 * that writes them, the same way the rate limiter sweeps its own table.
 */

export const VISIT_RETENTION_DAYS = 180;

/** A visit with no activity for this long is over; the tab mints a new id. */
export const VISIT_IDLE_MS = 30 * 60 * 1000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isVisitId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/** Crawlers, link previewers and headless browsers, which would skew every number. */
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|monitor|curl|wget|python|axios|node-fetch/i;

export function isBot(request: Request): boolean {
  const ua = request.headers.get("user-agent") ?? "";
  return !ua || BOT.test(ua);
}

/** True when the request carries a Supabase login cookie, valid or not. Cheap: no auth call. */
export function hasAuthCookie(request: Request): boolean {
  const cookie = request.headers.get("cookie") ?? "";
  return /(?:^|;\s*)sb-[^=]*-auth-token/.test(cookie);
}

/**
 * The key for the signup hashes. A dedicated secret when one is set;
 * otherwise the service-role key, which is already a server-only secret. With
 * neither, no hashes are stored and the duplicate check falls back to email
 * aliases and shared visits.
 *
 * Changing the key makes old and new hashes incomparable. That loses
 * duplicate detection across the change and nothing else.
 */
function hashKey(): string | null {
  return process.env.ANALYTICS_HASH_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
}

function keyedHash(key: string, value: string): string {
  return createHmac("sha256", key).update(value).digest("base64url");
}

/**
 * Records how an account was created, and ties it to the visit it came from.
 * Best effort: a failure here is logged and never fails a signup.
 */
export async function recordSignupSource(userId: string, visitId: unknown, request: Request): Promise<void> {
  try {
    const key = hashKey();
    const ip = clientIp(request);
    const ua = request.headers.get("user-agent") ?? "";
    const hasIp = ip !== "unknown";
    const visit = isVisitId(visitId) ? visitId : null;

    await db.signupSource.create({
      data: {
        userId,
        visitId: visit,
        networkHash: key && hasIp ? keyedHash(key, `net:${ip}`) : null,
        deviceHash: key && hasIp ? keyedHash(key, `dev:${ip}|${ua}`) : null,
      },
    });
    if (visit) {
      await db.visit.updateMany({ where: { id: visit }, data: { userId, sawSignup: true } });
    }
  } catch (error) {
    console.error("[visits] could not record the signup source:", (error as Error)?.message);
  }
}

/**
 * The address with the parts that do not change the mailbox removed, so
 * `j.doe+pt@gmail.com` and `jdoe@gmail.com` compare equal. `+tags` are
 * dropped everywhere; dots only for Gmail, which ignores them.
 */
export function canonicalEmail(email: string): string {
  const [local = "", domain = ""] = email.trim().toLowerCase().split("@");
  const gmail = domain === "gmail.com" || domain === "googlemail.com";
  let base = local.split("+")[0];
  if (gmail) base = base.replace(/\./g, "");
  return `${base}@${gmail ? "gmail.com" : domain}`;
}
