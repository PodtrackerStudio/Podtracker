/**
 * `npm run setup:supabase` — point the app at Supabase Postgres, end to end.
 *
 * **Why this is a script.** The switchover is five steps in a specific order,
 * and getting one wrong produces a failure that looks like a different step:
 * migrating through the pooler half-works, using the direct string in
 * production exhausts connections under load, using transaction mode breaks
 * `$transaction`, and pointing at an empty database fails signup in a way
 * indistinguishable from bad credentials. Doing it by hand across three days
 * of chat is how this project lost a week.
 *
 * Nothing here talks to Vercel — it cannot, it has no credentials. It sets up
 * the database and the local `.env`, then prints the exact Vercel commands.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import pg from "pg";

const rl = createInterface({ input: process.stdin, output: process.stdout });

// Same rule as src/lib/db.ts: `pg` does not enable TLS on its own and Supabase
// refuses connections without it, while the strings Supabase hands out carry no
// `sslmode`. Kept identical so this reports what the app would actually see.
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


function rule(title) {
  console.log(`\n${title}\n${"─".repeat(title.length)}`);
}

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  rl.close();
  process.exit(1);
}

/** Never echoed back — output gets pasted into chats. */
function describe(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  return {
    host: u.hostname,
    port: u.port || "5432",
    user: u.username,
    isNeon: u.hostname.includes("neon.tech"),
    isSupabase: u.hostname.includes("supabase.co") || u.hostname.includes("supabase.com"),
    isPooler: u.hostname.includes("pooler"),
    isTransactionMode: u.port === "6543",
    hasPassword: Boolean(u.password),
  };
}

function check(raw, { wantPooler }) {
  const d = describe(raw);
  if (!d) fail("That is not a valid connection string. Copy it again — it must start with postgresql://");
  if (d.isNeon) fail("That is a Neon string. This script points the app at Supabase; grab the string from Supabase instead.");
  if (!d.isSupabase) console.log(`  ! Host does not look like Supabase (${d.host}). Continuing anyway.`);
  if (!d.hasPassword) fail("That string has no password in it. Replace [YOUR-PASSWORD] with the real one.");
  // Supabase ships the string with a literal placeholder and never shows the
  // real password again, so pasting it unedited is the single most likely
  // mistake here. `new URL` accepts it happily, and without this check it
  // surfaces four steps later as an unexplained migration failure.
  if (/\[YOUR-PASSWORD\]|%5BYOUR-PASSWORD%5D/i.test(raw)) {
    fail(
      "That still contains the literal [YOUR-PASSWORD] placeholder.\n" +
      "  Supabase never shows the real password again — if you do not have it, reset it under\n" +
      "  Project Settings > Database > Reset database password, then paste the string with the\n" +
      "  new password in place of the placeholder.",
    );
  }

  if (wantPooler) {
    if (!d.isPooler) fail(`That is the DIRECT string (${d.host}). Production needs the POOLER — its host contains 'pooler.supabase.com'.`);
    if (d.isTransactionMode) {
      fail(
        "That is the pooler in TRANSACTION mode (port 6543). It hands the connection back after every\n" +
        "  statement, which breaks the transactions in /api/log and /api/favorites. Use the same host on\n" +
        "  port 5432 — session mode.",
      );
    }
  } else {
    // Migrations need a real session, which rules out transaction mode — but
    // NOT the session pooler, which this originally rejected on the assumption
    // that migrations require the direct endpoint. They do not, and insisting
    // on it is actively wrong for two reasons: Supabase serves
    // `db.<ref>.supabase.co` over IPv6 only unless a project buys the IPv4
    // add-on, and the direct endpoint expects the username `postgres` while the
    // pooler expects `postgres.<project-ref>` — so a string assembled from the
    // wrong half is rejected as bad credentials (P1000) even when the password
    // is perfect. The session pooler works over IPv4 and is what Supabase now
    // points people at.
    if (d.isTransactionMode) {
      fail(
        "That is the pooler in TRANSACTION mode (port 6543). Migrations need a real session.\n" +
        "  Use the same host on port 5432 — session mode — or the direct string.",
      );
    }
    if (d.isPooler && d.isSupabase && !/^postgres\.[a-z0-9]+$/i.test(d.user)) {
      fail(
        `The pooler expects the username 'postgres.<project-ref>', but this says '${d.user}'.\n` +
        "  That mismatch is rejected as a bad password even when the password is right. Copy the\n" +
        "  string from the dashboard rather than editing the direct one by hand.",
      );
    }
  }

  console.log(`  ✓ ${d.host}:${d.port} as ${d.user}`);
  return d;
}

async function main() {
  console.log("\nPodtracker — Supabase database setup\n");
  console.log("You need two connection strings, both from:");
  console.log("  Supabase > Project Settings > Database > Connection string\n");
  console.log("  1. DIRECT or SESSION POOLER — used once, to create the tables");
  console.log("  2. SESSION POOLER (port 5432) — what the app uses from then on");
  console.log("\n  The same session pooler string works for both. Use it for both if in doubt.\n");
  console.log("Replace [YOUR-PASSWORD] with the real password before pasting. No quotes.");

  rule("Step 1 of 4 — a string that can run migrations");
  console.log("Either the DIRECT string, or the SESSION POOLER one (port 5432).");
  console.log("If the direct string gave you 'Authentication failed', use the session pooler —");
  console.log("Supabase serves the direct host over IPv6 only unless the project has the IPv4");
  console.log("add-on, and it expects a different username than the pooler.\n");
  const direct = (await rl.question("Paste it here:\n> ")).trim();
  check(direct, { wantPooler: false });

  rule("Step 2 of 4 — creating the tables");
  console.log("Running prisma migrate deploy…\n");
  try {
    execSync("npx prisma migrate deploy", {
      // stdout and stderr inherited so migration progress is visible, but
      // stdin explicitly NOT — `inherit` hands our stdin to the child, and
      // prisma leaves it drained, which eats the answer to the next prompt.
      stdio: ["ignore", "inherit", "inherit"],
      env: { ...process.env, DATABASE_URL: direct },
    });
  } catch {
    fail(
      "Migrations failed. The output above says why.\n\n" +
      "  If it says P1000 / 'Authentication failed', the likeliest cause is NOT the password:\n" +
      "    - the direct host wants the username 'postgres'\n" +
      "    - the pooler host wants 'postgres.<project-ref>'\n" +
      "  A string built from one half and the other is refused as bad credentials.\n" +
      "  Copy the SESSION POOLER string straight from the dashboard and run this again.",
    );
  }

  rule("Step 3 of 4 — the POOLER string");
  const pooler = (await rl.question("Paste the POOLER connection string (port 5432):\n> ")).trim();
  check(pooler, { wantPooler: true });

  console.log("\nTesting it the way the app connects…");
  const pool = new pg.Pool({ connectionString: pooler, ssl: sslConfig(pooler), connectionTimeoutMillis: 10_000, max: 1 });
  try {
    const res = await pool.query(
      `select count(*)::int as total,
              count(*) filter (where table_name = 'User')::int as user_table
         from information_schema.tables where table_schema = 'public'`,
    );
    const { total, user_table } = res.rows[0];
    if (!user_table) {
      fail(
        `Connected, but there is no User table — ${total} tables found.\n` +
        "  The pooler is pointing at a different project than the direct string. Check both came from\n" +
        "  the same Supabase project.",
      );
    }
    console.log(`  ✓ connected — ${total} tables, User present`);
  } catch (error) {
    fail(`Could not connect through the pooler: ${String(error?.message ?? error)}`);
  } finally {
    await pool.end().catch(() => {});
  }

  rule("Step 4 of 4 — writing .env");
  const envPath = ".env";
  let lines = [];
  if (existsSync(envPath)) {
    copyFileSync(envPath, `${envPath}.backup`);
    console.log("  Backed up the old .env to .env.backup");
    lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  }

  // Replace the existing DATABASE_URL line in place so surrounding comments and
  // the Supabase auth keys survive; append if there was none.
  let replaced = false;
  lines = lines.map((line) => {
    if (/^\s*DATABASE_URL\s*=/.test(line)) {
      replaced = true;
      return `DATABASE_URL="${pooler}"`;
    }
    return line;
  });
  if (!replaced) lines.push(`DATABASE_URL="${pooler}"`);

  writeFileSync(envPath, lines.join("\n"));
  console.log(`  ✓ DATABASE_URL ${replaced ? "updated" : "added"} in .env`);

  rule("Done locally. Now Vercel.");
  console.log(`Your live site has its own copy of every variable — this changed only your machine.

Run these, pasting the POOLER string when asked for the value:

  npx vercel env rm DATABASE_URL production
  npx vercel env rm DATABASE_URL preview
  npx vercel env add DATABASE_URL production

Then check the type column says Encrypted, not Secret:

  npx vercel env ls

Then deploy and verify:

  npx vercel --prod
  curl -s https://www.podtracker.studio/api/health/db

One last thing, and skipping it causes a confusing bug: delete the existing users
in Supabase > Authentication > Users. Their logins live in Supabase but their
profile rows were in Neon, so against this empty database they would sign in
successfully and the site would still treat them as strangers — and they could
not sign up again, because the email is taken.
`);

  rl.close();
}

main().catch((error) => fail(String(error?.message ?? error)));
