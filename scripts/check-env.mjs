/**
 * Which database does each env file point at? — `npm run check:env`
 *
 * **Why this exists.** On 2026-11-15 `prisma migrate deploy` applied the
 * notifications migration to a Neon database that was abandoned on 2026-09-11.
 * It reported complete success, because it was a complete success — against the
 * wrong database. Production stayed broken and nothing said so.
 *
 * The trap is that two different things read two different files:
 *
 * - **Next.js** prefers `.env.local` over `.env`, so the app can be talking to
 *   one database.
 * - **The Prisma CLI** goes through `prisma.config.ts`, which does
 *   `import "dotenv/config"` — and that loads `.env` and nothing else. So
 *   `migrate deploy` can be talking to another.
 *
 * A stale `.env` therefore breaks migrations while the site keeps working, and
 * the only visible symptom is a migration that succeeds against a database
 * nobody uses.
 *
 * **Prints hosts, never passwords.** The whole point is to be safe to paste
 * into a chat or an issue.
 */
import { existsSync, readFileSync } from "node:fs";

// In the order Next.js resolves them: the first file to define a variable wins.
// `.env.local` is not loaded when NODE_ENV is "test", but nothing here runs
// under test, so the simple order is the honest one.
const FILES = [".env.development.local", ".env.local", ".env.development", ".env"];

function heading(text) {
  console.log(`\n${text}\n${"-".repeat(text.length)}`);
}

/** Pull one variable out of an env file without evaluating anything in it. */
function readVar(path, name) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return null;
  }
  // Last definition wins, the same way dotenv treats a repeated key.
  let found = null;
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (!match || match[1] !== name) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    found = value;
  }
  return found;
}

/** Host, port and database name. Never the user or the password. */
function describe(url) {
  if (!url) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { bad: true };
  }
  const host = parsed.hostname;
  const port = parsed.port || "5432";
  const database = parsed.pathname.replace(/^\//, "") || "(none)";

  let provider = "unknown";
  if (host.endsWith(".neon.tech")) provider = "NEON";
  else if (host.includes("supabase")) provider = "Supabase";
  else if (["localhost", "127.0.0.1", "::1"].includes(host)) provider = "local";

  return { host, port, database, provider };
}

heading("Which env files exist, and where each points");

const seen = [];
for (const file of FILES) {
  if (!existsSync(file)) continue;
  const info = describe(readVar(file, "DATABASE_URL"));
  seen.push({ file, info });

  if (!info) {
    console.log(`  ${file.padEnd(28)} exists, but sets no DATABASE_URL`);
  } else if (info.bad) {
    console.log(`  ${file.padEnd(28)} DATABASE_URL is not a valid URL`);
  } else {
    console.log(
      `  ${file.padEnd(28)} ${info.provider.padEnd(9)} ${info.host}:${info.port}  db=${info.database}`,
    );
  }
}

if (seen.length === 0) {
  console.log("  None. Nothing here can reach a database.");
  process.exit(1);
}

// ── Who reads what ──
heading("Which one each tool actually uses");

const withUrl = seen.filter((s) => s.info && !s.info.bad);
const appFile = withUrl[0];
const prismaFile = withUrl.find((s) => s.file === ".env");

console.log(`  The app (Next.js)   -> ${appFile ? appFile.file : "nothing"}`);
console.log(`  prisma migrate      -> ${prismaFile ? ".env" : "nothing — prisma.config.ts loads .env only"}`);

if (!prismaFile) {
  console.log("\nThere is no .env, so `prisma migrate deploy` has no database to reach.");
  console.log("prisma.config.ts loads .env and only .env — it does not read .env.local.");
  process.exit(1);
}

// ── The thing that actually bit ──
heading("Do they agree?");

if (appFile && prismaFile && appFile.file !== prismaFile.file) {
  const a = appFile.info;
  const p = prismaFile.info;
  if (a.host !== p.host || a.database !== p.database) {
    console.log("NO. The app and the migration tool point at DIFFERENT databases.");
    console.log("");
    console.log(`  app        ${a.provider}  ${a.host}  db=${a.database}`);
    console.log(`  migrations ${p.provider}  ${p.host}  db=${p.database}`);
    console.log("");
    console.log("This is the failure that is easy to miss: migrations apply cleanly,");
    console.log("report success, and change a database the site never reads. Fix .env");
    console.log("so it names the same database the app uses.");
    process.exit(1);
  }
  console.log("Yes — different files, but the same database.");
} else {
  console.log("Only one file is in play, so there is nothing to disagree.");
}

// ── Is it the database this project actually runs on? ──
heading("Is it the right kind of database?");

const target = prismaFile.info;
if (target.provider === "NEON") {
  console.log("This points at NEON, which this project stopped using on 2026-09-11.");
  console.log("");
  console.log("Anything applied here changes a database nothing reads. The live site");
  console.log("runs on Supabase, and its connection string lives in Vercel's");
  console.log("environment variables, not in this file.");
  console.log("");
  console.log("Getting the right string is harder than it should be, and both");
  console.log("obvious routes are dead ends. Recorded here so nobody loses an");
  console.log("evening rediscovering them:");
  console.log("");
  console.log("  * VERCEL holds the production string, but as a **Secret**.");
  console.log("    Sensitive variables there are write-only: the dashboard will");
  console.log("    not show one, `vercel env pull` cannot retrieve one, and the");
  console.log("    copy button copies the variable's NAME. Not a UI quirk.");
  console.log("  * SUPABASE's Connect > ORM panel gives the hostname but prints");
  console.log("    [YOUR-PASSWORD] instead of the password. `env:from-clipboard`");
  console.log("    fills that in from whatever password .env already holds —");
  console.log("    the wrong database's, here — and the failure reads as");
  console.log("    'password authentication failed'.");
  console.log("");
  console.log("FIX: ask whoever set DATABASE_URL in Vercel for the string, or");
  console.log("     reset the database password in Supabase and update Vercel's");
  console.log("     copy in the same sitting (the live site is down in between).");
  console.log("");
  console.log("     To apply a migration WITHOUT any of that, paste it into");
  console.log("     Supabase's SQL Editor — being logged in is the only");
  console.log("     credential needed. docs/apply-notifications-by-hand.sql is");
  console.log("     a worked example, including the _prisma_migrations row that");
  console.log("     keeps `migrate deploy` from re-running it later.");
  process.exit(1);
}
if (target.provider === "local") {
  console.log("This points at a local database. Fine for development, but migrations");
  console.log("applied here do nothing for the live site.");
} else if (target.provider === "Supabase") {
  console.log(`Supabase, on port ${target.port}.`);
  if (target.port === "6543") {
    console.log("");
    console.log("WARNING: 6543 is transaction mode. This app needs the SESSION pooler");
    console.log("on 5432 — transaction mode breaks the interactive transactions in");
    console.log("/api/log and /api/favorites.");
    process.exit(1);
  }
  console.log("Session pooler, which is what this app needs.");
} else {
  console.log(`Host ${target.host} — not recognised as Supabase, Neon or local.`);
  console.log("Check it is the database the live site uses before migrating it.");
}
