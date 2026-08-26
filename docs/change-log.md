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

### 2026-08-26 — All media menu on the list page, and the write path VERIFIED

- **Branch:** `main`
- **Requested by:** Sasha — put the All media / Shows only / Episodes only
  menu on the list page itself, defaulting to All media.
- **Status:** Complete.

**What changed**

- **`/list/[id]` got the `FilterMenu`** — the same component as Next listening
  and the ratings page, `param="media"`, defaulting to "All media" and opening
  to Shows only / Episodes only. Selection lives in the query string, so a
  filtered list is a linkable URL.
- `.addRow` became `.controlsRow`: a three-column grid with the filter on the
  left and the "Add podcasts…" bar centred, matching Next listening's control
  row. Anyone can filter; only the owner sees the bar.
- `ListDetailClient` takes `totalCount` alongside the already-filtered `items`,
  so an empty grid can say **"Nothing matches that filter."** rather than
  "Nothing in this list yet." The count reflects the filter, as on Next
  listening.

**Files touched**

| File | Change |
| --- | --- |
| `src/app/list/[id]/page.tsx` | Modified — reads `?media=`, filters by kind, renders `FilterMenu` |
| `src/app/list/[id]/ListDetailClient.tsx` | Modified — `totalCount` prop, filter-aware empty message |
| `src/app/list/[id]/list.module.css` | Modified — `.addRow` → `.controlsRow` + `.addSlot` |

**Why**

The filter menu went in the control row rather than the count/description/sort
row below it, so that row keeps the three-column layout the Figma gives it.
That also puts the filter in the same place it sits on Next listening.

Filtering happens on the server, from the query string, rather than in
`ListDetailClient` state — it costs nothing (the items are already loaded) and
it makes a filtered view shareable, which is the same reasoning `FilterMenu`
was built on for the profile's rating distribution.

**The two previous entries' open follow-up is now closed.** Sasha created
`shows I listen to` while this was being built, and it is in Postgres:
description set, five shows added through the Create List form, and
**`#909 - Bill Burr` — a 2017 episode — appended at position 6 through the
"Add podcasts…" bar on the list page**. That single row proves the whole chain
end to end: the new iTunes episode search found it, `ensureEpisode` matched its
guid against JRE's feed, and the `ListItem` write succeeded. Nothing in the
write path is unverified any more.

**Follow-ups**

- **"Add to list" on the podcast and episode pages is still a handler-less
  `<button>`.** `/api/lists/items` is what it should call, with a list picker
  in front of it — and that picker must exclude `isWatchlist` lists.
- **A list still can't be emptied.** No remove control on `/list/[id]`, same as
  Next listening. The trash icons on the Create List page only edit client
  state before submit.
- The nav search and `/search` page still have no scope control — they get
  episodes via the progressive rule only.


### 2026-08-26 — Search finds episodes, so lists can hold them

- **Branch:** `main`
- **Requested by:** Sasha — lists can't hold episodes because search only
  returns shows. His rule: results stay shows until the query reaches past a
  show's name ("joe rogan" gives the show, "joe rogan bill burr" gives the
  episodes), plus a Shows only / Episodes only control on the add bars.
- **Status:** Complete, except the logged-in click-through — see Follow-ups.

**What changed**

- **`searchEpisodes` in `podcastApi.ts`** — iTunes
  `search?media=podcast&entity=podcastEpisode`. **This is not the dead end the
  2026-08-21 entry warns about.** That one was `lookup?entity=podcastEpisode`
  on *chart* episode ids, which returns resultCount 0. `search` is a different
  endpoint and works.
- **The reason it works at all:** every result carries `collectionId` (the
  show's iTunes id) and `episodeGuid` — **and that guid is byte-identical to the
  one in the show's own RSS feed**. Verified: JRE #2542 is
  `d0eed536-9b6e-11f1-91e1-87ba07d621a5` from both, and
  `episodeKeyFromGuid` on it gives `0f850eb2cb4a`, the same key already stored
  in Postgres from the feed path. So a search result routes straight to
  `/podcast/[id]/episode/[epId]` and `ensureEpisode` finds it with **no feed
  parsing and nothing to reconcile**.
- **`SearchItem` is now a union** of `PodcastSearchItem | EpisodeSearchItem`.
  Both keep `id` / `title` / `cover`, and `hrefForSearchItem` and
  `subtitleForSearchItem` handle both, so the nav typeahead and `/search`
  gained episodes **without either file changing**.
- **`queryReachesPastShowName` is the show-then-episodes rule.** Apple's *show*
  search won't make the distinction — it returns The Joe Rogan Experience for
  "joe rogan bill burr" just as happily as for "joe rogan" — so the split is
  decided here: if any meaningful word in the query is absent from the top
  show's name, the episode search runs. Filler words ("the", "podcast",
  "show"…) don't count. No show match at all also means episodes, since they're
  the only thing left to offer.
- **Scope control** on both add bars and the Create List dropdown: All media /
  Shows only / Episodes only, forcing either kind. It sits inside the dropdown,
  above the results — see Why.
- Episodes are addable to lists and Next listening; `/api/lists`,
  `/api/lists/items` and `/api/next-listening` already took `episodeKey`, so
  only the clients needed to send it. `/api/lists` now returns `failedIndex`
  so the form can name an item it couldn't resolve.

**Files touched**

| File | Change |
| --- | --- |
| `src/lib/podcastApi.ts` | Added `ItunesEpisodeResult` and `searchEpisodes` |
| `src/lib/search.ts` | Rewritten — `SearchItem` union, `SearchScope`, `queryReachesPastShowName`, episode href/subtitle |
| `src/app/api/search/route.ts` | Modified — accepts `scope` |
| `src/components/useSearchResults.ts` | Modified — `scope` argument |
| `src/components/AddPodcastsBar.tsx` | Modified — scope control, episode results, adds by show id + episodeKey |
| `src/components/addPodcastsBar.module.css` | Modified — `.scopeRow`, `.scopeButton`, `.scopeActive`, `.noResults` |
| `src/app/list/create/CreateListClient.tsx` | Modified — scope control, episode items, names the item that failed to resolve |
| `src/app/list/create/createList.module.css` | Modified — same scope-control styles |
| `src/app/api/lists/route.ts` | Modified — returns `failedIndex` on an unresolvable episode |

**Why**

The alternative was scoping episode search *within* a matched show — take
"joe rogan", find JRE, then search its feed for "bill burr". It was rejected
once the iTunes endpoint proved out: it needs no feed parse (JRE's feed is
2,743 episodes and ~3.5s to parse cold), and it finds episodes across shows,
which the scoped version can't. "huberman sleep" returning Huberman Lab's sleep
episodes only works because the search is global.

The two searches run **sequentially, not in parallel**, because the residual
check needs the top show first. That means the episode call is skipped entirely
for a plain show query — the common case — at the cost of one extra round trip
when episodes are wanted. Both are cached by Next for an hour.

One show slot is kept when episodes take over, so a query naming a show never
makes the show itself unreachable. Two slots were tried first and ate too many
episode rows out of a six-row dropdown.

The scope control sits **inside the dropdown**, not beside the input, because
the Next listening page already carries an "All media" `FilterMenu` chip in that
same row — filtering the grid, not the search — and two near-identical chips
side by side would read as one control.

**Follow-ups**

- **Not click-tested logged in:** adding an episode through the "Add podcasts…"
  bar or the Create List form. Verified logged out: `/api/search` across all
  three scopes, the show-then-episode rule on Sasha's own examples, the nav
  typeahead returning episodes, `/search` rendering them, and a searched
  episode link opening a real episode page (`#1575 - Bill Burr`, Dec 7 2020)
  for an episode that was never in the database.
- **Truncated feeds are a theoretical failure, not an observed one.** A show
  can drop old episodes from its RSS while Apple still indexes them, and
  `ensureEpisode` would then refuse. Checked JRE (2,743 in feed, back to 2009),
  Monday Morning Podcast (1,414), Huberman Lab (435) and The Daily (**58**,
  back only to Oct 2021): across every search tried, **zero** results were
  missing from their feed — Apple appears not to index what the feed no longer
  carries. The Daily's search results were all from the last two days. If it
  does happen, the create form now names the title to remove.
- **Adding an episode is slower than adding a show.** `ensureEpisode` fetches
  and parses the show's whole feed, ~3.5s cold for JRE. Creating a list with
  several episodes from different shows resolves them one at a time. Worth
  watching if list creation starts feeling slow.
- The nav search and `/search` page have **no** scope control — they got
  episodes but not the toggle. Add one if the progressive rule proves too
  blunt there.


### 2026-08-26 — Lists are real: the Joe Rogan mockup is gone

- **Branch:** `main`
- **Requested by:** Sasha — lists must stop landing on the Joe Rogan mockup;
  make a list work like Next listening (same "Add podcasts…" bar), with the
  Create List page as the first step when you press add list.
- **Status:** Complete, except the logged-in click-through — see Follow-ups.

**What changed**

- **`/list/[id]` renders from Postgres.** It used to serve one hardcoded mock,
  the "Joe Rogan- MMA Show" list, for *every* id — which is why creating a list
  appeared to work and then dropped you on somebody else's. An id that isn't a
  real list now 404s. `src/lib/jreMmaShowEpisodes.json` (590 lines of curated
  mock) is deleted.
- **Creating a list actually creates one.** `CreateListClient.handleSubmit` was
  a comment saying "no backend wired up yet" followed by
  `router.push("/list/joe-rogan-mma-show")`. It now POSTs the whole form to the
  new `/api/lists` and lands on the list it just made.
- **The owner gets the "Add podcasts…" bar on their own list**, so adding to a
  list after creating it means opening the list — the same gesture as Next
  listening. `AddPodcastsBar` took `endpoint` / `extraBody` / `collectionName`
  props for this; its default is unchanged, so Next listening's call site
  didn't move.
- **One shared item mapper.** `toListItemViews` in the new `src/lib/lists.ts`
  shapes `ListItem` rows for both a curated list and Next listening, so the
  hashed-guid episode-route gotcha only has to be right once. `appendListItem`
  likewise now backs both `/api/lists/items` and `/api/next-listening`.
- **Two bugs the above exposed, fixed:** the profile's Your lists tab queried
  `db.list.findMany({ where: { userId } })` with no `isWatchlist` filter, so
  Next listening showed there as a list the user made — the exact thing the
  schema comment says must never happen. And its per-list count read
  "N episodes" for lists that are mostly whole shows.
- **The mock "Popular Lists" cards** on Explore and the podcast/episode pages
  pointed at the deleted mockup; they are `href="#"` now. All three sit behind
  `HAS_COMMUNITY_DATA`, which is `false`, so nothing visible changed.

**Files touched**

| File | Change |
| --- | --- |
| `src/lib/lists.ts` | Added — `toListItemViews`, `getListForView`, `appendListItem` |
| `src/lib/nextListening.ts` | Modified — reuses `toListItemViews`; `NextListeningItem` is now an alias of `ListItemView` |
| `src/lib/jreMmaShowEpisodes.json` | Deleted — the mock list's data |
| `src/app/api/lists/route.ts` | Added — POST creates a list with its items |
| `src/app/api/lists/items/route.ts` | Added — POST adds one show/episode to an existing list |
| `src/app/api/next-listening/route.ts` | Modified — its inline dedupe-and-append is now `appendListItem` |
| `src/app/list/[id]/page.tsx` | Modified — real data, 404 on unknown id, watchlist redirect, owner's add bar |
| `src/app/list/[id]/ListDetailClient.tsx` | Modified — takes `ListItemView[]`; date sorts cope with undated shows |
| `src/app/list/[id]/list.module.css` | Modified — `.addRow`, `.empty` |
| `src/app/list/create/page.tsx` | Modified — redirects to `/login` when logged out |
| `src/app/list/create/CreateListClient.tsx` | Modified — real submit, saving/error states, trash icon |
| `src/app/list/create/createList.module.css` | Modified — `.error`, trash button alignment |
| `src/components/AddPodcastsBar.tsx` | Modified — `endpoint` / `extraBody` / `collectionName` props |
| `src/components/icons.tsx` | Modified — added `TrashIcon` |
| `src/app/user/[username]/lists/page.tsx` | Modified — excludes `isWatchlist`; count reads "podcasts" |
| `src/app/explore/page.tsx`, `src/app/podcast/[id]/page.tsx`, `src/app/podcast/[id]/episode/[epId]/page.tsx` | Modified — mock list cards no longer link to the deleted mockup |

**Why**

The Create List page collects everything and submits once, rather than creating
an empty list and appending to it, because that is what Sasha's frame shows —
title, description, ranked, a stack of added titles, one "Create List" button.
`/api/lists` therefore resolves every item through `ensurePodcast` /
`ensureEpisode` **before** creating the `List` row: a lookup that fails leaves
nothing behind instead of a half-built list, and the failure is reported rather
than silently dropping an entry the user watched themselves add.

The add bar was generalised rather than copied. Next listening's version had
already been debugged — the 250ms debounce and the sequence-number supersede
that stops a slow early response overwriting a fast later one — and a second
copy would have drifted.

`ListItemView.publishedAt` is null for shows on purpose. Only episodes have a
release date; giving a show its `createdAt` would silently mislabel "Earliest
first" as a release-date sort. Undated items keep list order and sit after the
dated ones in both directions, which is more honest than pretending a show is
either the oldest or the newest thing in the list.

"Average rating" was dropped from the sort menu. It sorted `Math.random()`
values on the mock, and there is no aggregated score on a list item to replace
them with. It never rendered anyway — `HAS_COMMUNITY_DATA` hides it — so
nothing visible changed, and leaving it would have meant a dead option the day
that flag flips.

Placement note: the add bar sits on its own centred row between the byline and
the count/description/sort row, so that row keeps the three-column layout the
Figma gives it. There is no frame for a list page *with* an add bar — the
reference Sasha gave was "just like in next listening".

**Follow-ups**

- **The logged-in write path is not click-tested.** Verified without a session:
  `/list/[id]` renders real rows with real hrefs, ranked numbering, both date
  sorts, the watchlist redirect, 404 on an unknown id, `/list/create` →
  `/login`, and both new endpoints returning 401. Verified with a temporary
  `List` seeded straight into Postgres and then deleted. **Not** verified:
  submitting the Create List form and adding through the bar on a real list.
  Sasha needs to sign in and do that once.
- **Only shows can be added from the Create List page**, because `/api/search`
  returns shows. `/api/lists/items` already accepts an `episodeKey`, so the
  "Add to list" button on an episode page is the missing half, not the API.
- **"Add to list" on the podcast and episode pages is still a handler-less
  `<button>`.** `/api/lists/items` is what it should call, with a list picker
  in front of it — and that picker must exclude `isWatchlist` lists.
- **A list can't be emptied.** There is no remove control on `/list/[id]`, the
  same as Next listening. The trash icons on the Create List page only edit
  client state before submit.
- **A list needs at least one title to be created** — the Create List button
  stays disabled until then, which is what the page already did. Worth a
  decision now that adding later from the list page works.


### 2026-08-26 — Next listening: built, and the placement decision REVERSED

**This supersedes the earlier spec entry that says the standalone route is "not
to be built".** That entry is now wrong; read this one instead.

Sasha changed the placement three times. Final answer, and what's in the code:

- The **profile** shows a plain stacked-cover thumbnail, like any other list.
  Both the heading and the gallery link through. **No search bar on it.**
- **`/user/[username]/next-listening`** is the list page: "Next Listening…"
  heading, the All media `FilterMenu` (same component as the ratings page, per
  "make it exactly like that"), the "Add podcasts…" bar for the owner, an item
  count, and a `MediaThumbCard` grid so covers hover.

**Storage:** `List` with `isWatchlist: true`, one per user, created on first
add — migration `add_list_is_watchlist`. It reuses `ListItem` and everything
that already understands list items. **It must stay excluded wherever real
lists are shown** (the add-to-list popup, the profile's Your lists tab) or it
appears as a list the user made.

**The "Add podcasts…" bar** reuses `/api/search` rather than adding a second
search. Debounced 250ms, and requests are superseded by sequence number so a
slow early response can't overwrite a fast later one — that flicker is easy to
ship by accident.

**VERIFIED 2026-08-26.** Sasha signed in and added items; confirmed directly
against Postgres. Two watchlists exist (one per account he uses), carrying
"#2542 - Steve Hilton" (episode), "The Joe Rogan Experience", "The Rest Is
History" and "Modern Wisdom". Search, add, ensurePodcast/ensureEpisode and the
ListItem write all work end to end.

Note: one watchlist per user means an item added from one login will not appear
under the other. That is correct behaviour, but it looks like data loss.

**Still not built** from the original spec: the calendar tab (should read
`LogEntry.listenedDate`, which is real data already being written), and wiring
the "Add to next listening +" button on podcast and episode pages — it is still
a handler-less `<button>`, though `/api/next-listening` exists and works.

### 2026-08-21 — SPEC (not built): real trending episodes on Explore

Replaces the hardcoded `popularEpisodes` array in `src/app/explore/page.tsx` —
eight invented episodes shown to everyone. Sasha wants it done in **one pass**,
linking to real episode pages rather than shipping the cheap version first.

**The source: Apple's Trending Episodes chart. Free, no key, already verified.**

```
https://rss.applemarketingtools.com/api/v2/us/podcasts/top/{n}/podcast-episodes.json
```

`feed.title` is literally "Trending Episodes". Same host and shape as the shows
chart already used by `getPopularPodcasts`, so extend that file rather than
starting a new one. Per-result fields: `id`, `name`, `artistName`, `kind`,
`artworkUrl100`, `genres`, `url`.

**Spotify is NOT the source, despite being the obvious guess.**
`api.spotify.com/v1/charts/podcasts` returns **410 Gone** — the Web API has no
charts endpoint at all. Spotify's podcast charts are a web page only. Don't
spend time on it even after the credentials arrive.

**The problem to solve: the chart gives no show id and no feed guid.**

Episode routes are `/podcast/{iTunesShowId}/episode/{hashedFeedGuid}`, and a
chart result has neither directly. Two things were tried and failed:

- Batched `lookup?id=<episodeIds>&entity=podcastEpisode` → **resultCount 0**.
  Chart episode ids are not resolvable through the lookup endpoint. Don't retry.
- There is no show-id field on the result.

**What does work, and is the build:**

1. **Parse the show id out of `url`.** Format:
   `podcasts.apple.com/us/podcast/<slug>/id360084272?i=1000784635823` — the
   `id<digits>` segment is the iTunes show id.
2. **Fetch that show's feed** via the existing `fetchPodcastFeed`, which is
   cached for an hour. 25 trending episodes come from roughly 12–15 distinct
   shows, so this is a dozen cached fetches, not 25.
3. **Match the episode by title.** The chart's `name` is the feed's episode
   title (verified: `#2543 - MrBallen` appears verbatim in the JRE feed). Then
   `episodeKeyFromGuid(match.guid)` gives the route key.
4. **Fall back to the show page** when a title doesn't match — do not drop the
   entry and do not guess. Title matching will fail occasionally across millions
   of feeds; a working show link is the correct degradation.

**Estimated ~1h15 total.** The naive version (links to shows only) is ~30 min,
but Sasha explicitly chose to do it properly in one pass.

**Also worth doing in the same pass:** Explore's "See full list" beside Popular
episodes is still `href="#"` — it had no source until now. Point it at a full
trending-episodes page, mirroring `/explore/top-podcasts`.

### 2026-08-21 — SPEC (not built): Next listening page, calendar tab, add-to-list wiring

Sasha's spec, with Figma frames for both the profile placement and the full page.

**1. Storage — decide this first, it blocks everything else.**
Next listening is one fixed collection per user. It must be distinguishable from
a real user list, or it will appear inside the add-to-list popup as if it were
one. Two options:
- **Add `isWatchlist Boolean @default(false)` to `List`** — correct and
  explicit; popup filters on `where: { isWatchlist: false }`. Costs a small
  migration, same shape as the two already applied.
- **Reserve a title** (e.g. "Next listening") and filter on the string — no
  migration, but a magic string nothing in the schema explains.

Claude recommended the flag. **Sasha has not confirmed** — he was asked once
before and the conversation moved on. Don't guess.

**2. Where it lives — REVISED by Sasha 2026-08-21.** **No separate tab or page.**
Next listening is a panel **on the profile page, below the recent logs**. He
changed his mind after the spec was first written; the standalone
`/user/[username]/next-listening` route in the original Figma frame is **not to
be built**. Everything below describes what that panel contains, in place.

Consequence: it is not in the profile sub-nav (Profile / Favorites / Your
Reviews / Your lists / Full diary stays as-is), and the "All media" menu now
filters a panel rather than a page — `FilterMenu` writes to the query string, so
selecting a filter will re-render the whole profile page. That is acceptable but
worth knowing; if it feels heavy, that menu is the one piece that may need a
local-state variant instead.

The panel contains, per the second Figma frame:
- Heading "Next Listening…"
- An **"Add podcasts…" bar that behaves like the site search** — type a podcast,
  pick it, it is added to the list. Search is already live against iTunes
  (`src/lib/search.ts`), so reuse that rather than writing a second search.
- An **"All media" menu copied exactly from the ratings page** — reuse
  `components/FilterMenu.tsx`, which already reads its selection from the query
  string. Sasha said "make it exactly like that", so do not fork it.
- A count ("4 podcasts") and a grid of covers.
- Grid should use `MediaThumbCard` for the hover popup, consistent with the
  ratings grid — title, plus date for episodes, no average rating while
  `HAS_COMMUNITY_DATA` is false.

**3. The calendar tab** — separate from the above. Both the Next listening panel and the
**calendar tab**. Both already exist on the profile as *demo-only* markup
(`demoNextListening`, `demoListenedDays`, `juneWeeks` in
`src/app/user/[username]/page.tsx`) rendered only for `DEMO_USERNAME`. Those are
hardcoded and need pointing at real data — the calendar in particular should
read `LogEntry.listenedDate`, which is real and already being written.

**4. Wire the button.** "Add to next listening +" on the podcast and episode
pages is currently a plain `<button>` with no handler — it was deliberately
unhooked from the Add podcasts popup on 2026-08-18 because Sasha was
redesigning it. It should now add the item directly, like Follow: optimistic
label flip, POST, revert on failure. Needs `ensurePodcast` / `ensureEpisode` on
the way in, same as every other write.

**Order:** storage decision → endpoint → button wiring (smallest, proves the
path) → the profile panel → the calendar. No standalone page.

### 2026-08-20 — Removed Similar podcasts; it returns as "listeners also follow"

- **Branch:** `main`
- **Requested by:** sashak@podtracker.studio — asked whether iTunes exposes
  similar podcasts, to be wired up if so and **removed entirely if not**.
- **Status:** Removed. Comes back from Podtracker's own data later.

**iTunes has no similar-podcast data. Verified directly, don't re-investigate.**

- The lookup response has **zero** related / similar / recommended fields.
- There is no `similarPodcast` entity — that request returns compressed junk,
  not a valid response.
- Apple's "You might also like" exists on their web pages but is not in the
  public API. Spotify's API doesn't expose it either.

**The obvious fallback also doesn't work.** The charts endpoint accepts
`?genre=` but **does not actually filter on it**: asking for genre `1303`
(Comedy) returned The Daily (News), Crime Junkie and Dateline (True Crime) —
the general chart, unfiltered. So "top shows in the same genre" is not
available from it.

**What was there:** five hardcoded shows with `picsum` placeholder images,
identical on every podcast page — a Joe Rogan page recommended the same five as
every other. Same class of problem as the fabricated episode list and the
random creator photos.

**A middle option was offered and declined:** genre-matched via
`searchPodcasts` on the show's own genre name, which would work since the
lookup does return real genres. Sasha rejected it as dressing up a weak signal
as a recommendation, consistent with cutting rather than faking (banners,
people profiles, Where to listen).

**How to build it properly, when there are users:** *listeners of this also
follow…*, computed from `PodcastFollow` / `Favorite` overlap. Genuinely better
than anything Apple offers and it is the Letterboxd model. Sasha's rough
threshold for switching to own-data signals elsewhere is ~100 users.

**Side effect:** this removed the last links to the legacy `jre` / `huberman` /
`doac` slugs, which fell through to the Modern Wisdom placeholder. Nothing in
the app now links to a non-numeric podcast id. The placeholder path in
`getPodcastDetail` still exists as a safety net for typed URLs.

`MediaThumbCard` and `tierFromScore` imports dropped with it; the podcast pages
now report zero lint warnings.

### 2026-08-20 — SPEC (not built): real reviews, then comments on reviews and lists

Sasha's next request, in his order: **make reviews publishable and readable, so
that when he writes his first review after logging in it works — with a comment
section under it.** Comments go under **all reviews and lists**. Figma exists
(`How a review looks like`): a "Comments" heading, rows of avatar + username +
text + MORE, then "Add comment" with an `Enter comment…` textarea and a blue
Submit pill.

**Do these in order. Comments cannot come first.**

**1. Reviews: the write half already works, the read half does not exist.**
`/api/log` stores `reviewText` on a `LogEntry` today — a review written now
genuinely persists. But **nothing reads it**. `/review/[id]` renders a hardcoded
array (JohnJam, Vito Corleone, Phillip Neiman) and never touches the database,
so a real review would sit in Postgres while the page shows fiction. Needed:
- `/review/[id]` loads a `LogEntry` by id instead of the mock array
- Popular reviews sections query real entries rather than their hardcoded lists
- The profile's recent activity shows the viewer's own

Note `ReviewWidget` has **no tier control**, so reviews written through it store
`tier: null`. Valid per Sasha's rule that rating is optional; adding one is a
design decision, not a bug to fix silently.

**2. Comments: needs a new table, so a migration.** Shape it like `LogEntry` —
nullable `logEntryId` and nullable `listId`, exactly one set, enforced in the
application layer:

```prisma
model Comment {
  id         String   @id @default(cuid())
  userId     String
  logEntryId String?  // comment on a review
  listId     String?  // comment on a list
  text       String
  createdAt  DateTime @default(now())
}
```

Then `POST /api/comments`, and a `Comments` component used by both the review
and list pages.

**Why this order.** A comment is a foreign key to the thing it is on. Reviews
and lists are both **entirely mock today** — `/review/[id]` and `/list/[id]`
have no database access at all — so a comment built now would attach to a string
in a source file. Build the read path first and comments attach to ids that
still exist tomorrow.

**Lists are further behind than reviews.** Reviews only need a read path; lists
have neither a create nor a read path wired. Comments on lists therefore land
after comments on reviews.

### 2026-08-18 — NEXT SESSION'S GOAL: 5,000+ shows reachable, with real episode pages

Sasha's goal for the next session, which he intends to spend entirely on this:
**every podcast reachable on the site, each with its full episode list and a
working page for every episode.**

He first said "at least 5,000", then clarified that was only because he assumed
that was the ceiling. **There is no ceiling** — the iTunes Search API is queried
live per request, so the reachable set is Apple's entire catalogue, millions of
shows. Don't build to a target number; there is nothing to count.

**Read this before starting: the goal is right, but "added to the site" should
not mean a bulk import.** Three separate things get conflated:

1. **Browsing a show already works for any iTunes id**, with no database row.
   `/podcast/360084272` renders live from iTunes + RSS today. Nothing needs
   pre-loading for a show to be viewable.
2. **Database rows are created on demand** by `ensurePodcast` the first time
   anyone follows, rates or logs a show. Pre-loading 5,000 rows nobody has
   touched would just be a large table with nothing attached to it.
3. **What actually blocks the goal is that two things are fake**, and they are
   the real work:
   - **Search is a static file.** `src/lib/search.ts` reads `searchData.ts`, a
     hand-written index. It never calls iTunes, so only shows written into that
     file are findable. **This is why it feels like podcasts must be added one
     by one.** Replacing it with a live iTunes Search call makes the entire
     catalogue reachable — far more than 5,000 — and the static file is deleted.
   - **Explore and the landing page use eight hardcoded `SEED_TERMS`** in
     `popularPodcasts.ts`. Real shows, fetched live, but a fixed list that
     reflects no popularity. Replace with the verified charts endpoint:
     `https://rss.applemarketingtools.com/api/v2/{country}/podcasts/top/{n}/podcasts.json`
     — max 100 per call, parameterised by country and `?genre=`.

**The genuinely missing piece is the episode page.** It still renders
`getMockEpisode`, so every episode shows the same invented Ezra Klein content
and its `epId` is not a real key. That is what "a page for every episode" needs,
and it is also the prerequisite for episode-level rating, logging and Next
listening — all of which correctly 404 today because `ensureEpisode` cannot
resolve a mock id. **Do this one first**; the others are smaller.

The full episode list page (`/podcast/[id]/episodes`) should be checked too — it
is believed to be hardcoded.

Order that respects the dependencies: episode page on real data → search live →
Explore/landing on the charts.

### 2026-08-18 — SPEC (not built): "Next listening" panel on the profile

- **Requested by:** sashak@podtracker.studio, end of session. Specified fully;
  no code written. Recorded so the next session builds it rather than
  re-deriving it.
- **Status:** Not started.

**What it is**

A panel on the **profile page, to the right of the diary**, headed **"Next
listening"**. That is the name throughout — an earlier message said "watchlist"
and Sasha corrected it: Next listening everywhere, in UI and in code.

Modelled on the **Create List page's "Add title…" control** — the search box
that finds an episode and adds it. But:

- **No Title or Description fields.** Those exist because a list is named; this
  collection is fixed and per-user, so they are meaningless here.
- Added episodes render as a **gallery of covers**, not a titled list.

**Data model — no migration needed**

A single fixed collection per user, not a general list, and it must never appear
among the user's real lists. Either one `List` row per user created on first
add, or its own small table. **Do not** add an `isWatchlist` flag to `List` —
that was discussed and then made unnecessary by this simpler shape.

**How the two buttons behave** (same session)

- **"Add to next listening"** — direct, no popup. Click and it is added, exactly
  like Follow, and should survive a refresh via `lib/viewerState.ts` the way the
  Follow button now does.
- **"Add to list"** — opens a popup listing **your** lists to choose from, like
  Spotify adding a song to a playlist. With no lists yet it shows an empty
  state; give it a route through to Create list, because a popup offering
  nothing and no exit is a dead end. The modal shell already exists
  (`AddPodcastsPopup`) and can be reused with different contents.

Both are currently plain, handler-less `<button>`s on the podcast and episode
pages — the Add podcasts popup was unhooked from them on Sasha's instruction
because he was redesigning what they should do. This entry is that redesign.

**Prerequisite worth knowing**

Adding an *episode* to anything goes through `ensureEpisode`, which resolves a
hashed guid against the show's feed. The **episode page is still mock**
(`getMockEpisode`), so its `epId` is not a real key and episode-level writes
404. Show-level writes work. Either point that page at real data first, or
expect Next listening to work only where a real episode key is available.

### 2026-08-18 — Centred the two people strips; dropped the fake creator photos

- **Branch:** `main`
- **Requested by:** phillipn@podtracker.studio — "center everything", and replace
  the placeholder creator/podcast images with real ones.
- **Status:** Centring complete. Photos **partially** complete — one real
  creator photo exists and is now used; the rest cannot be sourced from here.

**Centring: there was exactly one real problem, and this is what it was**

Measured every page in Chromium at 1440px. **Every page's content column was
already centred** — `.main` has `margin: 0 auto` everywhere, and left/right gaps
were symmetrical on all eight pages checked. Nothing needed centring at the page
level, which is why the earlier answers to this request kept saying so.

The thing actually reading as off-centre was narrower: `.creatorsList` and its
twin `.featuredPeopleList` are `max-width: 560px` boxes inside a 960px column,
with no horizontal margin — so they sat hard left with a **376px gap** on their
right. They were the *only* two stranded elements in the whole app. Both now
carry `margin: 0 auto`; gaps are 200px/200px. A re-audit of all eight pages
reports zero stranded elements.

The episode page's copy was fixed too, deliberately: the two are the same
component, and fixing one would have made them diverge.

**Photos: what changed and what could not**

- **All 18 creator portraits were random `picsum.photos` images** — an unrelated
  stranger's face under a named, real, living person's name. That is worse than
  no photo, because it is convincing enough that nobody spots it. They now fall
  back to `/default-avatar.webp`, the neutral silhouette already in this repo.
- **Chris Williamson now has a real photograph**, reusing
  `/explore/trending-chris-williamson.jpg` — Sasha added it for the Trending
  users strip on Explore, and the registry points at that file rather than
  shipping a second copy. It is the only real creator photo in the repo.
- **The Tim Dillon Show cover** now uses `/explore/ep-tim-dillon.jpg` instead of
  a placeholder.
- `public/creators/README.md` — **new.** Documents the drop-in convention
  (`public/creators/<slug>.jpg` → set `avatarUrl`), and carries the licensing
  warning, because these are photographs of real people and a press photo or a
  search-engine result is not usable just because it is public.

**Why the other 17 photos are still blank, and why that is not laziness**

There is no source available that is both reachable and lawful. This container's
gateway 403s every image host, so nothing can be fetched. More importantly,
photographs of public figures are somebody's copyright; Wikipedia is not a way
round it, because its images are licensed per-file, some are non-free, and the
summary API returns no licence or author for them at all. Supplying these needs a
human with licensed files. The plumbing is done — each one is a one-line change
once a file exists.

**Six show covers are still placeholders** — Modern Wisdom, The Ezra Klein Show,
Huberman Lab, The Tucker Carlson Show, The Rewatchables, The Game. No real
artwork for them exists in `public/`. The right long-term fix is the iTunes
artwork the app already fetches for podcast pages, which needs each show's iTunes
id; those cannot be looked up from here, and guessing them would put the wrong
show's art on a page.

**Verified**

Automated centring audit across `/`, `/explore`, `/following`, `/podcast/[id]`,
`/person/[slug]`, the episode page, `/search` and `/login`: all columns centred,
zero stranded boxes. `tsc --noEmit` and `eslint` clean. Creators strip renders at
200px/200px with the real Chris Williamson photo.

**Follow-ups**

- 17 creator photos and 6 show covers need licensed files. See
  `public/creators/README.md`.
- Everything still open from the entry below — unverified bios, the unattributed
  Joe Rogan text, and legacy slugs rendering the Modern Wisdom placeholder.
- The "Creator" heading stays left-aligned while its box is now centred, which is
  consistent with every other heading on the page but does mean heading and box
  no longer share an edge. The alternative is a full-width box matching Recent
  episodes. Not changed — phillipn asked for centred.

### 2026-08-18 — Creator pages wired up: a shared registry, and a Creators strip on the podcast page

- **Branch:** `claude/website-setup-local-4ydg75`
- **Requested by:** phillipn@podtracker.studio — wanted a page per creator
  outlining their life story, the creators listed below the show on the podcast
  page, and a "more on the creator" link through to that page. Supplied a
  reference screenshot of the layout.
- **Status:** Complete for the feature as described. The biography copy is
  **unverified** — see Follow-ups, this matters.

**The starting point was better than it looked**

`/person/[slug]` already existed and already matched the supplied reference
almost exactly — photo and bio in a left column, name top-right, "Hosted show",
"Appearances as a guest", sort controls. It was properly styled. The actual gap
was that **nothing in the app linked to it**: a repo-wide search for `/person/`
found exactly one link, the episode page's "Featured people" strip. Only three
people were defined, one of which (`joe-rogan`) was unreachable except by typing
the URL.

So this was a wiring job, not a page build.

**What changed**

- `src/lib/creators.ts` — **new.** A curated registry of 18 creators, the single
  source of truth for who presents a show. Both the podcast page and the creator
  page read it, so adding one entry lights up both.
- `src/app/podcast/[id]/page.tsx` — a Creators strip directly below the show
  header, each row linking to `/person/[slug]` with a "More on the creator →"
  affordance. Heading is "Creator" or "Creators" depending on count.
- `src/app/podcast/[id]/podcast.module.css` — the `.creator*` rules.
- `src/app/person/[slug]/page.tsx` — now reads name/photo/bio/hostedShow from the
  registry instead of its own local record. Guest appearances stay local mock
  data, because no public API supplies them.

**Why the registry is hand-curated and not derived from the API**

This is the important decision. iTunes gives every podcast an `artistName`, and
using it to look a person up would have been one line. It is also the single
most dangerous thing this feature could do: `artistName` is free text and is
frequently an organisation — this repo's own seed list contains "Up First NPR"
and "The New York Times". A company name resolves to a perfectly well-formed
biography, so the failure is silent and confident: a corporate history rendered
under a person's headshot, with no error anywhere to catch it.

So a name only becomes a creator because a human put it in the registry.
`getCreatorsForPodcast` consults an explicit id→slugs map first, and only then
falls back to the show's author name — and that fallback requires an exact hit
in the curated registry, so an unknown name yields **nothing** rather than a
wrong person. Verified: `"NPR"`, `"The New York Times"` and `"Pardon My Take"`
all return `[]`.

The host/show pairings come from `prisma/seed.mts` and the `hosts` fields in
`src/app/following/FollowingGrid.tsx` — the two places in this repo that already
record who presents what.

**Two real defects were found by review and fixed before commit**

1. **Prototype-chain crash.** `PODCAST_CREATORS[podcastId]` indexed a plain
   object literal with an unsanitised URL segment, so `/podcast/constructor`,
   `/podcast/toString`, `/podcast/__proto__` etc. returned a truthy non-array and
   threw `mapped.map is not a function`. There is no `error.tsx` anywhere under
   `src/app`, so that was a 500 on URLs that previously rendered the placeholder
   page. Fixed with `Object.hasOwn` guards on all three lookups. Those routes now
   return 200 again.
2. **Hover contrast.** The strip copies the episode page's Featured-people rules
   verbatim, including `:hover .role { color: #93c5fd }`. Against this row's
   `#f5f8ff` hover background that measures **1.70:1**, where WCAG AA wants 4.5:1
   at 12px — the role line vanished at the moment the user pointed at it. That
   one rule is deliberately dropped, leaving `var(--text-muted)` (~7:1). It is the
   only place the strip departs from the episode idiom. **`episode.module.css`
   has the identical failure and wants the same fix — not touched, it is Sasha's
   page to change.**

Also fixed: the registry listed only Bill Simmons for The Rewatchables while
`FollowingGrid` records three hosts, so the strip printed the singular "Creator"
and asserted he was the whole answer. Sean Fennessey and Chris Ryan added.

**Verified**

`tsc --noEmit` clean, `eslint` clean, `npm run build` compiles all 28 routes.
All 18 creator pages return 200, plus the unknown-slug fallback. Round trip
exercised in Chromium: podcast → creator row → creator page → hosted show →
back. Multi-creator (`matt-shane`, `rewatchables`), single-creator and
no-creator resolution all confirmed, and no nested `<a>` in the rendered output.

**Follow-ups**

- **The biographies are unverified editorial copy about real, named, living
  people, and should be reviewed before launch.** The review pass that was
  checking exactly this died on a session limit — ten of its verification agents
  never ran — so no independent check of the factual claims completed. They were
  written conservatively and confined to professional facts, but that is not the
  same as having been checked.
- **The `joe-rogan` bio appears to be Wikipedia's article opening**, carried over
  unchanged from the original person page. It predates this change, but it is now
  in a new file and still carries no attribution. Wikipedia text is CC BY-SA:
  reusing it obliges a credit link to the article, a named and linked licence,
  and an indication that it was modified. Either attribute it or replace it.
- **A Wikipedia-backed bio layer was scoped but deliberately not built.** It would
  scale to any creator, but it puts CC BY-SA text on the product and needs a
  visible attribution line that appears in no Figma frame. That is a call for
  Sasha and phillipn, not one to make silently. The design is in the session
  notes: curated slug→article-title map (never a free-text search), accept only
  `type === "standard"`, a mandatory User-Agent or Wikimedia 403s, and **do not**
  display Wikipedia photos — the summary endpoint returns no licence for them.
- **The strip can contradict the rest of the page.** `getPodcastDetail` renders
  the "Modern Wisdom" placeholder for any non-numeric id, so `/podcast/crime-junkie`
  shows Modern Wisdom's title, author and episodes while the new strip correctly
  names Ashley Flowers for the URL you asked for. The root cause is the
  pre-existing placeholder, not the strip, and the real fix is mapping the legacy
  slugs to real iTunes ids — which needs a machine with egress to look them up.
  Guessing ids would reintroduce exactly the wrong-show risk this design avoids.
- Every `hostedShow.href` points at a non-numeric slug, so all of them currently
  land on that same placeholder. Same fix as above.
- `bombcast` and `the-op` have recorded hosts in `FollowingGrid` but no registry
  entries; they degrade correctly to no strip.
### 2026-08-17 — Podcast page defaults to the no-users design; Listens/Likes are real

- **Branch:** `main`
- **Requested by:** sashak@podtracker.studio — the podcast page should open in the
  no-users state (his Figma Frames 11 + 13) since there is no user base, but must
  keep rating and reviewing; the full episode list must stay in **both** states;
  and Listens/Likes should read zero now and move as people use the site.
- **Status:** Complete

**What changed**

- `src/app/podcast/[id]/page.tsx` — added `HAS_COMMUNITY_DATA = false`. With it
  false the page renders the no-users design; flipping the one line restores the
  with-users design (Frames 4 + 6). Gated behind it: the consensus average +
  mic, the ratings distribution, Friends' activity, the "Top rated episodes"
  link, Popular reviews, and Popular Lists.
- `src/lib/podcastStats.ts` — **new.** `getPodcastCommunityStats` counts
  `LogEntry` (listens) and `Favorite` (likes) for a podcast. `formatCount`
  renders 0 → "0", 1_500 → "1.5k", 980_000 → "980k", 2_400_000 → "2.4M".
- The Listens/Likes stats now use those counts instead of the hardcoded "980k" /
  "405k".

**Two things deliberately NOT gated**

- **Rate and Log/Add review stay in both states.** Gating them would make the
  first rating impossible to create — the state could never end. Never put them
  behind `HAS_COMMUNITY_DATA`.
- **"Full episode list" stays in both states.** Sasha's reasoning: the episode
  list comes from the API, so it is real data that exists with zero users. Only
  "Top rated episodes" is gated, because ranking needs ratings.

**Why Listens/Likes read 0, and why that is correct**

They are the community's numbers, not the show's — no podcast API exposes them.
They now come from this app's database and are genuinely zero because nobody has
used the site yet. They climb on their own; nothing needs changing later.

**The caveat that matters:** the lookup goes through `Podcast.externalId`, but
**nothing in the codebase ever writes a `Podcast` row** (verified — no
`podcast.create` or `podcast.upsert` anywhere in `src/`), and the podcast pages
route on **iTunes** ids while `externalId` is commented as a *Podcast Index* id.
So no page currently has a local record to match, and every call returns zeros
via the not-found path rather than by counting. The query is correct and will
light up the moment podcasts are persisted under the id the route uses — but
**that id-scheme mismatch is unresolved and needs a decision**, either persisting
podcasts keyed by iTunes id or adding a dedicated `itunesId` column.

`getPodcastCommunityStats` never throws; a database outage degrades to zeros
rather than 500ing a page whose show data came from the API and renders fine.

**Verified**

`/podcast/360084272` renders Episodes 2,737 (API), Listens 0, Likes 0 (database).
Full episode list present, Top rated absent, Rate and Log/Add review both
present, and all six community sections gone. `tsc --noEmit` and `eslint` clean.

**Follow-ups**

- The id-scheme mismatch above.
- `community.avgScore`, `distribution`, `friendsActivity`, `reviews` and `lists`
  constants are retained, unused while the flag is false. They are the with-users
  design's data and should not be deleted.
- The episode page's `height: 100vh` banner (previous entry) is still open.

### 2026-08-17 — Logo added to the nav, on the blue rather than on a black tile

- **Branch:** `main`
- **Requested by:** sashak@podtracker.studio
- **Status:** Complete.

**What changed**

`SiteNav` now renders `/logo.png` at 88×88 as the first item, left of the
wordmark. No tile behind it — the PNG is transparent (86.4% of its pixels), so it
sits directly on the nav blue.

**Why not the black tile the Figma shows**

Built it that way first and it looked wrong, so the backdrops were measured. The
logo contains a very dark element (charcoal `#333333` headphones) and a light one
(green `#8BC53D` thumb), and **no flat backdrop serves both**:

| Backdrop | headphones | green thumb | red thumb |
| --- | --- | --- | --- |
| Black (the Figma's tile) | **1.66** | 10.15 | 4.22 |
| Nav blue `#C3DBFF` | 8.96 | **1.47** | 3.53 |
| White | 12.63 | **2.07** | 4.98 |
| Page grey | 10.22 | **1.67** | 4.03 |

3:1 is the usual floor for a graphic to be distinguishable. On black the
headphones — the main shape — measured **1.66:1** and effectively disappeared,
leaving a black square with a coloured squiggle. Sasha's call was to drop the
tile and put it straight on the blue, where the headphones hit **8.96:1** and
carry the same weight as the wordmark. The green thumb washes out at that size;
that's the accepted trade.

**Do not "fix" this by re-adding a tile.** Any flat backdrop fails one element or
the other. The real fix is to the artwork: darken the green (toward the brand's
`#28BA60`) so it survives on light, or lighten the headphones so they survive on
dark. That's Sasha's to decide, and it also affects the favicon.

**Still outstanding on the asset itself** — `public/logo.png` is 561×561 but the
artwork occupies only 375×325, so **38.7% of the canvas is empty padding** and the
mark renders ~40% smaller than its box. Edge transitions average 3.5px against
1–2px for a clean vector export, so it was upscaled or lossily recompressed at
some point. Sasha is sourcing a better original; cropping the padding is the
cheap win in the meantime.

### 2026-08-17 — Search results page brought in line with the rest of the site

- **Branch:** `main`
- **Requested by:** sashak@podtracker.studio — sent the search-results Figma and
  asked that it match the site's nav, font and background.
- **Status:** Complete.

**What changed**

One line: `font-family: var(--font-display)` on `.main` in
`src/app/search/search.module.css`. Result titles and subtitles were rendering
in Roboto because only the two `<h2>`s picked up the global serif rule.

Nothing else needed touching. The page already used the shared `SiteNav` and
`SiteFooter`, `--text`/`--text-muted`, and inherited the page background, and its
markup already matched the design: "Showing results for …", a **Top result**
block with large cover + title + subtitle, then **Other results** rows.

**Deliberately did NOT copy the mockup's nav.** The Figma still shows the old
white bar with the "Podcast Website" wordmark and a Genres link. The live nav is
the current one — `#C3DBFF`, 100px, "Podtracker", no Genres — which is what
"match the rest of the site" means here. The mockup's nav is stale, not a spec.

**Verified**

`/search?q=Tucker Carlson`: page background `rgba(158,158,158,0.25)`, nav
`rgb(195,219,255)` at 100px with no Genres, all 11 text elements PT Serif
Caption, zero ratings displayed. HTTP 200, `tsc --noEmit` clean.

**Follow-ups**

- Search runs on the mock `src/lib/search` data, not the iTunes layer the
  podcast page uses. Covers are placeholder photos rather than real artwork.
- At viewports narrower than ~960px the page scrolls horizontally, driven by the
  nav rather than this page. Pre-existing and site-wide — the app has no
  responsive breakpoints at all, which phillipn also flagged on 08-16.

### 2026-08-18 — Following page shows the real empty state

- **Branch:** `main`
- **Requested by:** sashak@podtracker.studio — ship the right-hand Figma frame.
- **Status:** Complete.

**This closes a gap flagged in an earlier entry.** `/following` rendered a
hardcoded `FollowingGrid` of eight shows, so the "No Favorites…" state Sasha had
designed *could never appear no matter what a user did*. Gating on a flag would
have been wrong — this isn't community data, it's the viewer's own list, and a
brand-new user will have an empty one even after launch.

So the page now reads real data: `db.favorite.count()` for the signed-in user.
Zero renders the empty state; anything else renders the grid. It reports zero
today because nothing can create a favourite until the write layer lands, and it
will start filling in on its own afterwards with no change here.

- `/following` now **requires a login** — "Your shows!" is inherently personal.
  Logged out it 307s to `/login`.
- `FollowingGrid` is kept for the populated branch, still on mock data.
- **"Add Favorites" points at `/explore`** as an interim. Sasha is designing a
  find-shows popup to replace it; a button that did nothing seemed worse than one
  that reaches somewhere real. Swap the `href` when the popup exists.

**Verified:** logged out → HTTP 307. Signed in → heading "Your shows!", "No
Favorites...", "Add Favorites" with the plus icon, both in PT Serif Caption, and
no trace of the eight mock shows. `tsc --noEmit` and `eslint` clean.

### 2026-08-18 — Explore stops after Popular episodes (no-users design)

- **Branch:** `main`
- **Requested by:** sashak@podtracker.studio — the Explore page still showed the
  full with-users layout; he wants the right-hand Figma frame for now.
- **Status:** Complete.

**What changed**

`Trending users`, `Popular lists` and `Curated lists` are now behind
`HAS_COMMUNITY_DATA`, along with the dividers that separated them. The page runs
hero → Top podcasts of today → Popular episodes → footer.

All three rank things that cannot exist without a user base — follower counts,
user-made lists, top-rated shows — so they are gated rather than fed placeholder
data. Flipping the shared flag restores all three at once, in order.

**What they contain, for whoever turns them back on**

- **Trending users** — circular avatars with name and follower count, "See more
  →". Names and follower counts are Roboto, the deliberate exception to this
  page's PT Serif Caption.
- **Popular lists** — author avatar and name, list title, 3-up cover filmstrip
  with a `+N` badge.
- **Curated lists** — three wide cards, title overlaid in white: Top rated shows,
  Top rated episodes, Most popular shows.

**Verified:** headings render exactly `Discover more podcasts!` → `Top podcasts
of today` → `Popular episodes`; all three gated sections absent; footer intact;
exactly one divider, so no trailing separators are left behind. `tsc --noEmit`
and `eslint` clean.

### 2026-08-17 — Account Settings: the Authentication tab is real

- **Branch:** `main`
- **Requested by:** sashak@podtracker.studio — sent the Edit profile Figma and
  asked whether the page had been updated, and if not to build it to match.
- **Status:** Complete and working end to end.

**The Display tab already matched** Frame 1 — heading, tabs, avatar with the plus
overlay, Username/Email, Display name/Links, Bio. Untouched.

**The Authentication tab was a placeholder** reading "haven't been designed yet".
Frame 2 designs it, so it is now a real Change password form: Current Password,
New Password, Confirm New Password, stacked in a centred 320px column.

**This one actually persists**, unlike the podcast write layer — auth already runs
on bcrypt plus Postgres sessions, so nothing was deferred.

- `src/app/api/account/password/route.ts` — **new.** Verifies the current
  password with `verifyPassword`, enforces the same 6-character minimum as
  signup, rejects a no-op change, then writes a fresh bcrypt hash.
- **It also signs out every other session.** If the password was changed because
  someone else knew it, leaving their session alive would defeat the point. The
  current session is kept so the user isn't kicked out of the page.
- `hashToken` is now **exported** from `src/lib/auth.ts`. The route needs it to
  identify the current session; the first draft duplicated the function, which
  would silently drift if the hashing ever changed.
- The form clears all three fields on success rather than leaving the new
  password sitting in the DOM.

**Verified:** `/settings` 307-redirects when logged out; `POST
/api/account/password` returns 401 unauthenticated. Signed in, the tab renders
"Change password" with exactly the three labels from the frame, all three inputs
`type="password"`. `tsc --noEmit` and `eslint` clean.

### 2026-08-17 — Logo in the nav, on the blue rather than on a black tile

- **Branch:** `main`
- **Requested by:** sashak@podtracker.studio
- **Status:** Complete

`SiteNav` now renders `public/logo.png` before the wordmark, 88px square.

**Why there is no black tile, despite the Figma showing one.** Built as designed
first, and the charcoal headphones disappeared. Measured contrast of the logo's
three parts against each candidate backdrop:

| Backdrop | headphones `#333333` | green thumb `#8BC53D` | red thumb `#DC1B1B` |
| --- | --- | --- | --- |
| Black tile (Figma) | **1.66** | 10.15 | 4.22 |
| Nav blue `#C3DBFF` | 8.96 | **1.47** | 3.53 |
| White | 12.63 | **2.07** | 4.98 |
| Page grey | 10.22 | **1.67** | 4.03 |

3:1 is the usual floor for a graphic to be distinguishable. **Every flat backdrop
fails something** — the artwork contains both a very dark element and a light one.
Sasha chose the blue (headphones read at ~9:1); the green thumb washes out, which
he accepted. Fixing it properly means editing the artwork — darkening the green
toward the brand's `#28BA60` would let the whole mark work on light backgrounds.

The PNG is already transparent (86.4% of pixels, corner alpha 0), so no asset
change was needed. Nav padding stayed symmetric — an earlier flush-left variant
for the tile was reverted with it.

**Still true of the asset:** 38.7% of its canvas is transparent padding, so it
renders ~40% smaller than its box, and edge transitions average 3.5px against
1–2px for a clean vector. A better original is still outstanding.

### 2026-08-17 — No average ratings anywhere; the flag is now one shared constant

- **Branch:** `main`
- **Requested by:** sashak@podtracker.studio — remove the average rating from
  episode hover cards and make sure no show or episode displays one anywhere,
  since none exist yet. He plans to flip this back on shortly after he and his
  partner publish and start logging.
- **Status:** Complete.

**One switch for the whole site**

`src/lib/community.ts` — **new**, exporting a single `HAS_COMMUNITY_DATA`. The
podcast and episode pages each had their own copy of this constant, which meant
turning the site on later would have been a multi-file hunt. There is now
**exactly one definition**; flipping that one line reveals every gated section
at once.

**Where the average rating was removed**

| Place | How |
| --- | --- |
| `MediaThumbCard` hover popup | Gated inside the component, so **every** consumer is covered at once — list pages, Similar podcasts, anywhere else it gets used later. Callers may keep passing `rating`; it just doesn't render. |
| `/explore` — podcast covers and episode thumbs | Both inline `hoverCardRating` rows gated |
| `/home` — episode grid | Inline `hoverCardRating` row gated |
| `/list/[id]` — "Average rating" **sort option** | Filtered out of the dropdown; sorting by a rating nothing has is meaningless |
| Podcast + episode pages — consensus score and distribution | Already gated (earlier entries), now via the shared flag |

Hover popups still show **title and date** — only the score and tier label are
suppressed, so the hover feature keeps working.

**Verified**

`/explore`: 0 rating rows, 0 scores, 0 tier labels, with all 16 hover titles and
dates intact. `/list/joe-rogan-mma-show`: sort options are now List order /
Earliest first / Newest first, 0 `media-thumb-score` and 0 `media-thumb-tier`
elements, 100 titles intact. All four pages HTTP 200, `tsc --noEmit` clean.
`eslint` reports 3 pre-existing warnings in files not touched here.

### 2026-08-17 — Episode page ships the no-users design; banner removed entirely

- **Branch:** `main`
- **Requested by:** sashak@podtracker.studio — sent both Figma variants and said
  the right-hand (no-users) one ships now. Also decided episode pages get **no
  banner at all**.
- **Status:** Complete.

**The banner is gone, deliberately**

Sasha's reasoning: "podcasts arent as artistic obv as films or shows, so I don't
really think they're necassary for now." The markup in `page.tsx` and the
`.banner` / `.banner img` / `.bannerOverlay` rules in `episode.module.css` were
**deleted, not hidden**, with a comment left in the stylesheet so nobody
reinstates one. `bannerUrl` is out of the mock data too.

This also closes the defect flagged in the 2026-08-16 entry: the banner was
`height: 100vh`, which pushed the episode `<h1>` to y≈1066 and entirely below the
fold. Measured after removal: **title top is now 166px**, well above the fold.

Removing it was safe because `.episodeInfoRow` uses `margin-top: 40px` — a
*positive* offset — rather than the negative pull-up the podcast page uses. No
overlap bug of the kind fixed on 08-16.

**He has NOT decided about the podcast page banner.** Leave that one alone.

**What the flag gates**

`HAS_COMMUNITY_DATA = false`, same pattern as the podcast page. Hidden: average
rating, ratings distribution, Popular reviews, Popular Lists. Kept in both
variants: header, description, Where to listen, Rate, Log/Add review, Add to
list, Previous/Next episode, and **Featured people** — host and guest are show
data, not community data, so they belong in both.

**Verified**

Rendered `/podcast/360084272/episode/1114`: no element matching `[class*=banner]`
in the DOM, all four community sections absent, all seven keepers present, title
above the fold. `tsc --noEmit` and `eslint` clean.

**Follow-ups**

- The episode page is still entirely mock data — it does not use the iTunes/RSS
  layer the podcast page now has.
- Episode ids are still the feed position (`1`, `2`, …). This blocks episode
  ratings entirely: a rating attached to "position 3" points at a different
  episode as soon as a new one publishes. **Fix identity before building the
  write layer.**

### 2026-08-17 — Podcast page ships the no-users design; Listens/Likes made real

- **Branch:** `main`
- **Requested by:** sashak@podtracker.studio — the podcast page should show his
  no-users Figma variant by default since there is no user base, but rating and
  reviewing must stay available. Also asked that Listens/Likes reflect actual
  user activity rather than hardcoded numbers.
- **Status:** Complete for the page. The write layer that would make those
  numbers move is **deliberately deferred** — see below.

**What changed**

- `HAS_COMMUNITY_DATA = false` in `src/app/podcast/[id]/page.tsx` gates
  everything that needs a user base: average/consensus rating, ratings
  distribution, Friends' activity, Top rated episodes, Popular reviews, Popular
  Lists. Flipping the one constant restores the with-users design.
- `src/lib/podcastStats.ts` — **new.** `getPodcastCommunityStats` counts
  `LogEntry` (Listens) and `Favorite` (Likes) for a podcast; `formatCount`
  renders `0` / `950` / `1.5k` / `980k` / `2.4M`. Never throws — a database
  outage degrades to zeros rather than 500ing a page whose show data came from
  the API and renders fine.
- The page now shows those real counts instead of the hardcoded `980k` / `405k`.

**Two things Sasha was explicit about — do not "tidy" these**

- **Rate and Log/Add review are never gated** on `HAS_COMMUNITY_DATA`. They are
  how the first data ever gets created, so they appear in both variants.
- **Full episode list stays in both variants.** The episode list comes from the
  API and exists regardless of users. Only *Top rated* is gated, since ranking
  episodes requires ratings.

**The counts will read 0 until the write layer exists, and that is deferred**

Investigating this surfaced that **no user action on the site persists at all**:

- `FollowButton`, `RatingWidget`, and `ReviewWidget` are `useState` only, with
  zero network calls. Click Follow or write a review, refresh, it's gone.
- The only write endpoints are `account`, `auth/*`, and `favorites`. There is
  nothing for ratings, reviews, logs, or follows.
- `/api/favorites` would itself fail — it writes a `Favorite` whose `podcastId`
  is a foreign key to a `Podcast` row, and nothing anywhere creates one.
- Podcast pages route on iTunes ids while `Podcast.externalId` is documented as
  a Podcast Index id, so no page can match a local record regardless.

Sasha's call was to build the whole write layer as **one batch later** rather
than piecemeal. That's the right sequencing: they share one prerequisite
(persisting the podcast row) and a log, rating, and review all hang off the same
record, so doing them separately means touching the same code three times.

`getPodcastCommunityStats` is the read half and is already correct — when writes
land the numbers move with no change to it. **Do not rewrite it.**

**When that batch happens — no schema migration is needed.** `PodcastRating`,
`LogEntry`, `PodcastFollow` and `Favorite` all exist, and `Podcast.externalId`
is already an optional unique string that can hold the iTunes id. The work is:
upsert a `Podcast` row on first interaction (this alone unbreaks favoriting),
add follow/rate/log routes, wire the three widgets.

**Follow-ups**

- **Rate vs Log — answered by Sasha 2026-08-17.** *Rate* is the tier alone: it
  counts toward averages and the distribution but creates no diary entry (for
  rating something you heard a while ago). *Log* is a rating **plus** a diary
  entry with the date you listened, and optionally a review. So a log writes two
  records — a `LogEntry` and an upserted rating — while a rate writes one.
  **This supersedes the comment above `model LogEntry` in `prisma/schema.prisma`**,
  which currently claims LogEntry is "decoupled from Rating… no rating". Fix that
  comment when building, and note `ReviewWidget` captures only a date and text
  today, so it needs a tier control added.
- **The diary is a time capsule — decided by Sasha 2026-08-17.** A diary entry
  must always show the rating as it was *when logged*; re-rating later must never
  change an old entry, because the point of the diary is understanding what you
  thought at the time. This means **`LogEntry` needs a `tier` column** — the only
  schema migration in the write-layer batch.
  **Consequence:** there are then two sources of rating truth — the current
  rating (one per user per item) and the historical log tier (many per item).
  **Averages and the distribution bars must read the current rating, never the
  logs**, or someone who relistens and logs three times counts three times and
  skews the distribution.
- **Show ratings vs episode ratings — decided by Sasha 2026-08-17.** They are
  separate and independent, "just like IMDb": rating a show is its own act, not
  an average of your episode ratings. The schema already models this with two
  tables (`PodcastRating`, `EpisodeRating`) — don't collapse one into the other.
  He plans to surface them as two separate sections on the profile later.
- `Add to list` and `Add to next listening` remain handler-less buttons, and are
  absent from these Figma frames entirely. Left alone — Sasha is building those
  flows himself.
- The episode page's `height: 100vh` banner from the previous entry is still
  open, still a design decision.

### 2026-08-16 — Podcast page title no longer renders on top of the banner

- **Branch:** `claude/website-setup-local-4ydg75`
- **Requested by:** phillipn@podtracker.studio — reported the podcast page looked
  "really weird", with the podcast name too close to the banner.
- **Status:** Complete for the podcast page. A worse, separate banner problem on
  the **episode** page was found and deliberately left alone — see Follow-ups.

**What changed**

`.podcastRight` in `src/app/podcast/[id]/podcast.module.css` went from
`padding-top: 64px` to `104px`.

**Why**

Arithmetic bug, not a taste call. `.podcastInfo` carries `margin-top: -80px` so
the block rides up over the banner and the cover art overlaps it. The right-hand
column then has to push the title back *down* by at least that same 80px. It only
pushed 64px — 16px short — so the `<h1>` rendered inside the banner's dark
gradient. Measured at 1440px: the title box started at y=444 against a banner
bottom edge of y=420, i.e. a **gap of −16px**. The visible result was the banner
edge slicing through the middle of the letterforms, with near-black title text
sitting on the dark half of the gradient.

80px would land the title exactly on the seam, so the value is 80 + 24 = 104,
where 24px is the spacing step already used throughout this stylesheet. Gap is
now +24px.

The title still sits beside the cover art as designed — cover spans y=340–520,
title y=444–507 — so the overlap composition is preserved, the heading just
clears the banner.

**Files touched**

| File | Change |
| --- | --- |
| `src/app/podcast/[id]/podcast.module.css` | Modified — `.podcastRight` padding-top 64px → 104px, with a comment recording the 80px constraint |
| `docs/change-log.md` | Modified — this entry |

**Verified**

Measured the rendered `banner-bottom → h1-top` gap in Chromium at 1920, 1440,
1280, 1024, 768 and 390px: **24px at every width**. The file contains no media
queries, so there is no breakpoint for the value to collide with. `tsc --noEmit`
clean.

**Follow-ups**

- **The episode page banner is `height: 100vh`** in
  `src/app/podcast/[id]/episode/[epId]/episode.module.css`, where the podcast
  page's is `320px`. At a 1440×900 viewport this makes the banner 900px tall and
  pushes the episode `<h1>` to y=1066 — **entirely below the fold**, so the page
  opens as a full screen of artwork with no title visible until you scroll. This
  is a real defect but the replacement height is a design decision, so it was
  flagged rather than picked. Matching the podcast page at 320px is the obvious
  candidate.
- The podcast page has **no responsive breakpoints at all** — the header grid
  stays `200px 1fr` down to 390px. Pre-existing, untouched here.
- The wider question phillipn opened — that the content column width changes
  between pages (1120 / 1040 / 960) and that the nav and footer are full-bleed
  while content is not — is still undecided and was not touched. Every page's
  `.main` already has `margin: 0 auto`; nothing is off-centre.

### 2026-08-14 — Typing caret changed from vertical bar to horizontal underscore

- **Branch:** `main`
- **Requested by:** sashak@podtracker.studio — wanted the blinking caret on the
  landing page hero to be horizontal rather than a vertical line.
- **Status:** Complete

**What changed**

`.typedCaret` in `src/app/landing.module.css` went from `width: 2px; height:
0.95em` (vertical bar) to `width: 0.5em; height: 3px` (underscore), with
`vertical-align: baseline` so it sits on the text baseline instead of straddling
it. Sized in `em` so it scales with the heading — at the hero's 46px that is a
23px-wide, 3px-tall bar. `.typedCaretBlinking` composes `.typedCaret`, so the
1.06s blink and the `prefers-reduced-motion` opt-out are unchanged.

**Also verified this session** — the iTunes work from the previous entry, run for
the first time on a machine with **open egress** (the authoring container had
`itunes.apple.com` blocked, and that entry flagged the first open-egress run as
the real test):

- `itunes.apple.com` reachable: HTTP 200.
- `/podcast/360084272` renders genuinely live data — "The Joe Rogan Experience",
  2,736 episodes, `2009–`, genres, description, and recent episodes including
  **#2539 dated August 13 2026**, i.e. the day before this run. Not the fallback.
- `/`, `/podcast/1434243584`, `/podcast/jre` (legacy slug → placeholder
  fallback), `/explore`, `/following` all HTTP 200.
- `tsc --noEmit` clean.

So the field-name risk that entry raised — that a fixture could mask a real-API
mismatch — did not materialise.

**Follow-ups**

- None for the caret. The follow-ups in the iTunes entry below still stand.

### 2026-08-14 — Podcast pages now render live iTunes + RSS data

- **Branch:** `claude/page-update-earlier-changes-6nvxia`
- **Requested by:** phillipn@podtracker.studio — wanted the site connected to a
  real podcast API (iTunes and/or Spotify) so it shows real shows, with the
  podcast page keeping its existing layout when you click through to one.
- **Status:** Complete for iTunes. **Spotify was not built** — see below.

**Why iTunes only**

The iTunes Search API needs no signup, key, or token, so it works the moment
anyone clones this repo. Spotify's Web API requires a client id and secret, and
`CLAUDE.md` already records that those credentials aren't available yet. Adding
a Spotify path now would mean shipping a code path nobody can run or test. The
iTunes layer is where a Spotify one would slot in later — `getPodcastDetail`
is the only thing the page calls.

**What changed**

- `src/lib/podcastApi.ts` — added `lookupPodcast(itunesId)` (the iTunes Lookup
  endpoint) and replaced the unused `fetchFeedEpisodes` with `fetchPodcastFeed`,
  which returns the feed's description and *all* its episodes rather than a
  slice, so the episode count and start year are real rather than guessed.
  Both now go through `fetch` with `next: { revalidate: 3600 }`.
- `src/lib/podcastDetail.ts` — **new.** Assembles what the podcast page needs
  from iTunes (identity, artwork, genres) plus the show's own RSS feed
  (description, episodes). Never throws.
- `src/app/podcast/[id]/page.tsx` — `getMockPodcast` is gone; the page awaits
  `getPodcastDetail(id)`. **The layout and markup are untouched.**

**The split that matters: show data vs community data**

Only the show's own facts come from the API. Ratings, the distribution bars,
listens, likes, friends' activity, reviews and lists are *this app's* data, and
there is no user base generating them — they stay mock, now grouped in a
`community` constant at the top of the page so the boundary is obvious. Don't
"finish the job" by inventing an API source for them; there isn't one.

**Why `fetch` instead of rss-parser's `parseURL`**

`parseURL` uses its own HTTP client, which bypasses Next's cache entirely. The
feed XML is now fetched with `fetch` and handed to `parseString`, so a busy
page makes one request an hour instead of one per visitor.

**Fallbacks — all deliberate**

`getPodcastDetail` never throws. A non-numeric id (the legacy `jre`,
`huberman`, … slugs still hardcoded in the Similar podcasts strip), a failed
lookup, or an unknown id all fall back to the built-in placeholder, so those
links keep landing on a rendered page. A podcast that resolves but whose feed
is unreachable still renders the iTunes half. Verified: with iTunes blocked
entirely, `/podcast/360084272` returns 200 with the placeholder rather than a
500.

**Verified**

`tsc --noEmit` clean, `eslint` clean, `npm run build` compiles.

Because this container's egress policy **blocks `itunes.apple.com` (403 at the
proxy)**, the API could not be exercised against Apple directly. Instead a local
fixture server served iTunes-shaped JSON and a real-shaped RSS feed, with the
new `ITUNES_API_BASE` env var pointing the client at it. Against that, the page
rendered live values end to end: title "The Joe Rogan Experience", author, years
`2009–` derived from the oldest feed item, episode count from the feed, genres
joined from the `genres` array, the feed's description, and four episodes with
formatted dates. Clicking a landing-page tile navigates to
`/podcast/360084272` and renders it.

**This means the field names are only as trustworthy as the existing code** —
the fixture mirrors what `searchPodcasts` already assumed, so a real-API
mismatch in `lookup`-only fields would not have been caught here. First run on
a machine with open egress is the real test.

**Known divergence to raise with Sasha, not fix**

The design has a wide banner behind the podcast header. No public podcast API
returns one, so the square cover art is being stretched across it, which reads
as a heavy zoomed crop. Options are a blur, a gradient, or a designed default —
that's a design call, so it's flagged rather than picked.

**Follow-ups**

- `/explore` and the episode pages are still hardcoded.
- Episode links use the item's position in the feed (`1`, `2`, …) rather than
  its guid, because guids are arbitrary strings and frequently URLs. Positions
  shift when a new episode publishes. The episode page is entirely mock, so
  nothing reads the value yet, but it needs a stable key before it does.
- `ITUNES_API_BASE` is undocumented in `.env.example`; it exists for testing.

### 2026-08-14 — Typewriter effect on the landing page hero heading

- **Branch:** `claude/page-update-earlier-changes-6nvxia`
- **Requested by:** phillipn@podtracker.studio — asked for the "Welcome to
  Podtracker!" heading to type itself out and then be left with a flashing
  typing bar at the end.
- **Status:** Complete

**What changed**

- Added `src/app/TypedText.tsx`, a client component that types a string one
  character at a time and leaves a caret at the end. Co-located in the route
  folder, following `AppearancesGrid.tsx` / `FollowingGrid.tsx`.
- `src/app/page.tsx` wraps the `<h1>` text in it. The string still lives in
  `page.tsx`; the component is generic and takes `text`, `speedMs` (default 70)
  and `startDelayMs` (default 350).
- Styles went into `landing.module.css` next to the existing `.hero h1` rules
  rather than a new stylesheet — `src/components/` has no CSS-module convention
  of its own (the two components that need one import a page's module).

**Files touched**

| File | Change |
| --- | --- |
| `src/app/TypedText.tsx` | Added — the typing client component |
| `src/app/page.tsx` | Modified — hero `<h1>` renders `<TypedText>` |
| `src/app/landing.module.css` | Modified — `.typed*` classes and the caret keyframes |
| `docs/change-log.md` | Modified — this entry |

**Why it is built this way**

The caret is **solid while typing and only blinks once the text is finished**,
which is how a real cursor behaves — a caret that blinks while characters are
still arriving reads as two competing animations.

The heading reserves its final width up front, via a `visibility: hidden` copy
of the full string sitting in the layout with the typed text absolutely
positioned over it. Without that, a centre-aligned 46px heading slides
sideways on every keystroke. `white-space: pre-wrap` keeps the trailing space
of a half-typed word from collapsing while still allowing the heading to wrap
on narrow screens.

**A bug worth knowing about if you touch this again**

The first version reserved the width of the *text only*, so when the last
character landed the caret had nowhere to go and **wrapped onto a second line**
under the heading, pushing the hero taller. It is only visible in the finished
state, so it survived a mid-animation check. The hidden copy now carries a
caret of its own, so the reservation always includes it. Verified at 1440px and
390px: heading height is identical before and after typing (69px / 138px), and
the caret's bottom edge stays within the last text line.

**Accessibility**

The animation is decorative and `aria-hidden`; a visually-hidden copy of the
full string carries the accessible name. Playwright's aria snapshot reports
`heading "Welcome to Podtracker!" [level=1]` — announced once, not per
character. `prefers-reduced-motion: reduce` skips the animation entirely
(full text immediately, `animation: none` on the caret), read via
`useSyncExternalStore` rather than `useState` + effect, because
`react-hooks/set-state-in-effect` is an **error** in this repo's ESLint config
and rejected the obvious version.

**Verified**

`tsc --noEmit` clean, `eslint` clean on both touched files, `npm run build`
compiles. Driven in headless Chromium against the production server: the
heading samples as `""` → `"W"` → `"We"` → … → `"Welcome to Podtracker!"`, the
caret picks up the blink class only at the end, and its computed opacity
samples both `0` and `1`. No console or page errors.

**Follow-ups**

- Not viewed on a real device or in a non-Chromium browser.

### 2026-08-13 — Applied Sasha's real Figma design system across the site

- **Branch:** `main`
- **Requested by:** sashak@podtracker.studio, across a long working session. He
  supplied the brand palette, font roles, and Figma frame exports for the landing,
  homepage, following, explore, and profile pages.
- **Status:** Complete for what was asked. Several designed states remain unbuilt —
  see Follow-ups.

**Read this first if you are picking up the design work.** `CLAUDE.md` records the
*current rules*. This entry records *what changed and why*, including decisions
that look like mistakes if you only read the code.

**Typography — the rule changed twice, so don't trust older code as precedent**

1. Roboto was never actually installed. PT Serif Caption was the global body font,
   so every paragraph rendered serif. Added Roboto via `next/font/google` and split
   the roles into `--font-display` / `--font-body` / `--font-rating`.
2. First rule was "small text → Roboto". **Sasha corrected this**: PT Serif Caption
   is the default for everything, and Roboto is for **reviews**. Don't generalise
   Roboto to small text.
3. One explicit exception he asked for: `/explore` trending-user names and follower
   counts are Roboto, while the other ~86 text elements on that page are serif.

Auth pages and `/following` are entirely PT Serif Caption via `font-family` on
their `.main`. **Caveat:** that page-wide serif would override the reviews rule if
a review card is ever added to either page.

**Colour**

- Page background went from `#EBEDF0` to **`#9E9E9E` at 25%** (`rgba(158,158,158,0.25)`).
  Applied to `html` **only** — putting a translucent colour on both `html` and
  `body` composites it twice and comes out darker. `--page-bg-alt: #e7e7e7` is the
  flattened opaque equivalent, for surfaces sitting on another colour (the nav
  search pill).
- Auth submit buttons and the profile Edit button are `#7BBAFF`.
- Profile rating-distribution bars are `#C3DBFF` — all five tiers share one colour;
  the tier is conveyed by the coloured label beside the bar, not the bar itself.

**Nav**

- Height is now an explicit **100px**, matching the Figma. It was previously
  content-driven and landed at 64px — a byproduct of the 24px wordmark plus 14px
  padding, never a decision.
- **Genres was cut from MVP** and removed from both branches of `SiteNav`. The
  `/genres` route still exists but is intentionally unlinked.

**Pages**

| Page | Change |
| --- | --- |
| Landing | Hero buttons to PT Serif Caption; removed the border-radius on the "What is Podtracker?" box (square in the frame, unlike the four rounded feature boxes) |
| Login / Signup | Nav removed entirely, matching the landing page; buttons `#7BBAFF`; every word PT Serif Caption; "Podcast Website" → "Podtracker"; fixed "Email adress" typo |
| Home | Review cards no longer print the podcast/episode name — that moved to a hover popup on the artwork. Added the new-user empty state, branched on `PodcastFollow` count |
| Following | All text PT Serif Caption; Favorites in the profile sub-nav now points here |
| Explore | Trending-user names/followers to Roboto |
| Profile | Edit profile + external link moved from the left column to under the avatar |

**Deletions and why they are not mistakes**

- `src/app/user/[username]/favorites/` was **deleted on purpose** — Sasha decided
  Favorites and Following are one feature. `AddFavoriteButton.tsx` and
  `FavoriteCard.tsx` were **moved to `src/components/`, not deleted**: they hold the
  working search-and-add and remove logic and are needed when `/following` gets
  wired to the `favorite` table. `src/app/api/favorites/route.ts` kept for the same
  reason. **Consequence: there is currently no way to add or remove a favorite
  anywhere in the UI.**
- Review cards omitting the podcast/episode name is deliberate. Don't add it back.

**Default avatar**

`public/default-avatar.webp` replaced three separate `picsum.photos` random-photo
fallbacks (profile page, settings, profile sub-header).

**Logo**

Sasha supplied `public/logo.png` (also `src/app/icon.png` as the favicon). Measured:
561×561, but the artwork occupies only 375×325 — **38.7% of the canvas is empty
padding**, so it renders ~40% smaller than its box. Edge transitions average 3.5px
against 1–2px for a clean vector export, meaning it was upscaled or lossily
recompressed somewhere. It is **not** currently in the nav, though recent Figma
frames show it there on a black tile. Sasha is sourcing a better original.

**Follow-ups**

- **Designed but never built:** landing v1 (post-launch — Popular reviews, Popular
  Lists, footer), and the `/following` empty state ("No Favorites… / Add Favorites").
  The latter cannot render at all while `FollowingGrid` is a hardcoded constant.
- **Diverges from Figma, undecided:** "See more" buttons are blue pills in the
  frames but transparent with a grey border in code; the 24px wordmark looks small
  in the now-100px nav; the nav logo tile is absent.
- Most pages still render from hardcoded constants. Sasha has said the placeholder
  podcasts and images don't matter — they go when the API work happens. Explore is
  intended to use **Spotify charts** until there is a real user base.

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
