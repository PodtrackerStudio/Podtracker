# Supabase Auth — switchover checklist

The groundwork is in place; the switch itself is not made. Today the app still
runs its own bcrypt + database-session auth, and everything Supabase-related
no-ops until `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are
set. Nothing here has been exercised against a real Supabase project — there
isn't one yet — so treat the code as reviewed but unproven.

Decisions already taken (phillipn, 2026-09-06): **Supabase Auth only**, database
stays on Neon, and existing accounts are wiped rather than migrated.

## What is already done

| | |
| --- | --- |
| `@supabase/supabase-js`, `@supabase/ssr` | installed |
| `src/lib/supabase/env.ts` | keys + `isSupabaseConfigured` |
| `src/lib/supabase/server.ts` | client for Server Components / Route Handlers |
| `src/lib/supabase/client.ts` | client for Client Components |
| `src/proxy.ts` | session refresh, no-ops with no keys |
| `.env.example` | both variables documented |

### Read this before following any Supabase guide

**This is `proxy.ts`, not `middleware.ts`.** Next 16 deprecated the `middleware`
file convention and renamed it to `proxy`, and renamed the exported function to
match (`node_modules/next/dist/docs/.../file-conventions/proxy.md`). Every
Supabase SSR guide currently published tells you to create `middleware.ts`
exporting `middleware`. Follow one literally here and the file is never invoked,
sessions never refresh, and people get logged out for no visible reason.

`cookies()` is also async in this version — `await cookies()`, or every read
comes back undefined.

## The switchover

### 1. Create the project

Supabase dashboard → new project. **Settings → API** gives the two values.
Put them in `.env` (they are safe to commit to `.env.example` as empty strings,
never with values — `.env` stays gitignored).

The anon key is public by design and carries no privileges of its own. The
**service role key is not this key** and must never go in a `NEXT_PUBLIC_`
variable, since that prefix compiles it into the browser bundle.

### 2. Schema

`User.passwordHash` and the whole `Session` model become dead once Supabase owns
credentials. With accounts being wiped there is no data migration:

- drop `passwordHash` from `User`
- delete the `Session` model and its `sessions` relation
- change `User.id` from `String @id @default(cuid())` to `String @id` and write
  the Supabase user's UUID into it at signup

That last one is the reason "wipe and start fresh" was the right call: `User.id`
is the foreign key for **ten** relations (ratings, log entries, lists, follows,
favourites, comments, likes). Keeping cuids and adding a `supabaseUserId`
alongside also works and is less invasive — pick one deliberately, don't drift
between them.

Then `npx prisma migrate dev --name supabase_auth` and **restart the dev
server** — a running server holds a stale client and throws `Unknown argument`
even after a correct migration (see CLAUDE.md).

### 3. `src/lib/auth.ts`

This is the whole job. 29 files call `getCurrentUser()` and 31 import from this
module, but they all funnel through that one function — **keep its signature and
return shape identical** (a Prisma `User`) and not one of those 29 files needs
to change.

Roughly:

```ts
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return db.user.findUnique({ where: { id: user.id } });
}
```

Use `getUser()`, never `getSession()`. `getSession()` reads the cookie without
verifying it against Supabase, so a forged cookie passes.

Then delete `hashPassword`, `verifyPassword`, `hashToken`, `createSession`,
`deleteSession`, and drop the `bcryptjs` dependency.

### 4. The three auth routes

`src/app/api/auth/{login,signup,logout}/route.ts` become
`supabase.auth.signInWithPassword`, `supabase.auth.signUp` and
`supabase.auth.signOut`. Signup must also create the `User` row — Supabase only
stores the credential, not the username, display name or bio.

Supabase sets and clears its own cookies, so remove the manual
`response.cookies.set(SESSION_COOKIE_NAME, …)` handling.

### 5. The things this is actually for

None of these exist today and each is why the migration is worth doing:

- **Password reset** — `resetPasswordForEmail`, plus a page to set the new one.
  Right now a user who forgets their password is locked out permanently and you
  have no way to help them. This is the one to do first.
- **Email verification** — on by default in Supabase; decide whether an
  unverified account may sign in.
- **Rate limiting** — Supabase applies its own to auth endpoints, which removes
  a gap the current code has entirely.
- **OAuth** — Google or Apple sign-in, if wanted, is configuration rather than
  code.

### 6. Turn off the guards

Once Supabase is the only path, delete the `isSupabaseConfigured` check in
`src/proxy.ts` and the fallbacks it guards, so a missing key fails loudly at
boot instead of silently reverting to an auth system that no longer exists.

## Verifying

Sign up, sign out, sign in, reset a password, and confirm a session survives a
server restart and a token expiry. Check that `/following`, `/home`, `/settings`
and the profile pages still gate correctly, and that `SiteNav` shows the
signed-in state.

## Unrelated trap worth knowing

`src/lib/db.ts` talks to Postgres over a **WebSocket on port 443** via
`@neondatabase/serverless`, because Sasha's university wifi throttles 5432. A
consequence nobody has written down until now: **a plain local Postgres no
longer works** — the driver expects a Neon endpoint, and a local server fails
with a WebSocket `ErrorEvent` and a 500. Verified on 2026-09-06 with a local
Postgres: every database-backed route fails while static pages render fine.
Develop against a Neon branch, not a local server.

This is also why moving the *database* to Supabase was rejected: Supabase offers
5432 direct and 6543 pooled, neither of which is 443.
