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
 * **It uses the app's connection path on purpose.** `prisma migrate` and
 * `prisma studio` talk to Postgres on port 5432 through Prisma's own engine;
 * the app talks to Neon over a WebSocket on 443. A network that blocks 5432 —
 * university wifi, some corporate networks — breaks the first and not the
 * second, so a Prisma CLI check can fail on a perfectly healthy setup and send
 * you hunting for a problem that is not there.
 */
import { Pool, neonConfig } from "@neondatabase/serverless";

neonConfig.poolQueryViaFetch = false; // same as src/lib/db.ts

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
      user: u.username || "(none)",
      database: u.pathname.replace(/^\//, "") || "(none)",
      hasPassword: Boolean(u.password),
      pooled: u.hostname.includes("-pooler"),
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
  console.log("\nGet the value from Neon > your project > Connection Details >");
  console.log("the POOLED connection string (the host contains '-pooler').");
  process.exit(1);
}

const parts = describe(url);
if (!parts) {
  console.log("Set, but it is not a valid URL. Something was mangled on the way in —");
  console.log("a missing quote, a line break, or a partial paste.");
  console.log("\nFIX: copy the connection string again from Neon and replace it whole.");
  process.exit(1);
}

console.log("Yes.");
console.log(`  host:     ${parts.host}`);
console.log(`  user:     ${parts.user}`);
console.log(`  database: ${parts.database}`);
console.log(`  password: ${parts.hasPassword ? "present" : "MISSING"}`);

if (!parts.hasPassword) {
  console.log("\nThe password is missing from the connection string. That alone will fail.");
  console.log("FIX: copy the full string from Neon — it looks like");
  console.log("     postgresql://user:PASSWORD@host/db?sslmode=require");
}

heading("2. Is it the pooled connection string?");
if (parts.pooled) {
  console.log("Yes — correct for the app.");
} else {
  console.log("No. The host has no '-pooler' in it.");
  console.log("This is not why it is failing, but fix it before real traffic:");
  console.log("every serverless instance opens its own connection and a direct");
  console.log("endpoint runs out. Neon > Connection Details > Pooled connection.");
}

heading("3. Can we actually connect?");
console.log("Connecting the same way the app does (WebSocket, port 443)…");

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
    console.log("a brand-new Neon project, or a different one from the one you migrated.");
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
    console.log("\nMost likely: the Neon password was rotated and this copy was never");
    console.log("updated. It has to be changed in BOTH places — your local .env and");
    console.log("Vercel's environment variables — and Vercel needs a redeploy after.");
    console.log("\nFIX: Neon > project > Connection Details > copy the pooled string.");
  } else if (
    // "non-101 status code" is the Neon driver's wording, and it is not
    // obvious: it means the WebSocket upgrade never completed, so nothing
    // Postgres-shaped answered. Same class of problem as a DNS failure, and
    // worth matching explicitly — it is what a wrong host actually produces.
    /ENOTFOUND|EAI_AGAIN|getaddrinfo|ECONNREFUSED|timeout|timed out|ETIMEDOUT|non-101|network error/i.test(message)
  ) {
    console.log("Could not reach the host at all — nothing answered.");
    console.log("\nEither the hostname is wrong (a typo, or a string from a deleted");
    console.log("project), the Neon project no longer exists, or this network is");
    console.log("blocking the connection.");
    console.log("\nFIX: check the project still exists in the Neon dashboard, then copy");
    console.log("     its current pooled connection string. If Neon looks healthy, try");
    console.log("     another network — some block outbound database traffic.");
  } else if (/does not exist/i.test(message)) {
    console.log("The server answered but that database or role does not exist on it.");
    console.log("Usually a connection string from a project that was deleted or renamed.");
    console.log("\nFIX: copy the current string from the Neon dashboard.");
  } else {
    console.log("Unrecognised error — the text above is the useful part.");
    console.log("Check the Neon dashboard for the project's status first.");
  }
  process.exit(1);
} finally {
  await pool.end().catch(() => {});
}
