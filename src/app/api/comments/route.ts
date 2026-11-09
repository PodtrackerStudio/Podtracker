import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, COMMENT_LIMIT } from "@/lib/rateLimit";

const MAX_LENGTH = 2000;

/**
 * Post a comment on a review or a list.
 *
 * A "review" is a `LogEntry` carrying `reviewText`, so review comments point at
 * `logEntryId`. Exactly one of `logEntryId` / `listId` is accepted — the schema
 * allows either, and the application layer is what keeps it to one.
 *
 * The target is verified to exist before writing, so a bad id returns 404
 * rather than a foreign-key error.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  // Per account, so one account can't flood a thread, and so people sharing
  // an IP (a campus network) don't throttle each other.
  const limited = rateLimit(`comment:${user.id}`, COMMENT_LIMIT);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "You're commenting very fast. Take a breather and try again in a minute." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  const { logEntryId, listId, text } = await request.json().catch(() => ({}));

  const body = typeof text === "string" ? text.trim() : "";
  if (!body) return NextResponse.json({ error: "Comment cannot be empty." }, { status: 400 });
  if (body.length > MAX_LENGTH) {
    return NextResponse.json({ error: `Comments are limited to ${MAX_LENGTH} characters.` }, { status: 400 });
  }

  if (Boolean(logEntryId) === Boolean(listId)) {
    return NextResponse.json({ error: "Provide exactly one of logEntryId or listId." }, { status: 400 });
  }

  try {
    if (logEntryId) {
      const target = await db.logEntry.findUnique({ where: { id: String(logEntryId) }, select: { id: true } });
      if (!target) return NextResponse.json({ error: "That review no longer exists." }, { status: 404 });
    } else {
      const target = await db.list.findUnique({ where: { id: String(listId) }, select: { id: true, isWatchlist: true } });
      // A Next listening list is private and has no page, so nobody can be
      // commenting on it legitimately. Same rule as /api/likes.
      if (!target || target.isWatchlist) {
        return NextResponse.json({ error: "That list no longer exists." }, { status: 404 });
      }
    }

    const comment = await db.comment.create({
      data: {
        userId: user.id,
        logEntryId: logEntryId ? String(logEntryId) : null,
        listId: listId ? String(listId) : null,
        text: body,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, commentId: comment.id });
  } catch {
    return NextResponse.json({ error: "Could not save that comment." }, { status: 502 });
  }
}
