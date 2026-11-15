/**
 * Diagnose "I followed someone and they never got the notification" —
 * run with `npm run check:notifications`.
 *
 * The follow route writes the notification *after* the follow and treats a
 * failure as non-fatal: following is what the person clicked, and a courtesy to
 * somebody else must not cost them the click. The cost of that choice is that a
 * broken notification is silent — it appears in the server log and nowhere a
 * person would look. This script is the place to look.
 *
 * **It answers one question: was the row ever written?** That splits the
 * problem cleanly in two. If the follow is here and the notification is not,
 * the write failed and the server log for that minute has the reason. If both
 * are here, the write is fine and the fault is in the reading — the recipient's
 * session, or simply a tab they never reloaded.
 *
 * Raw SQL through `pg` rather than Prisma, deliberately: it connects the same
 * way `check:db` does and does not depend on the generated client being current
 * on whoever's machine is running it.
 *
 * **Prints usernames, never email addresses.** Output from scripts like this
 * ends up pasted into chats and issues.
 */
import pg from "pg";

const { Pool } = pg;

// Identical to src/lib/db.ts and scripts/check-db.mjs: `pg` does not enable TLS
// on its own, Supabase refuses connections without it, and the strings Supabase
// hands out carry no `sslmode`.
function sslConfig(connectionString) {
  if (!connectionString) return undefined;
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

function heading(text) {
  console.log(`\n${text}\n${"-".repeat(text.length)}`);
}

function when(value) {
  if (!value) return "—";
  return new Date(value).toISOString().replace("T", " ").slice(0, 19) + "Z";
}

try {
  process.loadEnvFile(".env");
} catch {
  console.log("No .env file found in this directory — reading the environment instead.");
  console.log("If you meant to check your own database, run this from the project folder.");
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("\nDATABASE_URL is not set, so there is nothing to connect to.");
  console.log("Run `npm run check:db` first — it diagnoses that specifically.");
  process.exit(1);
}

const pool = new Pool({ connectionString: url, ssl: sslConfig(url), max: 1 });

async function main() {
  // ── 1. Does the table exist at all? ──
  heading("1. Is the notifications migration applied?");

  const { rows: present } = await pool.query(
    `SELECT to_regclass('public."Notification"') IS NOT NULL AS table_exists,
            EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') AS enum_exists`,
  );

  if (!present[0].table_exists) {
    console.log('The "Notification" table does not exist in this database.');
    console.log("\nThat is the whole explanation: every notification write fails,");
    console.log("is logged, and is swallowed so the follow still works.");
    console.log("\nFIX: from the project folder, run");
    console.log("     npx prisma migrate deploy");
    return;
  }
  console.log('The "Notification" table exists.');
  console.log(
    present[0].enum_exists
      ? "The NotificationType enum exists."
      : "WARNING: the NotificationType enum is missing, which will fail every insert.",
  );

  // ── 2. What is actually in it? ──
  heading("2. The ten most recent notifications");

  const { rows: notes } = await pool.query(
    `SELECT n."createdAt", n."readAt", n.type,
            recipient.username AS recipient,
            actor.username     AS actor
       FROM "Notification" n
       JOIN "User" recipient ON recipient.id = n."userId"
       JOIN "User" actor     ON actor.id     = n."actorId"
      ORDER BY n."createdAt" DESC
      LIMIT 10`,
  );

  if (notes.length === 0) {
    console.log("None at all. Nothing has ever been written to this table.");
  } else {
    for (const n of notes) {
      const state = n.readAt ? `read ${when(n.readAt)}` : "UNREAD";
      console.log(`  ${when(n.createdAt)}  ${n.actor} -> ${n.recipient}  ${n.type}  (${state})`);
    }
  }

  // ── 3. The cross-check that actually answers the question. ──
  //
  // Every follow should have a notification created at about the same moment.
  // A follow listed here with no notification beside it is a write that failed.
  // Note that follows made before the migration ran will all appear here, and
  // that is expected rather than a fault — the table did not exist to write to.
  heading("3. Recent follows, and whether each produced a notification");

  const { rows: follows } = await pool.query(
    `SELECT f."createdAt",
            follower.username  AS follower,
            following.username AS following,
            EXISTS (
              SELECT 1 FROM "Notification" n
               WHERE n."actorId" = f."followerId"
                 AND n."userId"  = f."followingId"
            ) AS has_notification
       FROM "Follow" f
       JOIN "User" follower  ON follower.id  = f."followerId"
       JOIN "User" following ON following.id = f."followingId"
      ORDER BY f."createdAt" DESC
      LIMIT 15`,
  );

  if (follows.length === 0) {
    console.log("Nobody follows anybody yet.");
  } else {
    for (const f of follows) {
      const mark = f.has_notification ? "ok      " : "MISSING ";
      console.log(`  ${mark}${when(f.createdAt)}  ${f.follower} -> ${f.following}`);
    }

    const missing = follows.filter((f) => !f.has_notification).length;
    console.log("");
    if (missing === 0) {
      console.log("Every recent follow has its notification. The write side is working.");
      console.log("If somebody says they did not get one, the fault is on the reading");
      console.log("side: check they are signed in as the account above, and that they");
      console.log("reloaded — the badge is read when a page renders, so it does not");
      console.log("appear on its own in a tab that has been sitting open.");
    } else {
      console.log(`${missing} of these follows has no notification.`);
      console.log("");
      console.log("If they are all old, they predate the migration and that is expected —");
      console.log("the table did not exist to write to, and applying it does not backfill.");
      console.log("");
      console.log("If any of them is recent, the write is failing now. The reason is in");
      console.log("the server log for that minute, on the line beginning");
      console.log('  [user-follow] the follow succeeded but its notification did not');
      console.log("On Vercel: the project's Logs tab, filtered to /api/user/follow.");
    }
  }
}

main()
  .catch((error) => {
    console.log("\nCould not complete the check:");
    console.log(`  ${error?.message ?? error}`);
    console.log("\nIf this is a connection problem rather than a query problem,");
    console.log("`npm run check:db` diagnoses that specifically and names the fix.");
    process.exitCode = 1;
  })
  .finally(() => pool.end());
