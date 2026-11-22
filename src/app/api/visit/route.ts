import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { VISIT_IDLE_MS, VISIT_RETENTION_DAYS, hasAuthCookie, isBot, isVisitId } from "@/lib/visits";

/**
 * Where `VisitTracker` reports a page view (`view`) and the tab being left
 * (`leave`). See `src/lib/visits.ts` for what is recorded and why.
 *
 * Always answers 204, whatever happened: the browser sends this with
 * `sendBeacon` and never reads the reply, and a measurement failure must never
 * show up as an error on the page.
 */

/** A person clicking around makes a few a minute; this only stops a script. */
const VISIT_LIMIT = { limit: 120, windowMs: 60 * 1000, blockMs: 60 * 1000 };

const noContent = () => new NextResponse(null, { status: 204 });

function cleanPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;
  // The path only — the tracker never sends a query string, and this makes sure.
  return value.split(/[?#]/)[0].slice(0, 200);
}

function referrerHost(value: unknown, request: Request): string | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const host = new URL(value).hostname.replace(/^www\./, "");
    const own = (request.headers.get("host") ?? "").split(":")[0].replace(/^www\./, "");
    return host && host !== own ? host.slice(0, 100) : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  // Production traffic only. Local servers use the production database, and
  // their visits would be counted as real ones. Set TRACK_VISITS_LOCALLY=1 to
  // test this route on your own machine.
  if (process.env.VERCEL_ENV !== "production" && process.env.TRACK_VISITS_LOCALLY !== "1") return noContent();
  if (isBot(request)) return noContent();
  if (!rateLimit(clientKey(request, "visit"), VISIT_LIMIT).allowed) return noContent();

  // sendBeacon posts the body as text; parse it whatever the content type.
  const body = await request
    .text()
    .then((t) => JSON.parse(t) as Record<string, unknown>)
    .catch(() => null);
  if (!body || !isVisitId(body.id)) return noContent();
  const id = body.id;

  try {
    if (body.event === "leave") {
      // Only extends a visit that is still live, so a tab left hidden for a
      // day and then closed does not record a day-long visit.
      await db.visit.updateMany({
        where: { id, lastSeenAt: { gte: new Date(Date.now() - VISIT_IDLE_MS) } },
        data: { lastSeenAt: new Date() },
      });
      return noContent();
    }

    const path = cleanPath(body.path);
    if (body.event !== "view" || !path) return noContent();
    const onSignup = path === "/signup";

    await db.visit.upsert({
      where: { id },
      create: {
        id,
        entryPath: path,
        referrer: referrerHost(body.referrer, request),
        signedIn: hasAuthCookie(request),
        sawSignup: onSignup,
      },
      update: {
        pageViews: { increment: 1 },
        lastSeenAt: new Date(),
        ...(onSignup && { sawSignup: true }),
      },
    });

    // Old visits are swept here, occasionally, rather than by a cron job.
    if (Math.random() < 0.005) {
      const cutoff = new Date(Date.now() - VISIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      void db.visit.deleteMany({ where: { startedAt: { lt: cutoff } } }).catch(() => {});
    }
  } catch (error) {
    console.error("[visit] could not record:", (error as Error)?.message);
  }
  return noContent();
}
