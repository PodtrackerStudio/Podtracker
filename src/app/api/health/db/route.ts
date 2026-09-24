import { NextResponse } from "next/server";
import pg from "pg";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * `GET /api/health/db` — what the *running deployment* can actually see.
 *
 * **Why this exists.** `npm run check:db` answers the same questions on a
 * laptop, and that turned out to be the wrong machine: on 2026-09-15 the local
 * database was healthy while the live site returned 503 from signup. The two
 * environments have separate copies of every variable, and nothing in the app
 * could report on the one that mattered. Reading Vercel's runtime logs is the
 * alternative, and asking a non-expert to go find a log line has cost this
 * project several round trips already.
 *
 * **Why it is safe to leave reachable.** It deliberately returns no secrets:
 * no connection string, no host, no username, no password, no keys. Only
 * booleans, a provider *name* (`neon` / `supabase`), a port, and a classified
 * error. The worst an attacker learns is which hosting provider the database
 * runs on and whether it is currently up — both of which they can infer anyway
 * from the site being broken.
 *
 * It does mean anyone can cause a connection attempt. That is one cheap query
 * against a pooler, and the route is rate-limited by nothing because it does
 * strictly less work than loading the homepage.
 */

// The connection attempt must not be cached, or this reports history.
export const dynamic = "force-dynamic";

/** Mirrors `sslConfig` in src/lib/db.ts so this reports what the app would see. */
function sslConfig(connectionString: string) {
  if (/[?&]sslmode=/i.test(connectionString)) return undefined;
  try {
    const host = new URL(connectionString).hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local")) {
      return undefined;
    }
  } catch {
    return undefined;
  }
  return { rejectUnauthorized: true };
}

function providerOf(hostname: string): string {
  if (hostname.includes("neon.tech")) return "neon";
  if (hostname.includes("supabase.co") || hostname.includes("supabase.com")) return "supabase";
  if (hostname === "localhost" || hostname === "127.0.0.1") return "localhost";
  return "other";
}

/** Error text → a short cause, so the answer is a diagnosis rather than a stack trace. */
function classify(message: string): string {
  if (/password authentication failed|authentication failed|SASL|scram/i.test(message)) {
    return "auth-rejected: the host answered and refused the credentials";
  }
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(message)) {
    return "dns-failure: the hostname does not resolve";
  }
  if (/ECONNREFUSED|timeout|timed out|ETIMEDOUT|non-101|network error/i.test(message)) {
    return "unreachable: nothing answered, or the port is blocked";
  }
  if (/does not exist/i.test(message)) {
    return "missing: that database or role does not exist on the host";
  }
  if (/self.signed|certificate|SSL|TLS/i.test(message)) {
    return "tls-failure: the connection was refused at the TLS layer";
  }
  return "unrecognised";
}

export async function GET() {
  const url = process.env.DATABASE_URL;

  const report: Record<string, unknown> = {
    checkedAt: new Date().toISOString(),
    env: {
      DATABASE_URL: Boolean(url),
      NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      NEXT_PUBLIC_SITE_URL: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
      // The app's own view, which is what actually gates sign-in. It can be
      // false while both variables above are true only if one of them is empty.
      supabaseConsideredConfigured: isSupabaseConfigured,
    },
  };

  if (!url) {
    report.verdict = "DATABASE_URL is not set in this environment. Nothing can connect.";
    return NextResponse.json(report, { status: 503 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    report.verdict = "DATABASE_URL is set but is not a valid URL — it was mangled on the way in.";
    return NextResponse.json(report, { status: 503 });
  }

  report.database = {
    provider: providerOf(parsed.hostname),
    port: parsed.port || "5432",
    pooled: parsed.hostname.includes("pooler") || parsed.hostname.includes("-pooler"),
    hasPassword: Boolean(parsed.password),
  };

  const pool = new pg.Pool({ connectionString: url, ssl: sslConfig(url), connectionTimeoutMillis: 8_000, max: 1 });
  const started = Date.now();

  try {
    const tables = await pool.query(
      `select
         count(*)::int as total,
         count(*) filter (where table_name = 'User')::int as user_table
       from information_schema.tables
       where table_schema = 'public'`,
    );

    report.connection = {
      ok: true,
      ms: Date.now() - started,
      tables: tables.rows[0].total,
      hasUserTable: tables.rows[0].user_table > 0,
    };
    report.verdict =
      tables.rows[0].user_table > 0
        ? "Database reachable and the schema is present."
        : "Database reachable but the schema was never applied — signup will still fail.";

    return NextResponse.json(report);
  } catch (error) {
    const message = String((error as Error)?.message ?? error);
    report.connection = { ok: false, ms: Date.now() - started, cause: classify(message) };
    report.verdict = "Database unreachable from this deployment.";
    return NextResponse.json(report, { status: 503 });
  } finally {
    await pool.end().catch(() => {});
  }
}
