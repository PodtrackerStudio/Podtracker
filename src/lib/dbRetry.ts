/**
 * Retry for database work that failed before it ever reached the database.
 *
 * **Why this exists.** On 2026-09-26 the live profile page returned a server
 * error while every other page carried on — because it is the only page that
 * reads this database, so a connection problem lasting a moment is visible
 * there and nowhere else. A page that fails on the first refused connection
 * turns a blip into an outage for whoever happened to load it.
 *
 * **Only connection failures are retried.** A query that reached Postgres and
 * came back wrong will come back wrong again: retrying it wastes the user's
 * time and hides the bug. The test below matches the errors that mean "no
 * connection was available" — which is exactly what pool exhaustion looks like,
 * and exactly the case where trying again a moment later usually works.
 *
 * **Not a substitute for enough connections.** `db.ts` caps the pool so
 * instances cannot exhaust the pooler between them; this covers the window
 * while a connection frees up. If retries are routinely being used, the pool
 * is the thing to look at.
 */

/** Errors meaning the query never ran, so running it again is safe. */
function isTransientConnectionError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);

  return (
    /Can't reach database server/i.test(message) ||
    /DatabaseNotReachable/i.test(message) ||
    /Connection terminated/i.test(message) ||
    /Server has closed the connection/i.test(message) ||
    /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE/i.test(message) ||
    /timeout exceeded when trying to connect/i.test(message)
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `work`, retrying only if it failed to get a connection.
 *
 * Two retries at 150ms and 400ms. Short because someone is waiting on a page
 * render, and few because a pooler that is still refusing after half a second
 * is having a real outage — at which point failing is the honest answer and the
 * caller should say so rather than spin.
 */
export async function withDbRetry<T>(work: () => Promise<T>, label: string): Promise<T> {
  const delays = [150, 400];

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      if (attempt >= delays.length || !isTransientConnectionError(error)) throw error;

      // Logged so a page that recovered still leaves evidence. A profile that
      // renders after two retries looks perfectly healthy from outside, and
      // that is the signal that the pool is too small.
      console.warn(
        `[${label}] no database connection (attempt ${attempt + 1}), retrying in ${delays[attempt]}ms`,
      );
      await sleep(delays[attempt]);
    }
  }
}
