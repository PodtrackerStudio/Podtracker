@AGENTS.md

# Podtracker

A Letterboxd-style site for podcasts. Two goals: build a community for podcast fans, and help people work out which episodes of a show are worth listening to and which to skip, based on audience reactions.

Stack: Next.js 16.2.11 (App Router) · React 19.2.4 · TypeScript · Prisma 7.9 · Postgres.

## Working agreement

**The design comes from Sasha's Figma files. Do not invent design.**

Colours, spacing, fonts, and layout are decided in Figma and handed over as PNG frame exports. Implement what the frames show. If a frame doesn't cover something, ask rather than filling the gap with your own judgement. Suggestions are welcome when asked for — unprompted redesigns are not.

When a frame and the code disagree, say so and ask. Don't silently pick one.

## Design system

Every value below is deliberate and came from Sasha directly. Don't "correct" any of it.

### Colours

Defined as CSS variables in `src/app/globals.css`.

| Purpose | Value | Variable |
|---|---|---|
| Page background | `#9E9E9E` at 25% → `rgba(158, 158, 158, 0.25)` | `--bg` |
| Opaque equivalent of the above | `#e7e7e7` | `--page-bg-alt` |
| Nav bar + content boxes | `#C3DBFF` | `--accent-blue` |
| Primary buttons (Create account, Login, Log podcast, Edit profile) | `#7BBAFF` | `--btn-primary-blue` |
| Highly recommend | `#FF40D9` | `--highly-recommend` |
| Recommend | `#28BA60` | `--recommend` |
| Ok | `#C7BF2D` | `--ok` |
| Don't recommend | `#FF0000` | `--dont` |
| Didn't finish | `#999999` | `--didnt-finish` |

`--bg` is translucent **on purpose** and is applied to `html` only. Applying it to both `html` and `body` composites it twice and comes out darker. `--page-bg-alt` exists because surfaces sitting on top of another colour — the nav search pill — must stay opaque.

### Fonts

Loaded via `next/font/google` in `src/app/layout.tsx`.

- **PT Serif Caption** (`--font-display`) — the default for everything: nav bar, headlines, body copy, form labels, buttons.
- **Roboto** (`--font-body`) — **reviews**. This is the only standing Roboto rule.
- **Londrina Solid** (`--font-rating`) — rating tier labels, via `.rating-label`.

Mechanically: `body` inherits Roboto, and `h1`/`h2`/`.display-font`/`nav.site-nav` get the serif. Pages that should be entirely serif set `font-family: var(--font-display)` on their `.main` — currently **Explore**, **Following**, and the **auth pages** (`auth.module.css`).

**Known exception, not a precedent:** on Explore, `.trendingName` and `.trendingFollowers` are Roboto while the other ~86 text elements on that page are serif. Sasha asked for this specifically. Further exceptions will be flagged one at a time — don't generalise from it.

**Watch out:** if a review card is ever added to Explore or Following, that page-wide serif overrides the reviews-are-Roboto rule and needs an explicit Roboto override on the review text.

### Nav

`nav.site-nav` is **100px** tall with horizontal-only padding; `align-items: center` does the centring. The height is explicit because it was previously content-driven and came out at 64px, which didn't match the Figma.

Items: Podtracker · Home · Profile · Following · Explore · + Log podcast.

**Genres was deliberately cut from MVP.** It's gone from both the logged-in and logged-out branches of `SiteNav`. The `/genres` route still exists but is intentionally unlinked — do not add the nav item back.

Sasha's Figma nav frames still show Genres and a logo tile at the far left. Both are known divergences; the logo is on hold until he supplies a higher-quality original.

### Known divergences from Figma (not yet decided)

Raise these rather than fixing them unprompted:

- **"See more" buttons** are blue pills in the Figma frames, but `.btnSeeMore` (home) and the equivalents elsewhere are still transparent with a grey border. Never changed; never asked for.
- **The wordmark is 24px** in a 100px nav, so the bar reads taller and emptier than the Figma, where the contents fill it. Sasha's call was "all that matters is that everything fits" — the size question is open.
- **The nav logo tile** is in every recent Figma frame but not in the code.

## Build status

Podcast data is real and comes from Apple. What is still missing is *community* data — ratings, reviews, lists, follower counts — because that only exists once people use the site. See `HAS_COMMUNITY_DATA` below: the sections needing it are gated off rather than faked.

| Page | State |
|---|---|
| `/` landing | **Pre-launch version only.** Real. |
| `/home` | **Real** as of 2026-10-03. New episodes from the shows you follow, plus Trending reviews ranked by likes, each rendering only when it has something. Popular podcasts stays as the fallback for an account that follows nothing. Friends' activity, New lists and Popular lists are still unbuilt. |
| `/following` | **Real.** Lists the shows you follow; both empty and populated states work. |
| `/explore` | **Real.** Top podcasts and Popular episodes both come from Apple's charts, live, revalidated hourly. Trending users / Popular lists / Curated lists are still hardcoded but sit behind `HAS_COMMUNITY_DATA`, so nothing renders them today. |
| `/user/[username]` | Demo branch for `sasha`, real data otherwise. |
| `/login`, `/signup` | Real — **Supabase Auth** (since 2026-09-07; the old bcrypt + `Session` table is gone). No nav bar by design. |

**Designed but never built** — these exist as Figma frames only:

1. **Landing v1 (post-launch).** Adds Popular reviews, Popular Lists, and a footer. To be swapped in once there's a real user base, so nothing renders empty before then.

The Following empty state — "No Favorites… / Add Favorites ⊕" — used to be listed here as unbuildable. It renders now: the page reads `PodcastFollow`, so following nothing shows it.

`DEMO_USERNAME = "sasha"` in `src/app/home/page.tsx` and `src/app/user/[username]/page.tsx` forces the populated design so it stays viewable while the data is mock. `sasha` is not a real database user — don't try to make it one.

### `HAS_COMMUNITY_DATA` — the one switch for anything needing a user base

`src/lib/community.ts` exports a single boolean, currently `false`. It gates
the sections that rank or average something only real users can produce:
friends' activity, popular reviews and lists on show and episode pages,
follower counts, Explore's Trending users / Popular lists / Curated lists.
Those sections simply don't render while it's off — the site is short, not fake.

**It is being retired section by section, not flipped.** On 2026-10-03 Sasha
asked for ratings and the home page once real data existed, and explicitly *not*
for Explore's popular users. One global boolean cannot express that, so each
section that goes live stops consulting the flag and gates on **its own data**
instead — `ratings.total > 0`, `reviews.length > 0`. That is strictly better
anyway: a show with two ratings shows two ratings, rather than waiting for a
site-wide switch. Already converted: average ratings and distribution on show
and episode pages, and both home page feeds.

Three things to know before touching what is left:

- **It is Sasha's call when it flips**, as he and others start logging and
  reviewing. He'll ask page by page. Flipping it to preview something and
  pushing that is how placeholder names end up live.
- **Never gate rating or reviewing controls on it.** They are how the first real
  data gets made, so they have to work while it is `false`.
- **Some gated blocks still hold placeholder constants** — Explore's
  `trendingUsers` and `popularLists` are invented people and shows with `href`
  set to `#`. Flipping the switch without replacing them publishes those. They
  need real queries behind them first, which is the actual work each "turn this
  page on" request means.

## Gotchas that cost real time — read before debugging

- **Run the dev server from the project directory.** Started from
  `C:\Users\sasha` it serves a *different* app: `/` returns 200 while
  `/explore` and `/login` 404, which reads as a broken router. Check
  `preview_list`'s `cwd` before diagnosing anything else.
- **Never run two dev servers at once.** They share `.next`, and Turbopack's
  build output is not safe to share — they wipe each other's route manifests.
  The symptom is **static routes serving 200 while every dynamic route
  (`/podcast/[id]`, `/user/[username]`, `/list/[id]`) 404s**, including pages
  with no `notFound()` in them. Count `.next/_events_*.json` — one file per
  running server — before debugging anything else. If port 3000 is busy, that
  server *is* this project's; reuse it or kill it. Don't work around it with a
  second instance or `autoPort`. Recovery: kill every `next` process, delete
  `.next`, start one server.
- **Restart the dev server after any Prisma migration.** A running server holds
  a stale client and throws `Unknown argument <newField>` even though the
  migration applied and the schema is correct.
- **The database is Supabase Postgres, reached on port 5432** (Neon, and its
  WebSocket transport on 443, were dropped 2026-09-11). Two consequences worth
  knowing before debugging: a network that blocks outbound 5432 — university and
  corporate wifi often do — breaks the site entirely, and this bit the project
  once already on 2026-08-31; and `DATABASE_URL` must be the **pooler** string
  on **port 5432**, not the direct one and not transaction mode on 6543, which
  breaks the `$transaction` calls in `/api/log` and `/api/favorites`.
  **`npm run check:db` diagnoses all of this** and names the fix — run it before
  investigating a database problem by hand.
- **`fetchPodcastFeed`'s in-memory parsed cache is load-bearing — do not remove
  it.** Podcast feeds exceed Next's 2MB fetch-cache limit, so Next caches *none*
  of them, and the XML re-parses on every render. Feeds are huge (JRE's carries
  ~2,700 episodes, ~3.5s to parse, single-threaded so they queue). Without the
  cache the trending-episodes page took **175s**; with it, 0.3s warm.
- **Episode-link resolution does not scale.** `getTrendingEpisodes` resolves
  entries to episode pages by parsing each show's feed. Fine for the 8-item
  Explore row (7 of 8 resolve); at 100 items it spans ~40 shows and times out
  past 280s even cached. The full list passes `resolveEpisodeLinks: false` and
  links to shows. Don't "fix" it by raising `MAX_FEEDS`.

## Known gaps — do NOT "fix" these

All of these are deliberate or already known. Fixing them unasked wastes a turn and can destroy working code.

- ~~Four pre-existing TypeScript errors in `EpisodeListClient.tsx` / `TopRatedClient.tsx`~~ — **fixed** in commit `8283d58` ("Type the added array so the production build passes"). `npx tsc --noEmit` is clean as of 2026-08-13.
- **`AddFavoriteButton.tsx` and `FavoriteCard.tsx` in `src/components/` are unused.** They are **not** dead code. They hold search-and-add and remove logic kept for a per-show favourite control. `/following` is wired now, but through the Add Favorites popup rather than these. Do not delete.
- ~~**`src/app/api/favorites/route.ts` is unused**~~ — **live as of 2026-08-26.** It takes an `externalId` (it used to take a database `podcastId` no client ever had), and favouriting **also follows**, because `/following` lists follows.
- **The old `/user/[username]/favorites` page was deleted on purpose.** Favorites in the profile sub-nav points at `/following` — they're the same feature. Adding is reachable again through the Add Favorites popup; there is still no per-show *remove* control.
- ~~**"Add to list" and "Add to next listening"** are buttons with no `onClick`~~ — both work as of 2026-08-26. Next listening is a direct toggle; "Add to list" opens a picker of your lists.
- ~~**“+ Log podcast” links to `/explore`**~~ — it goes to `/log` as of 2026-08-26: the nav search, then the same review popup “Add Log / Review” opens.
- **Review cards deliberately omit the podcast and episode name.** That information is reachable by hovering the artwork — the shared `media-thumb` popup pattern. Don't add the titles back.

## Next steps Sasha has named

- Popularity comes from **Apple's charts** (`rss.applemarketingtools.com`, no API
  key) until Podtracker has its own signal — Sasha's marker is roughly 100 users,
  then it switches to popularity derived from follows, ratings and logs here.
  Spotify charts were the original plan and were dropped: credentials never
  arrived and Apple's charts needed none.
- Swap in landing v1 once there are roughly 5–10 users generating data.
- **Flip `HAS_COMMUNITY_DATA` when Sasha says so, not before.** His plan
  (2026-10-02) is to write reviews and get others doing the same, then ask for
  the gated sections page by page. Don't flip it to "see how it looks".

## Committing and pushing

**Sasha's standing instruction (2026-08-13): every change made in a session goes to the repo.** He does not want to ask for it each time, and he does not want work sitting only on his machine — a collaborator works in this repo and needs to see it.

So: after each self-contained unit of work, commit and push to `main` without being asked. Don't batch a whole session into one commit, and don't leave a session with unpushed work.

- `git fetch` at the **start** of a session. Others push here; local is not automatically the truth.
- One commit per coherent change, with a message saying what changed and why.
- Never commit `.env` — it's gitignored, keep it that way.
- Update `docs/change-log.md` in the same commit as the work it describes.
- If a push is rejected because the remote moved, pull and rebase — **never force-push**.

The one exception: if a change is left broken or half-finished, say so rather than pushing it silently. Broken work reaching a collaborator is worse than work that hasn't arrived yet.

## Session change log

This repo keeps a work log at [`docs/change-log.md`](docs/change-log.md) recording
what past sessions changed and why. Multiple people work here with Claude, so it
is the shared memory between sessions.

**Start of session:** read the most recent entries before making changes.
**End of session:** append one entry using the template in that file, newest at
the top. Record what actually happened, including anything abandoned,
incomplete, or left failing.

One entry per unit of work (roughly per branch or task), not one per commit.
Amend the entry you already started rather than stacking near-duplicates.

A `Stop` hook (`.claude/hooks/change-log-reminder.sh`, wired up in
`.claude/settings.json`) blocks the session from ending if work happened and the
log went untouched. It stays quiet when nothing changed or when only `.claude/`
config was touched. A `SessionStart` hook records the starting commit in
`.git/claude-session-base` so committed-and-pushed work still counts.

The hooks can tell that the log went untouched, but not whether what you wrote
in it is accurate.
