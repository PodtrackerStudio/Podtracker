# Deploying to Vercel

The repository is ready to deploy. This is what to click, what to paste, and the
handful of things that behave differently in production than on a laptop.

## 1. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables**, for
Production *and* Preview. There is no `.env` in the repository and there never
should be — it is gitignored deliberately.

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | the Supabase **pooler** string, port 5432 — see below |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the **publishable** key |
| `NEXT_PUBLIC_SITE_URL` | the site's public origin, e.g. `https://podtracker.studio` |

### Use the pooler string, on port 5432

Supabase offers three connection strings and only one is correct here.
**Project Settings → Database → Connection string.**

| String | Host / port | Use it? |
| --- | --- | --- |
| Direct | `db.<ref>.supabase.co:5432` | Only for `prisma migrate`. Runs out of connections in production. |
| Pooler, transaction mode | `...pooler.supabase.com:6543` | **No.** Breaks interactive transactions. |
| Pooler, session mode | `...pooler.supabase.com:5432` | **Yes.** |

Every serverless invocation can open its own connection, so the direct endpoint
runs out under any real traffic. Transaction mode pools but returns the
connection after each individual statement, which breaks the `$transaction`
calls in `/api/log` and `/api/favorites` — the ones that stop a log recording a
diary entry while silently dropping the rating. Session mode is pooled and keeps
the connection, which is what the app needs.

The pooler's username is `postgres.<project-ref>`, not plain `postgres`.
Copying the direct string's username onto the pooler host fails exactly like a
wrong password.

`npm run check:db` checks every one of these and names what is wrong.

### One thing Supabase cannot do that Neon could

Neon was reached over a WebSocket on **port 443**, the same port as HTTPS, which
meant it worked on networks that block database traffic. On 2026-08-31 that was
not hypothetical: Sasha's university wifi throttled port 5432 and every page
died. Measured at the time — 443 connected in 0.06s, 5432 was reset at 19.3s.

Supabase has no port-443 transport. **On a network that blocks outbound 5432
this app cannot reach its database.** If the site works everywhere except one
network, that is the cause, and it is a reason to reconsider the choice rather
than a bug to hunt.

### `NEXT_PUBLIC_SITE_URL` is not optional in production

It is what password-reset links are built from. Without it the app falls back to
`x-forwarded-proto`/`x-forwarded-host` and then to the request URL, and behind
Vercel's TLS termination that can produce an `http://` link — downgraded, and
refused by Supabase's redirect allow-list. Set it explicitly and the question
never arises. No trailing slash.

### Never set `SUPABASE_SERVICE_ROLE_KEY`

This app does not use it and must not. Anything prefixed `NEXT_PUBLIC_` is
compiled into the JavaScript sent to browsers; the service-role key bypasses
every security rule in the project.

## 2. Supabase settings

Two things the code cannot set for you.

**Authentication → URL Configuration**
- **Site URL**: your production origin
- **Redirect URLs**: add `https://your-domain.com/**` — *and* keep
  `http://localhost:3000/**` so local development still works. Preview
  deployments need `https://*.vercel.app/**` if you want reset links working
  there too.

**Authentication → Sign In / Providers → Email**
- **Confirm email**: turn this **on** before real users. It was off for
  development. Leaving it off lets anyone register an address they don't own.
- Supabase's built-in mailer is rate-limited to a few messages an hour and is
  meant for testing. Before launch, connect a real SMTP provider under
  **Project Settings → Auth → SMTP Settings**, or password resets will silently
  fail for most people.

## 3. Deploy

Import the GitHub repository in Vercel. Framework preset **Next.js**; everything
else is detected. The build runs `npm install` — which triggers
`postinstall: prisma generate` — and then `next build`.

**That postinstall is load-bearing.** The Prisma client is generated into
`src/generated/prisma`, which is gitignored, so Vercel's checkout does not have
it. Without the hook the build fails with `Module not found: Can't resolve
'@/generated/prisma/client'`. Verified by deleting the directory and running a
clean install and build.

## 4. Migrations

They are **not** run by the build, deliberately: a migration failing mid-deploy
leaves the schema half-applied and the deploy broken, and `prisma migrate deploy`
against a pooled connection is unreliable.

Run them yourself, using the **direct** connection string — `prisma migrate`
needs a real session and will not work reliably through the pooler:

```bash
DATABASE_URL="<direct string>" npx prisma migrate deploy
```

The database is shared between local development and production unless you make
a second Supabase project, so a migration run locally has already been applied.

## 5. Things that behave differently in production

**The rate limiter is per-instance.** `src/lib/rateLimit.ts` keeps its state in
process memory. On Vercel each serverless instance has its own, so an attacker
spread across instances gets a fresh allowance on each. It raises the cost of
brute force; it does not cap it. Supabase applies its own limits to auth
endpoints underneath, which is the real protection. A durable limiter needs
shared storage.

**`console.error` goes to Vercel's log drain**, not a terminal. The auth routes
log the raw Supabase message on failure; that is where to look when a signup
fails in production.

**Cold starts are visible.** Supabase pauses free-tier projects after a week of
inactivity, and a paused project does not wake on a connection — it has to be
resumed from the dashboard, and until it is, every page that touches the
database fails. The 10s connection timeout in `src/lib/db.ts` is generous for
ordinary slow starts, but it cannot rescue a paused project.

## 6. Before you tell anyone the URL

- **Rotate the database password** if it has ever been pasted into a chat, an
  issue, or a screenshot. Supabase → Project Settings → Database → Reset
  database password. Update it in Vercel *and* your local `.env`, then redeploy.
- **Turn on email confirmation**, with real SMTP behind it.
- **Decide what happens to the current data.** Development and production share
  one database today, so existing test accounts and reviews become real,
  publicly visible content the moment the site is live. Starting production on a
  separate, empty Supabase project is the cleaner option.
- **Set spend limits** on Vercel and Supabase. A bot hammering an API route is a
  more likely source of a surprise bill than real traffic.
