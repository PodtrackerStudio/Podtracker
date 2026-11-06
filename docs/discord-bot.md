# Discord analytics bot

Slash commands in Discord that answer with how the site is doing:

| Command | Answers with | Source |
| --- | --- | --- |
| `/traffic [period]` | Visitors, page views, and a day-by-day (or hour-by-hour) chart | Vercel Web Analytics |
| `/toppages [period]` | The 10 most-visited pages | Vercel Web Analytics |
| `/referrers [period]` | The sites sending visitors here | Vercel Web Analytics |
| `/stats` | Accounts, active accounts, logs, reviews, ratings, follows, lists | Podtracker's database |

`period` is 24 hours, 7 days (the default) or 30 days. Analytics numbers are
production traffic only.

## How it works

There is no bot process to host. Discord sends each command to
`https://<site>/api/discord` (`src/app/api/discord/route.ts`), which:

1. checks Discord's signature, and refuses with 401 if it doesn't match;
2. checks the user is on `DISCORD_ALLOWED_USER_IDS`, and otherwise replies
   privately with their id so they can be added;
3. answers "thinking…" at once, because Discord allows only 3 seconds;
4. fetches the numbers and edits that message with them.

The code lives in `src/lib/discord/`. To add a command, add it to
`commands.json`, handle it in `replies.ts`, and run `npm run discord:register`.

## Setup (one time, about 10 minutes)

### 1. Create the Discord app

1. Go to https://discord.com/developers/applications → **New Application** →
   name it "Podtracker".
2. On **General Information**, copy the **Application ID** and the
   **Public Key**.
3. On **Bot**, click **Reset Token** and copy the token. Treat it like a
   password: it goes in your local `.env` only, never in Vercel and never in a
   chat or commit.

### 2. Add the environment variables

**In Vercel** (Project → Settings → Environment Variables, Production):

| Variable | Value |
| --- | --- |
| `DISCORD_PUBLIC_KEY` | Public Key from step 1 |
| `DISCORD_APPLICATION_ID` | Application ID from step 1 |
| `DISCORD_ALLOWED_USER_IDS` | Comma-separated Discord user ids (see below) |
| `VERCEL_ACCESS_TOKEN` | vercel.com → Account Settings → Tokens → Create. Scope it to the team that owns Podtracker. |
| `VERCEL_PROJECT_ID` | Project → Settings → General → Project ID |
| `VERCEL_TEAM_ID` | Team → Settings → General → Team ID. Leave unset if the project is on a personal account. |

Then **redeploy**, since environment variables only reach new deployments.

**In your local `.env`**, for the registration script only:
`DISCORD_APPLICATION_ID`, `DISCORD_BOT_TOKEN`, and optionally
`DISCORD_GUILD_ID` (the server id).

**Finding a Discord user id:** the easiest way is to leave
`DISCORD_ALLOWED_USER_IDS` empty at first, run any command, and copy the id
from the refusal. Or turn on Developer Mode in Discord, then right-click a
name → Copy User ID.

### 3. Invite the bot to the server

Developer portal → **OAuth2** → **URL Generator** → tick `applications.commands`
and `bot` (no bot permissions needed) → open the URL → pick the server.

### 4. Point Discord at the site

Developer portal → **General Information** → **Interactions Endpoint URL** →
`https://www.podtracker.studio/api/discord` → **Save**.

Discord tests the URL when you save. If it refuses, the deploy doesn't have
`DISCORD_PUBLIC_KEY` yet, or it is wrong.

### 5. Register the commands

```bash
npm run discord:register
```

With `DISCORD_GUILD_ID` set, the commands appear in that server immediately.
Without it they are global and can take up to an hour to appear.

## When something goes wrong

The bot reports problems in the reply itself, for example a missing or expired
Vercel token, or Analytics not enabled. Anything else is logged in Vercel's
Logs tab under `[discord]`.

`DISCORD_API_BASE` exists only for testing the route against a local stand-in.
Never set it in production.
