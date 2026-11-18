import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, clientKey, RATE_LIMITED_MESSAGE } from "@/lib/rateLimit";

/**
 * The feedback form at `/contact`.
 *
 * **Two delivery paths, deliberately.** A Discord webhook, because that is
 * somewhere Sasha already is and a message nobody reads is the same as no
 * message; and a `Feedback` row, because the privacy policy points people here
 * to exercise their rights and a channel that can silently drop a request is a
 * compliance problem.
 *
 * **Either one succeeding is a success.** Notifications taught this project the
 * cost of the alternative: they were written in the same transaction as the
 * follow, the table did not exist in production, and the whole feature failed
 * silently for days. So the paths are independent, and this route only reports
 * failure when *both* have failed — at which point it says so, rather than
 * thanking someone for a message that went nowhere.
 *
 * It works with no migration applied and no webhook configured — but not with
 * neither. That combination is reported honestly to the sender.
 */

/** Unauthenticated, and it writes. Generous enough for a real person who sends
 *  two or three, tight enough that a bot is not worth the trouble. */
const FEEDBACK_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000, blockMs: 30 * 60 * 1000 };

const MAX_MESSAGE = 5000;
const MAX_NAME = 100;
const MAX_EMAIL = 200;

/** Discord rejects a payload over 2000 characters outright. */
const DISCORD_MAX = 1900;

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

/**
 * Posts to the Discord webhook, if one is configured.
 *
 * `allowed_mentions: { parse: [] }` is not optional. Without it anyone could
 * type `@everyone` into the feedback box and ping the whole server — the
 * message is attacker-controlled text being posted by a trusted integration,
 * which is exactly the shape that gets abused.
 */
async function postToDiscord(fields: {
  name: string | null;
  email: string | null;
  message: string;
  username: string | null;
}): Promise<boolean> {
  const webhook = process.env.DISCORD_FEEDBACK_WEBHOOK_URL;
  if (!webhook) return false;

  const who = fields.username
    ? `**${fields.name ?? "—"}** (signed in as ${fields.username})`
    : `**${fields.name ?? "—"}** (not signed in)`;

  const body =
    `**New feedback**\n${who}\n` +
    `Email: ${fields.email ?? "not given"}\n\n` +
    fields.message.slice(0, DISCORD_MAX);

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: body, allowed_mentions: { parse: [] } }),
      // Discord being slow must not hold the sender's request open; the row in
      // the database is the copy that matters.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error(`[feedback] discord webhook returned ${res.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[feedback] discord webhook failed:", error);
    return false;
  }
}

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "feedback"), FEEDBACK_LIMIT);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: RATE_LIMITED_MESSAGE },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => ({}));

  // The honeypot. `website` is hidden from people and ignored by them; a bot
  // filling every field it finds trips it. Answering 200 is deliberate — a bot
  // told it failed will retry with the field blank, whereas one told it
  // succeeded moves on.
  if (clean((body as { website?: unknown }).website, 50)) {
    return NextResponse.json({ ok: true });
  }

  const message = clean((body as { message?: unknown }).message, MAX_MESSAGE);
  if (!message) {
    return NextResponse.json({ error: "Please write a message first." }, { status: 400 });
  }

  const name = clean((body as { name?: unknown }).name, MAX_NAME);
  const email = clean((body as { email?: unknown }).email, MAX_EMAIL);

  // Deliberately loose. The address is optional and unverified — it exists so a
  // reply is possible, not as identity — so the only thing worth rejecting is
  // something that obviously is not an address and would waste a reply.
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "That email address doesn't look right. Leave it blank if you'd rather not say." },
      { status: 400 },
    );
  }

  // The session, never the form, decides who this is from. A name typed into a
  // box is not identity and must not be shown as though it were.
  const viewer = await getCurrentUser().catch(() => null);

  const [stored, announced] = await Promise.all([
    db.feedback
      .create({
        data: { name, email, message, userId: viewer?.id ?? null },
        select: { id: true },
      })
      .then(() => true)
      .catch((error) => {
        console.error(
          "[feedback] could not store the message. If this is P2021 (table does " +
            "not exist), the feedback migration has not been applied here:",
          error,
        );
        return false;
      }),
    postToDiscord({ name, email, message, username: viewer?.username ?? null }),
  ]);

  if (!stored && !announced) {
    // Nothing received it. Saying "thanks!" here is the failure mode this
    // project has already paid for once.
    return NextResponse.json(
      {
        error:
          "Sorry — we couldn't get your message through just now. " +
          "Please email podtracker13@gmail.com instead.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
