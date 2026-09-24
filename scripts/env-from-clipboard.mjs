/**
 * `pbpaste | node scripts/env-from-clipboard.mjs`
 *
 * Reads the `.env.local` block copied from Supabase's **Connect > ORM** tab and
 * writes `.env` from it. Exists because reconstructing that connection string
 * by hand cost this project several days: the pooler hostname carries a shard
 * number (`aws-0-` / `aws-1-`) that cannot be derived from the region, and
 * guessing it produces "password authentication failed" — Supavisor reports an
 * unknown tenant exactly like a bad password, so the error sends you off to
 * reset a password that was never wrong.
 *
 * Never prints the password.
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";

let input = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) input += chunk;

// Supabase labels the SESSION pooler as DIRECT_URL and the TRANSACTION pooler
// as DATABASE_URL, because that is what Prisma's own docs expect. This app
// needs session mode for DATABASE_URL — transaction mode breaks the
// interactive transactions in /api/log — so the mapping is deliberately
// crossed over here.
const session = input.match(/DIRECT_URL\s*=\s*"([^"]+)"/);
const transaction = input.match(/DATABASE_URL\s*=\s*"([^"]+)"/);

if (!session && !transaction) {
  console.error("Nothing found in the clipboard. Click the Copy button on the .env.local block first.");
  process.exit(1);
}
if (!session) {
  console.error("Only found the transaction-pooler string (port 6543). This app needs the session");
  console.error("pooler. Make sure you copied the whole block, including the DIRECT_URL line.");
  process.exit(1);
}

let url = session[1];
const parsed = new URL(url);

if (parsed.port === "6543") {
  console.error("That string is on port 6543 — transaction mode. Needs the session pooler on 5432.");
  process.exit(1);
}
// Supabase's panel ships a placeholder rather than the real password. The
// hostname is the part we could not work out; the password is already sitting
// in .env from an earlier attempt, so carry it across rather than making
// someone retype a secret and risk a transcription error.
if (/\[YOUR-PASSWORD\]/i.test(url) || !parsed.password) {
  let carried = null;
  if (existsSync(".env")) {
    const previous = readFileSync(".env", "utf8").match(/^\s*DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
    if (previous) {
      try {
        const old = new URL(previous[1]);
        if (old.password && !/\[YOUR-PASSWORD\]/i.test(old.password)) carried = old.password;
      } catch {
        // Unparseable previous value — nothing to carry.
      }
    }
  }
  if (!carried) {
    console.error("The copied string has a [YOUR-PASSWORD] placeholder and .env has no password to");
    console.error("carry over. Open .env after this and replace the placeholder by hand.");
  } else {
    parsed.password = carried;
    url = parsed.toString();
    if (!/[?&]sslmode=/i.test(url)) url += (url.includes("?") ? "&" : "?") + "sslmode=no-verify";
    console.log("  (kept the password already in .env — only the host changed)");
  }
}

// Supabase's pooler certificate is not in the system trust store, so without
// this every connection fails at TLS before authentication is even attempted.
if (!/[?&]sslmode=/i.test(url)) {
  url += (url.includes("?") ? "&" : "?") + "sslmode=no-verify";
}

const envPath = ".env";
let lines = [];
if (existsSync(envPath)) {
  copyFileSync(envPath, `${envPath}.backup`);
  lines = readFileSync(envPath, "utf8").split(/\r?\n/);
}

let replaced = false;
lines = lines.map((l) => {
  if (/^\s*DATABASE_URL\s*=/.test(l)) {
    replaced = true;
    return `DATABASE_URL="${url}"`;
  }
  return l;
});
if (!replaced) lines.unshift(`DATABASE_URL="${url}"`);

for (const [key, value] of [
  ["NEXT_PUBLIC_SUPABASE_URL", "https://tafcanleuusoqsawsqup.supabase.co"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_izF9DVAcdeBAMo7eLo8p1A_TzhJCYyr"],
  ["NEXT_PUBLIC_SITE_URL", "http://localhost:3000"],
]) {
  if (!lines.some((l) => new RegExp(`^\\s*${key}\\s*=`).test(l))) lines.push(`${key}="${value}"`);
}

writeFileSync(envPath, lines.join("\n"));

console.log("Wrote .env");
console.log("  host    :", parsed.hostname);
console.log("  port    :", parsed.port || "5432");
console.log("  user    :", parsed.username);
console.log("  password:", parsed.password ? `present (${parsed.password.length} chars)` : "MISSING");
console.log("  sslmode : no-verify appended");
console.log("\nNow run:  npm run check:db");
