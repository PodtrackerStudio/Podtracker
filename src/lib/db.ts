import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Postgres, hosted by Supabase.
 *
 * **Why this is no longer Neon.** Supabase was already here for authentication,
 * and every Supabase project includes a Postgres database — so the app was
 * running two database services and using one of them. Consolidating leaves one
 * dashboard, one connection string, one password to rotate, and puts the app's
 * tables in the same database as the auth users they belong to.
 *
 * **The connection string must be the pooler one.** Supabase publishes two:
 * a direct connection to the database, and one through Supavisor, its pooler.
 * Use the pooler. Every serverless invocation on Vercel can open its own
 * connection, and a direct Postgres endpoint runs out of them under any real
 * traffic. The pooler host contains `pooler.supabase.com`; the direct one does
 * not. `npm run check:db` says which one is configured.
 *
 * **Session mode (5432), not transaction mode (6543).** Both are pooled.
 * Transaction mode hands a connection back after each individual statement,
 * which breaks interactive transactions — and `/api/log` and `/api/favorites`
 * both use `db.$transaction` to make a log that records a diary entry but
 * silently drops the rating impossible. Session mode keeps the connection for
 * the life of the client, so transactions behave normally. It offers fewer
 * concurrent connections, which is the right trade for a site with no user base
 * and a correctness guarantee worth keeping.
 *
 * **A regression to watch for, recorded so it is recognised rather than
 * rediscovered.** Neon was reached over a WebSocket on **port 443**, and that
 * was not an aesthetic choice: on 2026-08-31 Sasha's university wifi throttled
 * port 5432 and every page died with `Server has closed the connection`.
 * Measured against the same host at the same moment: 443 connected in 0.06s,
 * 5432 took 7.7s to handshake and was reset at 19.3s, six attempts running.
 * Supabase offers no port-443 transport, so **on a network that blocks outbound
 * 5432 this app will not reach its database.** If the site works everywhere
 * except one network, this is why, and it is the reason to reconsider the move
 * rather than a bug to hunt.
 */

// Reused across Next.js hot reloads in development so a new connection pool
// isn't opened on every file change (Prisma 7 requires an explicit adapter).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // PrismaPg takes the pool *config* and owns the pool itself — passing an
  // already-constructed Pool type-errors.
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // Bounds *connecting*, not query time, so a slow query is unaffected.
    // Without it an unreachable database hangs the request for ~30s before
    // failing, which on the signup form looked like a broken site rather than
    // an outage. 10s is deliberately generous: a pooler under load or a cold
    // database costs a few seconds, and a tighter bound would turn a normal
    // slow start into an error.
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
