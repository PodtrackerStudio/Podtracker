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

Most pages render from hardcoded constants, not the database. Auth and follows are real; nearly everything else is placeholder. Sasha has said the placeholder podcasts and images don't matter — they'll be replaced when the API work happens.

| Page | State |
|---|---|
| `/` landing | **Pre-launch version only.** Real. |
| `/home` | Both states built — empty vs populated, branched on `PodcastFollow` count. Feed content is mock. |
| `/following` | Populated only, from hardcoded `FollowingGrid`. |
| `/explore` | Built, hardcoded data. |
| `/user/[username]` | Demo branch for `sasha`, real data otherwise. |
| `/login`, `/signup` | Real — bcrypt, sessions, Postgres. No nav bar by design. |

**Designed but never built** — these exist as Figma frames only:

1. **Landing v1 (post-launch).** Adds Popular reviews, Popular Lists, and a footer. To be swapped in once there's a real user base, so nothing renders empty before then.
2. **Following empty state** — "No Favorites… / Add Favorites ⊕". Can't currently render, because `FollowingGrid` is a constant and never empty.

`DEMO_USERNAME = "sasha"` in `src/app/home/page.tsx` and `src/app/user/[username]/page.tsx` forces the populated design so it stays viewable while the data is mock. `sasha` is not a real database user — don't try to make it one.

## Gotchas that cost real time — read before debugging

- **Run the dev server from the project directory.** Started from
  `C:\Users\sasha` it serves a *different* app: `/` returns 200 while
  `/explore` and `/login` 404, which reads as a broken router. Check
  `preview_list`'s `cwd` before diagnosing anything else.
- **Restart the dev server after any Prisma migration.** A running server holds
  a stale client and throws `Unknown argument <newField>` even though the
  migration applied and the schema is correct.
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
- **`AddFavoriteButton.tsx` and `FavoriteCard.tsx` in `src/components/` are unused.** They are **not** dead code. They hold the working search-and-add and remove logic, preserved for when `/following` gets wired to the `favorite` table. Do not delete.
- **`src/app/api/favorites/route.ts` is unused** for the same reason. Keep it.
- **The old `/user/[username]/favorites` page was deleted on purpose.** Favorites in the profile sub-nav points at `/following` — they're the same feature. Consequence: there is currently no way to add or remove a favorite anywhere in the UI.
- **"Add to list" and "Add to next listening"** on the podcast and episode pages are buttons with no `onClick`. They have never worked. Sasha is building the backing flows himself.
- **"+ Log podcast"** in the nav links to `/explore`. There's no log-an-episode flow yet.
- **Review cards deliberately omit the podcast and episode name.** That information is reachable by hovering the artwork — the shared `media-thumb` popup pattern. Don't add the titles back.

## Next steps Sasha has named

- Wire `/following` to the `favorite` table so both designed states work and favoriting is reachable again.
- Explore will use **Spotify charts** for popularity until there's a real user base. Credentials aren't available yet; `src/lib/popularPodcasts.ts` currently uses the iTunes Search API as a stand-in.
- Swap in landing v1 once there are roughly 5–10 users generating data.

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
