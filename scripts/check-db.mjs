/**
 * Diagnose "We couldn't reach our database" — run with `npm run check:db`.
 *
 * That message is deliberately vague for whoever is trying to sign up, and the
 * real error only ever appears in a server log. On Vercel that means digging
 * through the Logs tab; locally it means having the dev server's terminal in
 * front of you. Neither is much help to someone who just wants to know what to
 * fix, so this connects the same way the app does and says what is wrong in
 * plain words.
 *
 * **It connects the way the app does**, with the same driver and the same
 * connection string, so a result here means the same thing the app would see.
 *
 * Note that since the move from Neon to Supabase, the app and `prisma migrate`
 * both reach Postgres on 5432 — the port-443 WebSocket transport went with
 * Neon. A network that blocks outbound 5432 now breaks both, and this script
 * will report the database as unreachable. That is accurate: on such a network
 * the site genuinely cannot reach its database.
 */
import pg from "pg";

const { Pool } = pg;

function heading(text) {
  console.log(`\n${text}\n${"-".repeat(text.length)}`);
}

// Never print the password, even in a script the developer runs themselves —
// output gets pasted into chats and issues, which is how the last one leaked.
function describe(url) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: u.port || "5432",
      user: u.username || "(none)",
      database: u.pathname.replace(/^\//, "") || "(none)",
      hasPassword: Boolean(u.password),
      // Supabase publishes the pooler as `<region>.pooler.supabase.com` and
      // the direct database as `db.<ref>.supabase.co`. Neon's marker was a
      // `-pooler` suffix, kept here so a leftover Neon string is still
      // classified correctly rather than reported as direct.
      pooled: u.hostname.includes("pooler.supabase.com") || u.hostname.includes("-pooler"),
      transactionMode: u.port === "6543",
      legacyNeon: u.hostname.includes("neon.tech"),
    };
  } catch {
    return null;
  }
}

try {
  process.loadEnvFile(".env");
} catch {
  console.log("No .env file found in this directory — reading the environment instead.");
}

heading("1. Is DATABASE_URL set?");

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("NO. That is the problem.");
  console.log("\nFIX (local):  add a DATABASE_URL line to .env in this folder.");
  console.log("FIX (Vercel): Settings > Environment Variables > add DATABASE_URL,");
  console.log("              scoped to Production and Preview, then redeploy.");
  console.log("\nGet the value from Supabase > Project Settings > Database >");
  console.log("Connection string > the POOLER entry on port 5432 (session mode).");
  process.exit(1);
}

const parts = describe(url);
if (!parts) {
  console.log("Set, but it is not a valid URL. Something was mangled on the way in —");
  console.log("a missing quote, a line break, or a partial paste.");
  console.log("\nFIX: copy the connection string again from Supabase and replace it");
  console.log("     whole. It must be one line, in quotes, with no line break.");
  process.exit(1);
}

console.log("Yes.");
console.log(`  host:     ${parts.host}`);
console.log(`  user:     ${parts.user}`);
console.log(`  database: ${parts.database}`);
console.log(`  password: ${parts.hasPassword ? "present" : "MISSING"}`);

if (!parts.hasPassword) {
  console.log("\nThe password is missing from the connection string. That alone will fail.");
  console.log("FIX: copy the full string from Supabase — it looks like");
  console.log("     postgresql://user:PASSWORD@host/db?sslmode=require");
}

heading("2. Is it the right connection string?");

if (parts.legacyNeon) {
  console.log("This is still a NEON string. The app moved to Supabase Postgres.");
  console.log("It may well connect — the Neon database still exists — but it is");
  console.log("not where the app's data lives now.");
  console.log("\nFIX: Supabase > Project Settings > Database > Connection string.");
} else if (!parts.pooled) {
  console.log("This is the DIRECT connection, not the pooler.");
  console.log("Works locally; runs out of connections in production, because every");
  console.log("serverless instance opens its own.");
  console.log("\nFIX: use the pooler entry — its host contains 'pooler.supabase.com'.");
} else if (parts.transactionMode) {
  console.log("This is the pooler in TRANSACTION mode (port 6543).");
  console.log("Pooled, but it returns the connection after every statement, which");
  console.log("breaks interactive transactions — /api/log and /api/favorites both");
  console.log("use one, so logging a podcast can fail while everything else works.");
  console.log("\nFIX: use the same host on port 5432 (session mode) instead.");
} else {
  console.log("Yes — pooler, session mode. Correct for the app.");
}

heading("3. Can we actually connect?");
console.log(`Connecting the same way the app does, to port ${parts.port || "5432"}…`);

const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 15_000 });
const started = Date.now();

try {
  const result = await pool.query("select current_user, current_database()");
  const ms = Date.now() - started;
  const row = result.rows[0];

  console.log(`\nCONNECTED in ${ms}ms.`);
  console.log(`  connected as: ${row.current_user}`);
  console.log(`  database:     ${row.current_database}`);

  // A reachable database with no tables is its own failure mode, and it looks
  // identical from the signup form: the query throws, the route returns 503.
  const tables = await pool.query(
    "select count(*)::int as n from information_schema.tables where table_schema = 'public'",
  );
  const userTable = await pool.query(
    "select count(*)::int as n from information_schema.tables where table_schema = 'public' and table_name = 'User'",
  );

  console.log(`  tables:       ${tables.rows[0].n} in the public schema`);

  if (userTable.rows[0].n === 0) {
    console.log("\nBut there is no User table, so signup will still fail.");
    console.log("This database is reachable but the schema was never applied to it —");
    console.log("a brand-new Supabase project, or a different one from the one you");
    console.log("migrated. Expected right after the move from Neon.");
    console.log("\nFIX: run the migrations against it, using the DIRECT (non-pooled)");
    console.log("     string, which is what prisma migrate needs:");
    console.log('     DATABASE_URL="<direct string>" npx prisma migrate deploy');
    process.exit(1);
  }

  console.log("\nThe database is healthy and the schema is there.");
  console.log("If signup still fails, the problem is Supabase, not the database —");
  console.log("look for a '[signup] supabase rejected:' line in the log instead.");
} catch (error) {
  const message = String(error?.message ?? error);
  console.log(`\nFAILED after ${Date.now() - started}ms.`);
  console.log(`  ${message}`);

  heading("What that means");

  if (/password authentication failed|authentication failed|SASL|scram/i.test(message)) {
    console.log("The host answered and rejected the credentials. The database is fine;");
    console.log("the username or password in DATABASE_URL is wrong.");
    console.log("\nMost likely the database password was reset and this copy was never");
    console.log("updated. It has to change in BOTH places — your local .env and");
    console.log("Vercel's environment variables — and Vercel needs a redeploy after.");
    console.log("\nNote the pooler username is 'postgres.<project-ref>', not plain");
    console.log("'postgres'. Copying the direct string's username onto the pooler host");
    console.log("fails exactly like a wrong password.");
    console.log("\nFIX: Supabase > Project Settings > Database > Connection string.");
  } else if (
    /ENOTFOUND|EAI_AGAIN|getaddrinfo|ECONNREFUSED|timeout|timed out|ETIMEDOUT|non-101|network error/i.test(message)
  ) {
    console.log("Could not reach the host at all — nothing answered.");
    console.log("\nEither the hostname is wrong, the Supabase project is paused or");
    console.log("deleted, or this network blocks outbound port 5432.");
    console.log("\nThat last one is worth taking seriously since the move off Neon.");
    console.log("Neon was reached over port 443, the same port as HTTPS, so it worked");
    console.log("on networks that block database traffic. Supabase has no equivalent,");
    console.log("and university and corporate wifi commonly block 5432.");
    console.log("\nFIX: check the project is active in the Supabase dashboard and copy");
    console.log("     its current pooler string. If Supabase looks healthy, try another");
    console.log("     network — a phone hotspot is the quickest test.");
  } else if (/does not exist/i.test(message)) {
    console.log("The server answered but that database or role does not exist on it.");
    console.log("Usually a connection string from a project that was deleted or renamed.");
    console.log("\nFIX: copy the current string from the Supabase dashboard.");
  } else {
    console.log("Unrecognised error — the text above is the useful part.");
    console.log("Check the Supabase dashboard for the project's status first.");
  }
  process.exit(1);
} finally {
  await pool.end().catch(() => {});
}
