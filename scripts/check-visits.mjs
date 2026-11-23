/**
 * Why so many visits look one second long — run with `npm run check:visits`.
 *
 * **The question this answers.** `/funnel` reported a median visit of 1 second
 * and an 84% bounce rate on 2026-11-23, which reads as a catastrophe. It
 * probably is not one, and this separates the three explanations:
 *
 *   1. **Bots.** Unlikely to matter: `VisitTracker` is client-side JavaScript,
 *      so crawlers and link previewers that do not execute it never create a
 *      `Visit` row. They are filtered before they are counted.
 *   2. **Background tabs.** The "leave" event fires on
 *      `visibilitychange -> hidden`, which fires when somebody switches tabs,
 *      not only when they close the page. Open ten links from Hacker News into
 *      background tabs and each records a visit about a second long. If the
 *      fast leaves cluster on one referrer, this is what happened.
 *   3. **The page genuinely failing people.** Then fast leaves would be spread
 *      across referrers rather than concentrated in one.
 *
 * Read the referrer breakdown first — it is the one that tells them apart.
 *
 * Raw SQL through `pg`, like the other check scripts, so it does not depend on
 * the generated Prisma client being current. **Read-only** — every statement
 * is a SELECT. Prints no personal data: no paths beyond entry pages, no ids.
 */
import pg from "pg";

const { Pool } = pg;

function sslConfig(connectionString) {
  if (!connectionString) return undefined;
  if (/[?&]sslmode=/i.test(connectionString)) return undefined;
  try {
    const host = new URL(connectionString).hostname;
    if (["localhost", "127.0.0.1", "::1"].includes(host) || host.endsWith(".local")) return undefined;
  } catch {
    return undefined;
  }
  return { rejectUnauthorized: true };
}

function heading(text) {
  console.log(`\n${text}\n${"-".repeat(text.length)}`);
}

const DAYS = Number(process.argv[2]) || 7;

try {
  process.loadEnvFile(".env");
} catch {
  console.log("No .env here — reading the environment instead.");
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("\nDATABASE_URL is not set. `npm run check:env` diagnoses that.");
  process.exit(1);
}

const pool = new Pool({ connectionString: url, ssl: sslConfig(url), max: 1 });
const SINCE = `now() - interval '${DAYS} days'`;

async function main() {
  const { rows: totals } = await pool.query(`
    SELECT count(*)::int AS visits,
           count(*) FILTER (WHERE "pageViews" = 1)::int AS one_page,
           count(*) FILTER (WHERE EXTRACT(EPOCH FROM ("lastSeenAt" - "startedAt")) < 2)::int AS under_2s
      FROM "Visit" WHERE "startedAt" > ${SINCE}`);

  const t = totals[0];
  if (t.visits === 0) {
    console.log(`\nNo visits recorded in the last ${DAYS} days.`);
    return;
  }

  heading(`Visits in the last ${DAYS} days`);
  const pct = (n) => `${Math.round((n / t.visits) * 100)}%`;
  console.log(`  total                      ${t.visits}`);
  console.log(`  saw one page only          ${t.one_page}  (${pct(t.one_page)})`);
  console.log(`  lasted under 2 seconds     ${t.under_2s}  (${pct(t.under_2s)})`);

  // ── The one that tells the explanations apart. ──
  heading("Fast leavers by referrer — the deciding table");
  const { rows: byRef } = await pool.query(`
    SELECT coalesce(referrer, '(direct)') AS source,
           count(*)::int AS visits,
           count(*) FILTER (WHERE EXTRACT(EPOCH FROM ("lastSeenAt" - "startedAt")) < 2)::int AS fast,
           round(avg(EXTRACT(EPOCH FROM ("lastSeenAt" - "startedAt"))))::int AS avg_seconds,
           round(avg("pageViews"), 1) AS avg_pages
      FROM "Visit" WHERE "startedAt" > ${SINCE}
     GROUP BY 1 ORDER BY visits DESC LIMIT 12`);

  console.log("  source                        visits   <2s    avg    pages");
  for (const r of byRef) {
    const share = r.visits ? `${Math.round((r.fast / r.visits) * 100)}%` : "–";
    console.log(
      `  ${String(r.source).slice(0, 26).padEnd(28)}${String(r.visits).padStart(5)}` +
        `${share.padStart(7)}${(r.avg_seconds + "s").padStart(8)}${String(r.avg_pages).padStart(8)}`,
    );
  }
  console.log("");
  console.log("  One referrer at a much higher <2s share than the rest means");
  console.log("  background tabs, not a failing page. Evenly spread means the");
  console.log("  page really is losing people.");

  heading("Where they land");
  const { rows: paths } = await pool.query(`
    SELECT "entryPath" AS path,
           count(*)::int AS visits,
           round(avg(EXTRACT(EPOCH FROM ("lastSeenAt" - "startedAt"))))::int AS avg_seconds,
           count(*) FILTER (WHERE "pageViews" > 1)::int AS went_deeper
      FROM "Visit" WHERE "startedAt" > ${SINCE}
     GROUP BY 1 ORDER BY visits DESC LIMIT 10`);
  console.log("  entry page                    visits    avg   went deeper");
  for (const r of paths) {
    console.log(
      `  ${String(r.path).slice(0, 26).padEnd(28)}${String(r.visits).padStart(5)}` +
        `${(r.avg_seconds + "s").padStart(8)}${String(r.went_deeper).padStart(9)}`,
    );
  }

  // ── What the visits that were NOT instant did. ──
  heading("Only the visits that lasted 10 seconds or more");
  const { rows: real } = await pool.query(`
    SELECT count(*)::int AS visits,
           count(*) FILTER (WHERE "pageViews" > 1)::int AS multi_page,
           count(*) FILTER (WHERE "sawSignup")::int AS saw_signup,
           count(*) FILTER (WHERE "userId" IS NOT NULL)::int AS signed_up,
           round(avg("pageViews"), 1) AS avg_pages
      FROM "Visit"
     WHERE "startedAt" > ${SINCE}
       AND EXTRACT(EPOCH FROM ("lastSeenAt" - "startedAt")) >= 10
       AND NOT "signedIn"`);
  const r = real[0];
  console.log(`  visits                     ${r.visits}`);
  if (r.visits > 0) {
    const p = (n) => `${Math.round((n / r.visits) * 100)}%`;
    console.log(`  saw more than one page     ${r.multi_page}  (${p(r.multi_page)})`);
    console.log(`  pages per visit            ${r.avg_pages}`);
    console.log(`  opened signup              ${r.saw_signup}  (${p(r.saw_signup)})`);
    console.log(`  created an account         ${r.signed_up}  (${p(r.signed_up)})`);
    console.log("");
    console.log("  This is the honest conversion rate. Measuring signups against");
    console.log("  every visit counts people who never saw the page.");
  }
}

main()
  .catch((error) => {
    console.log("\nCould not complete the check:");
    console.log(`  ${error?.message ?? error}`);
    console.log("\n`npm run check:env` reports which database this is pointed at.");
    process.exitCode = 1;
  })
  .finally(() => pool.end());
