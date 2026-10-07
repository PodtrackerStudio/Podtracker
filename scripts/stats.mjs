/**
 * Where the site actually stands — run with `npm run stats`.
 *
 * Written because the answer to "how many users do we have?" lived in the
 * Supabase dashboard across three different screens, and the number that
 * matters most — how many of those people have *done* anything — wasn't on any
 * of them.
 *
 * **Raw `pg`, not Prisma, and not by choice.** The generated Prisma client is
 * TypeScript, which a plain `.mjs` cannot import. `check-db.mjs` uses `pg` for
 * the same reason, and this file borrows its connection handling so both behave
 * identically on a bad network.
 *
 * **Read-only.** Every statement here is a SELECT. Safe to run against
 * production, which is the only place the numbers are real.
 *
 * If this cannot connect, run `npm run check:db` — it diagnoses connection
 * problems properly and names the fix.
 */
import pg from "pg";

const { Pool } = pg;

// Identical to check-db.mjs and src/lib/db.ts: `pg` does not enable TLS on its
// own and Supabase refuses connections without it, while the strings Supabase
// hands out carry no `sslmode`.
function sslConfig(connectionString) {
  if (!connectionString) return undefined;
  if (/[?&]sslmode=/i.test(connectionString)) return undefined;
  try {
    const host = new URL(connectionString).hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local")) return undefined;
  } catch {
    return undefined;
  }
  return { rejectUnauthorized: true };
}

try {
  process.loadEnvFile(".env");
} catch {
  // Not an error: Vercel and CI supply the environment directly.
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Add it to .env, or run `npm run check:db` for help.");
  process.exit(1);
}

const pool = new Pool({ connectionString, ssl: sslConfig(connectionString), max: 1 });

/** One number. Returns null rather than throwing, so one bad query can't kill the report. */
async function count(sql) {
  try {
    const { rows } = await pool.query(sql);
    return Number(rows[0]?.n ?? 0);
  } catch (error) {
    console.error(`  (query failed: ${error.message})`);
    return null;
  }
}

function line(label, value, note = "") {
  const shown = value === null ? "?" : String(value);
  console.log(`  ${label.padEnd(28)} ${shown.padStart(6)}${note ? `   ${note}` : ""}`);
}

function heading(text) {
  console.log(`\n${text}\n${"-".repeat(text.length)}`);
}

const [
  users,
  usersWeek,
  withAnything,
  withReview,
  logs,
  reviews,
  podcastRatings,
  episodeRatings,
  follows,
  userFollows,
  lists,
  likes,
  comments,
] = await Promise.all([
  count('SELECT count(*)::int AS n FROM "User"'),
  count(`SELECT count(*)::int AS n FROM "User" WHERE "createdAt" > now() - interval '7 days'`),
  // The number that actually matters. A signup who has never rated, logged or
  // followed anything has seen the site but not used it.
  count(`SELECT count(DISTINCT id)::int AS n FROM (
           SELECT "userId" AS id FROM "LogEntry"
           UNION SELECT "userId" FROM "PodcastRating"
           UNION SELECT "userId" FROM "EpisodeRating"
           UNION SELECT "userId" FROM "PodcastFollow"
         ) AS acted`),
  count(`SELECT count(DISTINCT "userId")::int AS n FROM "LogEntry" WHERE "reviewText" IS NOT NULL`),
  count('SELECT count(*)::int AS n FROM "LogEntry"'),
  count('SELECT count(*)::int AS n FROM "LogEntry" WHERE "reviewText" IS NOT NULL'),
  count('SELECT count(*)::int AS n FROM "PodcastRating"'),
  count('SELECT count(*)::int AS n FROM "EpisodeRating"'),
  count('SELECT count(*)::int AS n FROM "PodcastFollow"'),
  count('SELECT count(*)::int AS n FROM "Follow"'),
  count('SELECT count(*)::int AS n FROM "List"'),
  count('SELECT count(*)::int AS n FROM "Like"'),
  count('SELECT count(*)::int AS n FROM "Comment"'),
]);

heading("People");
line("Accounts", users);
line("Signed up this week", usersWeek);
line("Have done something", withAnything, "rated, logged or followed");
line("Have written a review", withReview);

heading("What they've made");
line("Log entries", logs);
line("Reviews", reviews, "log entries carrying text");
line("Show ratings", podcastRatings);
line("Episode ratings", episodeRatings);
line("Show follows", follows);
line("Lists", lists);

heading("Social");
line("User follows", userFollows);
line("Likes", likes);
line("Comments", comments);

// Said out loud because it is the one number that can quietly be zero while
// everything else looks healthy, and it is the whole product.
if (withAnything === 0 && users > 0) {
  console.log(`\nNobody has rated, logged or followed anything yet — ${users} account(s), no activity.`);
} else if (users !== null && withAnything !== null && users > 0) {
  console.log(`\n${withAnything} of ${users} accounts have used the site.`);
}

// **Accounts here are profile rows, not credentials.** Supabase Auth owns the
// credential and this database owns the profile; signup writes the profile even
// before the email is confirmed, so these should match. If this number is lower
// than Supabase's Authentication > Users count, signups are failing halfway.
console.log("\nAccounts = profile rows in this database. Compare with Supabase > Authentication > Users:");
console.log("a lower number here means signups are breaking between Supabase and our own table.");

await pool.end();
