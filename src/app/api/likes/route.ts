import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * Like / unlike a review or a list.
 *
 * **Reviews and lists only.** Sasha's call: podcasts and episodes are *rated*,
 * not liked. He may add likes for them later, which is why the table takes a
 * nullable target rather than being named after either one.
 *
 * A "review" is a `LogEntry` carrying `reviewText` — there is no separate
 * table — so the id here is a `LogEntry` id, same as `/review/[id]` uses.
 */

/** Exactly one target, and it must exist. Returns null when the body is bad. */
async function resolveTarget(body: unknown) {
  const { logEntryId, listId } = (body ?? {}) as { logEntryId?: string; listId?: string };
  // Both or neither is a caller bug, not a thing to guess at.
  if (Boolean(logEntryId) === Boolean(listId)) return null;

  if (logEntryId) {
    const entry = await db.logEntry.findUnique({ where: { id: String(logEntryId) }, select: { id: true } });
    return entry ? { logEntryId: entry.id, listId: null } : null;
  }
  const list = await db.list.findUnique({ where: { id: String(listId) }, select: { id: true, isWatchlist: true } });
  // Next listening is a List, but it is nobody's to like — it isn't published.
  return list && !list.isWatchlist ? { logEntryId: null, listId: list.id } : null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const target = await resolveTarget(await request.json().catch(() => null));
  if (!target) return NextResponse.json({ error: "Pass exactly one of logEntryId or listId." }, { status: 400 });

  // Liking twice is the same as liking once — the composite uniques make that
  // true at the database level, and this makes a double click a no-op rather
  // than an error.
  const existing = await db.like.findFirst({
    where: { userId: user.id, ...target },
    select: { id: true },
  });
  if (!existing) await db.like.create({ data: { userId: user.id, ...target } });

  const count = await db.like.count({ where: target });
  return NextResponse.json({ ok: true, liked: true, count });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const target = await resolveTarget(await request.json().catch(() => null));
  if (!target) return NextResponse.json({ error: "Pass exactly one of logEntryId or listId." }, { status: 400 });

  await db.like.deleteMany({ where: { userId: user.id, ...target } });

  const count = await db.like.count({ where: target });
  return NextResponse.json({ ok: true, liked: false, count });
}
