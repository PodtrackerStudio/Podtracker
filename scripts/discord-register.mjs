/**
 * Register the bot's slash commands with Discord: `npm run discord:register`.
 *
 * Run once after creating the Discord app, and again whenever
 * `src/lib/discord/commands.json` changes. It replaces the whole command set,
 * so a command removed from the JSON disappears from Discord too.
 *
 * Reads from `.env`:
 *   DISCORD_APPLICATION_ID  required
 *   DISCORD_BOT_TOKEN       required, and only ever needed by this script
 *   DISCORD_GUILD_ID        optional. Registers in that one server, where
 *                           commands appear immediately. Without it they are
 *                           global and can take up to an hour to show up.
 *
 * See `docs/discord-bot.md` for the full setup.
 */
import commands from "../src/lib/discord/commands.json" with { type: "json" };

const appId = process.env.DISCORD_APPLICATION_ID?.trim();
const token = process.env.DISCORD_BOT_TOKEN?.trim();
const guildId = process.env.DISCORD_GUILD_ID?.trim();

if (!appId || !token) {
  console.error("Set DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN in .env first. See docs/discord-bot.md.");
  process.exit(1);
}

const url = guildId
  ? `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`
  : `https://discord.com/api/v10/applications/${appId}/commands`;

const res = await fetch(url, {
  method: "PUT",
  headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(commands),
});

if (!res.ok) {
  console.error(`Discord refused (${res.status}):`, await res.text());
  if (res.status === 401) console.error("→ The bot token is wrong. Reset it under Bot in the developer portal.");
  if (res.status === 403 && guildId) console.error("→ The bot isn't in that server yet. Invite it first (docs/discord-bot.md step 3).");
  process.exit(1);
}

const registered = await res.json();
console.log(`Registered ${registered.length} command(s) ${guildId ? `in server ${guildId}` : "globally"}:`);
for (const c of registered) console.log(`  /${c.name} — ${c.description}`);
