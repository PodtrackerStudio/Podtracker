import { NextResponse, after } from "next/server";
import { isValidDiscordRequest } from "@/lib/discord/verify";
import { replyFor } from "@/lib/discord/replies";

/**
 * The Discord bot: slash commands for site analytics.
 *
 * **No bot process, no separate hosting.** Discord sends each slash command to
 * this URL (the app's "Interactions Endpoint URL"), so the bot is this route
 * and nothing else. Setup is in `docs/discord-bot.md`.
 *
 * **Why it answers twice.** Discord expects a reply within 3 seconds, and a
 * Vercel Analytics query plus a cold start can take longer. So the route
 * answers at once with "deferred" (type 5, which shows "Podtracker is
 * thinking…"), then edits that message once the numbers arrive. The edit is
 * scheduled with `after`, which runs once the response has been sent and is
 * kept alive for `maxDuration` on Vercel.
 *
 * **Who can use it.** Only Discord user ids listed in
 * `DISCORD_ALLOWED_USER_IDS`. Anyone else gets a private refusal that shows
 * their id, so adding someone is a matter of copying it into that variable.
 */

export const maxDuration = 30;

// Overridable only so the reply can be checked against a local stand-in.
// Never set it in production.
const DISCORD_API = process.env.DISCORD_API_BASE?.trim() || "https://discord.com/api/v10";

// Interaction and callback types: https://discord.com/developers/docs/interactions/receiving-and-responding
const PING = 1;
const APPLICATION_COMMAND = 2;
const PONG = 1;
const CHANNEL_MESSAGE = 4;
const DEFERRED_CHANNEL_MESSAGE = 5;
const EPHEMERAL = 1 << 6;

type Interaction = {
  type: number;
  token: string;
  application_id: string;
  data?: { name: string; options?: { name: string; value: unknown }[] };
  member?: { user?: { id: string } };
  user?: { id: string };
};

function allowedUsers(): Set<string> {
  return new Set(
    (process.env.DISCORD_ALLOWED_USER_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export async function POST(request: Request) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY?.trim();
  if (!publicKey) {
    console.error("[discord] DISCORD_PUBLIC_KEY is not set; refusing every interaction.");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  // The signature covers the exact bytes, so read the body as text before
  // parsing it.
  const rawBody = await request.text();
  const valid = isValidDiscordRequest(
    rawBody,
    request.headers.get("x-signature-ed25519"),
    request.headers.get("x-signature-timestamp"),
    publicKey,
  );
  if (!valid) return NextResponse.json({ error: "Bad request signature." }, { status: 401 });

  const interaction = JSON.parse(rawBody) as Interaction;

  // Discord's check when the endpoint URL is saved, and occasionally after.
  if (interaction.type === PING) return NextResponse.json({ type: PONG });

  if (interaction.type !== APPLICATION_COMMAND || !interaction.data) {
    return NextResponse.json({ error: "Unsupported interaction." }, { status: 400 });
  }

  const userId = interaction.member?.user?.id ?? interaction.user?.id ?? "";
  if (!allowedUsers().has(userId)) {
    return NextResponse.json({
      type: CHANNEL_MESSAGE,
      data: {
        flags: EPHEMERAL,
        content: `You're not on this bot's allow-list. To be added, ask someone with access to the Vercel project to add your id \`${userId}\` to \`DISCORD_ALLOWED_USER_IDS\`.`,
      },
    });
  }

  const command = interaction.data.name;
  const options = Object.fromEntries((interaction.data.options ?? []).map((o) => [o.name, o.value]));

  after(async () => {
    const reply = await replyFor(command, options);
    const res = await fetch(
      `${DISCORD_API}/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...reply, allowed_mentions: { parse: [] } }),
      },
    ).catch((error: unknown) => {
      console.error("[discord] could not reach Discord to deliver the reply:", error);
      return null;
    });
    if (res && !res.ok) {
      console.error("[discord] Discord rejected the reply:", res.status, await res.text().catch(() => ""));
    }
  });

  return NextResponse.json({ type: DEFERRED_CHANNEL_MESSAGE });
}
