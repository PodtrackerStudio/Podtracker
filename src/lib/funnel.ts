import { db } from "./db";
import { canonicalEmail } from "./visits";

/**
 * The numbers behind the Discord bot's `/funnel`: how visits end (bounce rate,
 * time before leaving), how many visitors reach each step of signing up, and
 * whether each new account looks like a new person or another account of
 * someone already here. Measured by `src/lib/visits.ts`.
 */

export type FunnelPeriod = "24h" | "7d" | "30d";

const PERIOD_MS: Record<FunnelPeriod, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

/** How a new account matched an existing one, strongest first. */
export type Match =
  | { kind: "device"; username: string } // same browser on the same network
  | { kind: "visit"; username: string } // created in the same visit
  | { kind: "email"; username: string } // the same mailbox under another spelling
  | { kind: "network"; username: string }; // same network — shared wifi does this too

export type Signup = { username: string; createdAt: Date; confirmed: boolean | null; matches: Match[] };

export type Funnel = {
  period: FunnelPeriod;
  /** When the first visit was recorded; numbers before it don't exist. */
  trackingSince: Date | null;
  visits: number;
  bounces: number;
  medianSeconds: number | null;
  averageSeconds: number | null;
  /** Visits by how long they lasted: <10s, 10–30s, 30s–1m, 1–3m, 3–10m, 10m+. */
  durations: number[];
  newVisitors: number;
  sawSignup: number;
  signups: Signup[];
  /** Null when Supabase's auth table couldn't be read. */
  confirmed: number | null;
};

export const DURATION_LABELS = ["<10s", "10–30s", "30s–1m", "1–3m", "3–10m", "10m+"];

type VisitRow = {
  visits: number;
  bounces: number;
  new_visitors: number;
  saw_signup: number;
  median_s: number | null;
  avg_s: number | null;
  d0: number; d1: number; d2: number; d3: number; d4: number; d5: number;
};

export async function funnel(period: FunnelPeriod): Promise<Funnel> {
  const since = new Date(Date.now() - PERIOD_MS[period]);

  const [visitRows, first, newUsers] = await Promise.all([
    db.$queryRaw<VisitRow[]>`
      WITH v AS (
        SELECT *, EXTRACT(EPOCH FROM ("lastSeenAt" - "startedAt"))::float AS secs
        FROM "Visit" WHERE "startedAt" >= ${since}
      )
      SELECT
        count(*)::int AS visits,
        count(*) FILTER (WHERE "pageViews" = 1)::int AS bounces,
        count(*) FILTER (WHERE NOT "signedIn")::int AS new_visitors,
        count(*) FILTER (WHERE NOT "signedIn" AND "sawSignup")::int AS saw_signup,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY secs)::float AS median_s,
        -- Capped at 2 hours so one tab left open doesn't drag the average.
        avg(LEAST(secs, 7200))::float AS avg_s,
        count(*) FILTER (WHERE secs < 10)::int AS d0,
        count(*) FILTER (WHERE secs >= 10 AND secs < 30)::int AS d1,
        count(*) FILTER (WHERE secs >= 30 AND secs < 60)::int AS d2,
        count(*) FILTER (WHERE secs >= 60 AND secs < 180)::int AS d3,
        count(*) FILTER (WHERE secs >= 180 AND secs < 600)::int AS d4,
        count(*) FILTER (WHERE secs >= 600)::int AS d5
      FROM v`,
    db.visit.findFirst({ orderBy: { startedAt: "asc" }, select: { startedAt: true } }),
    db.user.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: { id: true, username: true, email: true, createdAt: true, signupSource: true },
    }),
  ]);
  const v = visitRows[0];

  // Confirmation lives in Supabase's own auth table, not ours.
  let confirmedIds: Set<string> | null = null;
  if (newUsers.length > 0) {
    try {
      const ids = newUsers.map((u) => u.id);
      const rows = await db.$queryRaw<{ id: string }[]>`
        SELECT id::text AS id FROM auth.users
        WHERE id::text = ANY(${ids}) AND email_confirmed_at IS NOT NULL`;
      confirmedIds = new Set(rows.map((r) => r.id));
    } catch (error) {
      console.error("[funnel] could not read auth.users:", (error as Error)?.message);
    }
  } else {
    confirmedIds = new Set();
  }

  const signups = await Promise.all(newUsers.map((u) => matchesFor(u)));

  return {
    period,
    trackingSince: first?.startedAt ?? null,
    visits: v?.visits ?? 0,
    bounces: v?.bounces ?? 0,
    medianSeconds: v?.median_s ?? null,
    averageSeconds: v?.avg_s ?? null,
    durations: v ? [v.d0, v.d1, v.d2, v.d3, v.d4, v.d5] : [0, 0, 0, 0, 0, 0],
    newVisitors: v?.new_visitors ?? 0,
    sawSignup: v?.saw_signup ?? 0,
    confirmed: confirmedIds ? newUsers.filter((u) => confirmedIds.has(u.id)).length : null,
    signups: newUsers.map((u, i) => ({
      username: u.username,
      createdAt: u.createdAt,
      confirmed: confirmedIds ? confirmedIds.has(u.id) : null,
      matches: signups[i],
    })),
  };

  async function matchesFor(u: (typeof newUsers)[number]): Promise<Match[]> {
    const src = u.signupSource;
    const signals = [
      src?.deviceHash && { deviceHash: src.deviceHash },
      src?.visitId && { visitId: src.visitId },
      src?.networkHash && { networkHash: src.networkHash },
    ].filter(Boolean) as object[];

    const others = signals.length
      ? await db.signupSource.findMany({
          where: { userId: { not: u.id }, OR: signals },
          select: { deviceHash: true, visitId: true, networkHash: true, user: { select: { username: true } } },
        })
      : [];

    const matches: Match[] = [];
    const seen = new Set<string>();
    const add = (kind: Match["kind"], username: string) => {
      if (seen.has(username)) return; // one line per other account, strongest reason
      seen.add(username);
      matches.push({ kind, username });
    };
    for (const o of others) if (src?.deviceHash && o.deviceHash === src.deviceHash) add("device", o.user.username);
    for (const o of others) if (src?.visitId && o.visitId === src.visitId) add("visit", o.user.username);
    for (const o of await sameMailbox(u.id, u.email)) add("email", o);
    for (const o of others) if (src?.networkHash && o.networkHash === src.networkHash) add("network", o.user.username);
    return matches;
  }
}

/** Accounts whose email is the same mailbox as this one, spelled differently. */
async function sameMailbox(userId: string, email: string): Promise<string[]> {
  const canonical = canonicalEmail(email);
  const [local, domain] = canonical.split("@");
  // Narrowed in the database by domain and first letter, then compared exactly.
  const candidates = await db.user.findMany({
    where: {
      id: { not: userId },
      AND: [
        // "mail.com" so googlemail.com is caught alongside gmail.com.
        { email: { endsWith: domain === "gmail.com" ? "mail.com" : `@${domain}`, mode: "insensitive" } },
        ...(local ? [{ email: { startsWith: local[0], mode: "insensitive" as const } }] : []),
      ],
    },
    select: { username: true, email: true },
    take: 500,
  });
  return candidates.filter((c) => canonicalEmail(c.email) === canonical).map((c) => c.username);
}
