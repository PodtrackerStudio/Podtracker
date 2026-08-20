import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

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
      const target = await db.list.findUnique({ where: { id: String(listId) }, select: { id: true } });
      if (!target) return NextResponse.json({ error: "That list no longer exists." }, { status: 404 });
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
