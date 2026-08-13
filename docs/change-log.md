# Change Log

A running record of every change made to this repository by Claude, kept so that
any future session — with any user — can pick up the thread without re-deriving
what was already done and why.

This is **not** a release changelog for end users. It is a work log: what was
touched, why it was touched, and what was deliberately left alone. If you are
looking for user-facing release notes, that belongs in a separate `CHANGELOG.md`
at the repo root.

---

## How to use this file

**Before starting work:** read the most recent few entries. They tell you the
current state of the project, decisions that are already settled (don't
re-litigate them), and anything explicitly left as follow-up.

**After finishing work:** add one entry describing what you changed. One entry
per unit of work — roughly one entry per branch or per task, not one per commit
and not one per file.

**Ordering:** newest entry first, directly under the `## Entries` heading.
Reverse-chronological means the freshest context is the first thing read.

**Honesty rules** — the log is only worth reading if it can be trusted:

- Record what was *actually* done, not what was intended or planned.
- If something was attempted and abandoned, say so and say why. A dead end
  documented once saves the next session from walking into it.
- If work was left incomplete or a test was failing at hand-off, record it in
  **Follow-ups**. Never quietly omit it.
- Don't record speculative future work as if it were done.

---

## Entry template

Copy this block for each new entry.

```markdown
### YYYY-MM-DD — Short title of the change

- **Branch:** `branch-name`
- **Requested by:** who asked, and in one line, what they asked for
- **Status:** Complete | Partial | Reverted

**What changed**

- Bullet per meaningful change, written so it makes sense in six months.

**Files touched**

| File | Change |
| --- | --- |
| `path/to/file` | Added / Modified / Deleted — one-line description |

**Why**

Reasoning behind the approach, and any alternative that was considered and
rejected. This is the part that saves the most time later.

**Follow-ups**

- Anything left undone, known-broken, or deferred. Write "None." if there are
  none — an empty section is ambiguous, an explicit "None." is not.
```

---

## Entries

### 2026-08-13 — Connected Sasha's local machine to this repo; enforced pushing

- **Branch:** `main`
- **Requested by:** sashak@podtracker.studio — wanted every change from his local
  Claude Code sessions to reach this repo automatically, so his collaborator sees it.
- **Status:** Complete

**What changed**

- `C:\Users\sasha\Documents\podcast-website` was **not a git repository at all**.
  It is now a working copy tracking `origin/main`. This settles the "whose history
  is canonical" question left open in the entry below: there was no local history
  to preserve, so this repo's history is the only history. Nothing was lost — the
  remote was already ahead on 7 files and local had nothing unique.
- `CLAUDE.md` gained a **Committing and pushing** section recording Sasha's
  standing instruction, and a stale note claiming four TypeScript errors were
  outstanding was corrected — commit `8283d58` had already fixed them.
- Added `.claude/hooks/unpushed-work.sh`, a Stop hook that blocks the session
  ending when commits exist on no remote, or the working tree is dirty.

**Fixed a real bug: the change-log hook never worked on Windows**

`change-log-reminder.sh` called `jq` twice. **`jq` is not installed on Sasha's
machine** and is not on PATH. The `jq -n` that emits the block verdict therefore
failed with "command not found", the hook produced no output, and the stop was
never blocked. Change-log enforcement has been silently inert on this machine
since it was written. Both `jq` calls are replaced with `grep` and hand-rolled
JSON. The new hook avoids `jq` for the same reason.

**Files touched**

| File | Change |
| --- | --- |
| `CLAUDE.md` | Modified — added committing/pushing agreement; corrected stale TS-error note |
| `.claude/hooks/unpushed-work.sh` | Added — Stop hook blocking unpushed/uncommitted work |
| `.claude/hooks/change-log-reminder.sh` | Modified — removed the `jq` dependency that made it a no-op |
| `.claude/settings.json` | Modified — registered the new Stop hook alongside the existing one |
| `docs/change-log.md` | Modified — this entry |

**Follow-ups**

- `main` is **still not GitHub's default branch** — `origin/HEAD` points at
  `claude/change-log-documentation-mr4x5v`. Sasha cannot change it: he is not an
  admin on this repo; his collaborator is. Same blocker for making the repo
  private, which it currently is not.
- Hooks were verified by piping payloads directly and parsing the JSON. They were
  **not** observed firing at a real session stop, which happens outside the turn
  that wrote them.

### 2026-08-13 — Created `main` so a second person can work in this repo

- **Branch:** `main` (created), from `claude/change-log-documentation-mr4x5v`
- **Requested by:** sashaknyshjr@gmail.com — needs a collaborator to have access,
  which is the reason this work is happening in a shared repo at all.
- **Status:** Complete, with one manual step left to Sasha

**What changed**

`main` was created from the current branch and pushed. The repo previously had
no `main` at all — the Claude task branch was the default, which is not a
sensible thing for a second person to clone.

**Left to Sasha (cannot be done from here)**

1. Set `main` as the default branch: GitHub → Settings → General → Default branch.
2. Add the collaborator: GitHub → Settings → Collaborators.

**Unresolved: whose history is canonical**

Sasha said his local repo's commit history should be canonical. The zip carried
no `.git`, so `main` currently holds a single snapshot commit and none of that
history. These two facts are in tension and the reconciliation has not happened
yet. Until it does, treat `main` as "the code, correct; the history, incomplete".

The intended path is: push the local history to a branch, then replay this
repo's three commits (change-log system, hooks, type fix) on top of it, rather
than the reverse. Nothing here should be force-pushed over until that is decided.

- **Branch:** `claude/change-log-documentation-mr4x5v`
- **Requested by:** sashaknyshjr@gmail.com — explicitly asked for these, which
  `CLAUDE.md` requires before touching them.
- **Status:** Complete

**What changed**

Two lines, one in each file:

```ts
const added = [];                                    // was: implicitly any[]
const added: ReturnType<typeof randomEpisode>[] = []; // now
```

- `src/app/podcast/[id]/episodes/EpisodeListClient.tsx`
- `src/app/podcast/[id]/top-rated/TopRatedClient.tsx`

**Why this annotation**

`ReturnType<typeof randomEpisode>[]` rather than spelling out
`{ title: string; date: string }[]`, so the type follows `randomEpisode` if its
shape ever changes instead of silently drifting out of date. Both files define
their own local `randomEpisode`, so each resolves to its own type. Types are
erased at compile time, so this cannot alter runtime behaviour.

**Verified**

- `tsc --noEmit`: clean (was 4 errors).
- `npm run build`: succeeds, all 21 routes compile. It failed before this change,
  so the project is now deployable.
- Behaviour unchanged, checked in a browser against the production build: on
  `/podcast/jre/episodes` "Load more" takes the list 6 → 12, on
  `/podcast/jre/top-rated` 7 → 13, and the Newest/Oldest toggle reorders. No
  JavaScript errors on either page.
- `eslint`: 3 warnings, all pre-existing and in files not touched here
  (`ReviewWidget.tsx` and similar), 0 errors.

**Trap worth knowing: `npm run dev` does not hydrate in this container**

The dev server's HMR websocket (`ws://127.0.0.1:3000/_next/webpack-hmr`) cannot
connect here, and without it the client components never finish hydrating —
buttons render but do nothing. This looks exactly like a broken feature and
nearly got reported as one. It is an environment limitation, not an app bug:
the same interactions work correctly under `npm run build && npm run start`.

**To test anything interactive in this container, use the production server, not
`npm run dev`.** Also do not run `npm run build` while `npm run dev` is running —
they share `.next` and the build corrupts the running dev server's state.

---

### 2026-08-13 — Imported Sasha's existing codebase; removed the scaffold built earlier

- **Branch:** `claude/change-log-documentation-mr4x5v`
- **Requested by:** sashaknyshjr@gmail.com — supplied `podtrackercode.zip`, the
  real project, after the session had wrongly assumed the project was greenfield.
- **Status:** Complete

**What changed**

- The repository now contains Sasha's actual Podtracker codebase, verbatim: 21
  routes, 97 source files, Prisma schema, auth, and its own `CLAUDE.md`.
- The Next.js scaffold and landing page built earlier this session were removed
  from the working tree. They remain in history at commit `92b3ddb` if ever
  wanted.
- The change log system was preserved across the swap: `docs/change-log.md`,
  `.claude/hooks/`, `.claude/settings.json`. The change-log section was appended
  to the end of Sasha's `CLAUDE.md`; nothing he wrote was altered.
- His `.claude/skills/` (the Prisma skill set) sits alongside the hooks.

**Why the earlier work was discarded rather than merged**

It was superseded on every axis, and reading `CLAUDE.md` made that unambiguous:

| | Built earlier | Actual project |
|---|---|---|
| Styling | Tailwind v4 | CSS Modules + CSS variables (16 modules) |
| Next | 16.3.0 | 16.2.11 |
| Display font | Lora (a guess) | PT Serif Caption |
| Rating font | Roboto 900 | Londrina Solid |
| Nav | included Genres | Genres deliberately cut from MVP |
| Artwork | generated placeholders | real, from the iTunes API |

**The most important finding:** the landing page built earlier was *Landing v1
(post-launch)* — the version with Popular reviews and Popular Lists. Per
`CLAUDE.md` that version is designed but deliberately **not** built, held back
until there are roughly 5-10 users generating data, so those sections don't
render empty. Building it was not just redundant; it produced the variant that
was intentionally deferred. The live `/` is the pre-launch version and is
correct as it stands.

**Verified**

`npm install` clean (380 packages). `tsc --noEmit` reports exactly the four
pre-existing errors `CLAUDE.md` documents (`added` implicitly `any[]` in
`EpisodeListClient.tsx` and `TopRatedClient.tsx`) and nothing else, confirming
the transfer did not break anything. Those were left unfixed, as instructed.

**Running it in a fresh container**

Later in the same session the app was brought up successfully. Postgres is not
running by default but the server binary is present, so no install is needed:

```bash
service postgresql start
su - postgres -c "psql -c \"CREATE USER podtracker WITH PASSWORD 'podtracker' SUPERUSER;\""
su - postgres -c "psql -c 'CREATE DATABASE podtracker OWNER podtracker;'"
# write .env with DATABASE_URL + a generated SESSION_SECRET (see .env.example)
npx prisma migrate deploy && npx prisma generate
npm run dev
```

All routes then return 200 — `/`, `/explore`, `/following`, `/login`, `/signup`,
`/genres`, `/user/sasha` and its sub-pages — with `/home` correctly 307ing when
signed out, and no JavaScript errors on any page.

**What does NOT work in this container, and is not a bug**

Outbound requests to `itunes.apple.com` and `picsum.photos` are blocked by the
environment's network policy. Consequences: the landing page's Popular podcasts
grid renders empty, and some avatars are missing. Both work on a normal machine.
`getPopularPodcasts` degrades correctly — `Promise.allSettled` plus a filter, so
an unreachable API yields an empty list rather than an exception. Do not "fix"
either symptom here.

**Published preview**

<https://claude.ai/code/artifact/914224ae-4a60-4436-a55d-b7c08e344e3f> — a
static snapshot of landing / explore / profile / following with a tab switcher.
Point-in-time, not live; links are inert. Regenerate by rendering each route and
inlining CSS, fonts and same-origin images. Two traps: `next/font` declares
`--font-*` on classes that sit on `<html>` (== `:root`), so those variables must
be re-declared on `:root` or the page silently falls back to system fonts; and
images pointing at external placeholder hosts must be swapped for an inline
swatch, since the artifact sandbox blocks them and broken-image icons read as
defects.

**Follow-ups**

- `npm run build` still fails on the four documented TypeScript errors, so the
  project cannot be deployed until they are typed. Left alone per `CLAUDE.md`.
- The zip carried no `.git`, so none of Sasha's own commit history came across.
  What is on this branch is a single snapshot commit, not his real history.

**Process note**

The empty repo was read as greenfield. The phrasing "remind you of the project"
was a signal that prior work existed, and the right move was to ask whether
there was an existing codebase before scaffolding anything. Roughly an hour of
work went into a landing page that was already built, in the wrong stack, in a
variant that was deliberately on hold.

---

### 2026-08-13 — Scaffolded Next.js and built the landing page

> **Superseded** by the entry above. The code described here was removed from
> the working tree the same day; it survives only in commit `92b3ddb`. Do not
> treat any of it as the current state of the project.

- **Branch:** `claude/change-log-documentation-mr4x5v`
- **Requested by:** sashaknyshjr@gmail.com — supplied the project spec
  (`Rough_draft_for_Podcast_website_2.pdf`) and the Figma export of the landing
  page (`Landing_page_podcast_1.zip`), and asked for the first page to be built.
- **Status:** Complete

**What the project is**

Podtracker is a social platform for podcast listeners — log episodes, rate them,
write reviews, build lists, follow other users. Closest analogue is Letterboxd,
for podcasts instead of film.

The defining mechanic is the rating scale. Not 1-5 stars: five recommendation
buckets — Highly recommend / Recommend / Ok / Don't recommend / Didn't finish.
The spec explains why: the site exists to answer "is this episode worth my time
or should I skip it". Rating *distribution* is treated as first-class alongside
the average, because a polarizing episode and a mediocre one can average the
same.

**What changed**

- Scaffolded Next.js 16.3 (App Router) + React 19 + Tailwind v4 + TypeScript.
- Built the signed-out landing page from the five Figma frames, composed in
  frame order: nav (2), hero + popular podcasts (1), what is Podtracker (3),
  ratings + popular reviews (4), popular lists + footer (5).
- `lib/ratings.ts` holds the rating scale as one reusable module — it is the
  product's core mechanic and will be needed on every episode and show page.
- `lib/types.ts` + `lib/placeholder-data.ts` shape the data the way a podcast
  API returns it, so connecting one later is a data-source swap rather than a
  component rewrite.
- `components/Artwork.tsx` renders deterministic placeholder tiles (stable hue
  and initials derived from the title) with a `src` passthrough for when real
  artwork arrives.

**Files touched**

| File | Change |
| --- | --- |
| `app/layout.tsx`, `app/page.tsx`, `app/globals.css` | Modified — fonts, theme tokens, page composition |
| `components/*.tsx` | Added — 9 components, one per design section plus shared pieces |
| `lib/ratings.ts`, `lib/types.ts`, `lib/placeholder-data.ts` | Added — domain model and stand-in content |
| `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `.gitignore` | Added — scaffold config |
| `AGENTS.md` | Added — generated by `next dev`; re-added automatically if deleted |
| `docs/change-log.md` | Modified — this entry |

**Why these choices**

Stack was chosen by the user from options offered. Next.js over static HTML
because the spec describes a full social platform (feed, profiles, following,
lists, search) that a static page would have to be abandoned for.

Colors were sampled pixel-by-pixel from the Figma PNGs rather than eyeballed —
`#EBEDF0` canvas, `#C3DBFF` panels, `#7BBAFF` primary, and the five rating
colors. They live as tokens in `globals.css`.

The design defines one light appearance, so the scaffold's dark-mode block was
removed rather than inventing a dark variant nobody designed.

Fonts are Lora (serif headings) and Roboto (body). The Figma file does not name
its fonts; these are the closest free matches, and are a guess worth revisiting.

Placeholder artwork rather than the real cover art in the mockup: the user
confirmed an API will supply artwork later, and this avoids committing other
companies' images to a public repo.

**Reconciling spec against design — design won both times**

- Spec lists **four** rating options; the design shows **five** (adds "Didn't
  finish"). Built five.
- Spec's nav is "Home (Feed), Profile, (Following?), Explore"; the design
  resolves it to Home · Profile · Following · Explore · **Genres**. Built the
  design's version.

**Verified**

`tsc --noEmit` clean, `eslint` clean, production build succeeds. Rendered in
headless Chromium at 1546px and 390px: no horizontal overflow at either width,
no console or page errors.

Two rendering bugs were found by looking at the screenshots and fixed: episode
titles beginning with a number produced initials of "#A" instead of "AW", and
overlapping list-collage tiles repeated identical initials, which read as a
rendering fault. The collage now uses a bare `plain` variant.

**Published preview**

A static snapshot of the rendered page is published at
<https://claude.ai/code/artifact/914224ae-4a60-4436-a55d-b7c08e344e3f> — useful
for showing the page to someone without a checkout. It is a point-in-time
snapshot, not the live app: it does not update when the code changes, and its
links do not navigate. Regenerate it by rendering `/` and inlining the assets;
note that `next/font` declares `--font-*` on classes that sit on `<html>`, so
those variables must be re-declared on `:root` or the page silently falls back
to system fonts.

**Follow-ups**

- Every nav and card link points at a route that does not exist yet
  (`/explore`, `/podcast/[id]`, `/login`, …). Next prefetches links in view, so
  a page load fires ~15 background 404s. Harmless and invisible to users, and
  it disappears as those routes get built — but it is noise in devtools until
  then.
- No tests and no test runner. Nothing is asserted automatically; the
  verification above was manual.
- Fonts, and the exact `Genres` nav destination, are unconfirmed guesses.

---

### 2026-08-13 — Made change log updates automatic via hooks

- **Branch:** `claude/change-log-documentation-mr4x5v`
- **Requested by:** sashaknyshjr@gmail.com — asked that this log be appended to
  every time they ask for something or after a session of work, so the record is
  reliably there for future sessions rather than depending on memory.
- **Status:** Complete

**What changed**

- Added `.claude/hooks/session-base.sh` (SessionStart): records the commit the
  session began at, into `.git/claude-session-base`.
- Added `.claude/hooks/change-log-reminder.sh` (Stop): compares the files the
  session touched against `docs/change-log.md`, and blocks the session from
  ending with `decision: "block"` if work happened but the log went untouched.
- Added `.claude/settings.json` wiring both hooks up. Project-scoped and
  committed, so it applies to everyone who clones the repo.
- Expanded `CLAUDE.md` with a section documenting the enforcement and its
  limits.

**Files touched**

| File | Change |
| --- | --- |
| `.claude/hooks/session-base.sh` | Added — records session start commit |
| `.claude/hooks/change-log-reminder.sh` | Added — Stop hook that blocks on an unrecorded session |
| `.claude/settings.json` | Added — hook wiring |
| `CLAUDE.md` | Modified — documented the hooks and entry granularity |
| `docs/change-log.md` | Modified — this entry |

**Why**

The previous setup relied only on a `CLAUDE.md` instruction, which is a request
a session can silently skip. The hook is executed by the harness, so it does not
depend on the model noticing. Blocking was chosen over a passive notice because
a message that appears after the work is done is easy to ignore.

The baseline-commit approach exists because the obvious check — "is the working
tree dirty?" — reports nothing after a commit-and-push, which is exactly when a
session is ending and the log matters most. Comparing against the session's
starting commit catches that case.

Two deliberate exemptions keep the hook from crying wolf: changes confined to
`.claude/` don't trigger it, and `stop_hook_active` short-circuits it so a
blocked stop cannot loop. Both failure modes — missing or corrupt baseline file
— degrade to silence rather than blocking.

Behavior was verified across eight cases before the hooks were wired up: silent
on no changes / `.claude`-only / log-already-updated / `stop_hook_active`;
blocking on an uncommitted source file and on a committed-with-clean-tree
change; no crash on missing or garbage baseline.

**Follow-ups**

- The hooks were added *during* this session. Claude Code only watches settings
  directories that existed at session start, so they may not take effect until
  the next session in this repo. Not verified live — the assertion that they
  work rests on the scripted tests above, not on an observed firing.
- Per-request logging (an entry every single time the user asks something) was
  deliberately not implemented; see the note below.

**Rejected: one entry per request**

The literal request was to append "every time I ask something." That was
implemented as per-session-of-work instead, because an entry per message would
bury the decisions worth reading under routine back-and-forth, making the log
slower to read at exactly the moment it is needed. The hook fires per session,
which achieves the actual goal — nothing gets lost — without the noise. If the
finer granularity is wanted after all, the Stop hook is the place to change it.

---

### 2026-08-13 — Established the change log

- **Branch:** `claude/change-log-documentation-mr4x5v`
- **Requested by:** sashaknyshjr@gmail.com — asked for a document recording all
  changes and edits made, so the record can be referenced in later sessions when
  other users work in this repo with Claude.
- **Status:** Complete

**What changed**

- Created this change log, with usage instructions, an entry template, and the
  conventions above.
- Added a root `CLAUDE.md` that points future sessions at this file and instructs
  them to read it before starting and append to it when finishing. Without that
  pointer the log would exist but would not reliably be read or updated.

**Files touched**

| File | Change |
| --- | --- |
| `docs/change-log.md` | Added — this file |
| `CLAUDE.md` | Added — repo guidance directing sessions to read/update this log |

**Why**

The repository was completely empty at the time of this entry: no commits on any
branch, no files, and no remote branches. There was therefore **no prior work to
document** — this entry is the start of the history rather than a summary of
anything that came before it. The log was set up now so that the record exists
from the first commit onward instead of being reconstructed later from commit
messages, which lose the reasoning behind decisions.

`docs/change-log.md` was chosen over a root-level `CHANGELOG.md` to keep this
work log distinct from a conventional user-facing release changelog, leaving that
filename free for its usual purpose.

**Follow-ups**

- None.
