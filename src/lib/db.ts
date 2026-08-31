import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Postgres over **port 443**, not 5432.
 *
 * **Why this isn't plain `pg`.** Neon's normal endpoint is Postgres on 5432, and
 * plenty of networks don't allow that port — Sasha's university guest wifi
 * throttles it, so on 2026-08-31 every page died with
 * `PrismaClientKnownRequestError: Server has closed the connection`. Measured
 * against the same host at the same moment: **443 connected in 0.06s, 5432 took
 * 7.7s to handshake and was then reset at 19.3s, six attempts running.**
 *
 * `@neondatabase/serverless` tunnels the Postgres protocol over a WebSocket to
 * Neon's proxy on 443, so it works anywhere HTTPS does.
 *
 * **It must be the WebSocket `Pool`, not the HTTP `neon()` driver.** The HTTP
 * one cannot do interactive transactions, and `/api/log` and `/api/favorites`
 * both use `db.$transaction` — a log that recorded a diary entry but silently
 * dropped the rating would be exactly the kind of quiet wrong this codebase
 * avoids elsewhere.
 *
 * **Migrations still use 5432.** `prisma migrate` and `prisma studio` connect
 * through `prisma.config.ts` with Prisma's own engine, which this adapter does
 * not touch. On a network that blocks 5432 the app runs but migrations don't.
 */
neonConfig.poolQueryViaFetch = false; // keep transactions on the WebSocket path

// Reused across Next.js dev-mode hot reloads so we don't open a new connection
// pool on every file change (Prisma 7 requires an explicit driver adapter).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // PrismaNeon takes the pool *config* and owns the pool itself — passing a
  // constructed Pool type-errors.
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
