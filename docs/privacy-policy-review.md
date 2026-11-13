# Privacy Policy and Terms: notes for review

**Status: PUBLISHED 2026-11-13.** Both documents are live at
`podtracker.studio/terms` and `/privacy`, linked from the footer, the sitemap
and the signup checkbox.

They were held back on the `legal-pages` branch from 2026-11-04 so they would
not go public unreviewed. That review happened — Sasha's brother read both and
produced a memo with Harvey — and everything actionable from it was fixed on
2026-11-12 before the merge. Sasha then asked for them to go up as they stand.

**What that means for this file:** it is no longer a gate, it is the record of
how these documents got to where they are, and of what is still outstanding.
The "still open" items below are now live-site items, not pre-launch ones.

**Known and accepted at publication:**

- **No LLC.** Sasha is personally liable; he has deferred this to ~1,000 users.
- **No DMCA agent registered**, so there is no §512(c) safe harbour yet. He has
  no postal address to register with and has deferred getting one. The
  protection is not retroactive, so it will only ever cover infringement
  occurring after he files.
- **The postal address in Privacy §14 is city-level only.**
- **Terms §§8, 13, 15 and 16 were drafted by Claude** and still have not been
  read closely by a person. The memo says so explicitly. They are live anyway.

This file exists for the person reviewing them — Sasha's brother, a law
student. It is in four parts:

1. **What the site actually does**, so the documents can be checked against
   reality without reading any code.
2. **Seven places the generated privacy policy was factually wrong** about
   Podtracker and was corrected. Each is listed so it can be reverted.
2b. **Four clauses added to the Terms by Claude** on 2026-11-08. The least
   validated text in either document — read these first.
3. **Open questions** that need a legal answer rather than a factual one.

Where each document came from, because it changes how much to trust the
wording:

- **Privacy Policy** — generated with [Termly](https://termly.io) on
  2026-11-07 from answers Sasha gave question by question, then checked line by
  line against the codebase. Termly's templates are attorney-drafted, so the
  *language* has had a lawyer on it; whether it *fits Podtracker* is what
  part 2 is about.
- **Terms of Service** — written from scratch by Phillip against the codebase,
  plus four clauses added by Claude on 2026-11-08 (part 2b). Those four had no
  lawyer anywhere near them, not even a template's.

**Neither document has been read by a lawyer.**

---

## 1. What the site actually does

Verified against the code on 2026-11-07, not from memory.

### What is collected and where it lives

Everything about a user sits in one Postgres table (`User` in
`prisma/schema.prisma`) plus the rows that reference it:

| Field | Notes |
|---|---|
| `email` | Also held by Supabase Auth, which owns authentication |
| `username`, `displayName` | Both public |
| `avatarUrl` | A **base64 data URI in the database**, not a file on a storage service. Capped at 300 KB (`AVATAR_MAX_CHARS`) |
| `bio`, `longBio`, `externalLink` | All public, all optional |
| `createdAt` | — |

Passwords are **never stored by Podtracker**. The signup form posts to
`/api/auth/signup`, which hands the password to Supabase Auth. There is no
password column. (The old bcrypt + `Session` table was removed on 2026-09-07.)

User-generated rows: `PodcastRating`, `EpisodeRating`, `LogEntry` (the listening
diary), `List`, `PodcastFollow`, `Favorite`, `Comment`, `Like`, `Follow`.

### Who else receives data

Four companies, and only these four:

| Company | What for | What it sees |
|---|---|---|
| **Vercel** | Hosting, serverless functions, **and** Vercel Analytics | All request traffic; analytics sees URLs, country, device/browser and sets no cookies. Functions run in `cle1` (Cleveland) |
| **Supabase** | Postgres database + authentication | Everything in the table above. Database is in `us-east-2` (Ohio) |
| **Resend** | Sending auth email (confirmation, password reset) | Email addresses. Configured as Supabase's SMTP provider |
| **Stripe** | Donations on `/donate` | Card details, entered on Stripe's own pages |

§4 of the policy lists *seven* categories of third party, which is Termly's
phrasing: hosting, cloud computing, data storage, authentication, analytics,
payments and email. Those seven categories are these four companies — Vercel
covers the first two plus analytics, Supabase covers storage and
authentication.

**As of 2026-11-08 the policy says so itself.** §4 keeps Termly's category
list and then names the four companies in a table, with what each does and a
link to its privacy notice. This was added because the summary says "four
companies" while §4 listed seven categories, which reads as a contradiction
even though it isn't — and because §11 already promises Minnesota and Oregon
residents a list of *specific* third parties on request, so there was nothing
to gain by making them ask. The table is the thing in this document most
likely to go stale; it needs updating whenever the stack changes.

Nothing is sold or shared. There is no ad network, no retargeting, no data
broker, no CRM, no marketing email tool. The only email that leaves the site is
transactional (confirm your address, reset your password).

**Stripe never touches this server.** `/api/donate` creates a Stripe Checkout
session and redirects; the donor types their card on `stripe.com`. The route
deliberately records nothing in the database — Stripe's dashboard is the only
record of who donated.

**One judgement call worth a second opinion.** There is a Discord bot
(`/api/discord`) that answers slash commands with site analytics. It is
restricted to an allow-list of Discord user IDs (Sasha and whoever he adds), and
it reports **aggregate numbers only** — `src/lib/discord/replies.ts` contains no
reference to usernames, emails, or the database. On that basis Discord was left
out of the processor list in §4. If the bot is ever extended to report anything
per-user, Discord becomes a processor and §4 must be updated.

### Cookies

Exactly one cookie: the Supabase Auth session cookie, set in `src/proxy.ts` and
`src/lib/supabase/server.ts`. It is what keeps you logged in. Vercel Analytics
is cookieless.

There is no cookie banner. Given one strictly-necessary cookie and no
advertising or profiling, Sasha's position is that no consent banner is
required. **Worth confirming** — this is the kind of thing that turns on the
UK/EU rules rather than on what the code does.

### What is public

`/user/[username]` has no auth gate, and `robots.ts` allows `/`. So a signed-out
visitor, and a search engine, can see any profile and everything on it.
`/settings`, `/log`, `/api/`, `/auth/` and the password-reset pages are
disallowed in `robots.txt` and are behind auth checks.

### Account deletion — built 2026-11-07

This was the one real gap when the documents were drafted: `/api/account` had
`PATCH` and no `DELETE`, so three documents promised deletion the site could not
do. **`DELETE /api/account` now exists**, reachable from Settings →
Authentication → Delete account.

How it works, because the reviewer will reasonably want to know what "delete"
actually means here:

- You must enter **your password** and **type your username** before the button
  activates. The server re-checks both; the client-side check only avoids a
  request that is certain to fail.
- It deletes the `User` row. Every relation to it in `schema.prisma` is
  `onDelete: Cascade`, so Postgres removes the ratings, episode ratings, log
  entries (the diary), lists and their items, follows in both directions,
  podcast follows, favourites, comments and likes in the same statement. This
  was tested against a real Postgres: 16 assertions, including that another
  user's comment on a deleted user's review goes too, and that the shared
  podcast catalogue is untouched.
- It then deletes the **Supabase Auth user**, so the login is gone and the email
  address can be used to sign up again.
- The order is deliberate: our database first, Supabase second. If it were the
  other way round and the second step failed, the person could no longer log in
  while all their reviews stayed public — the privacy promise broken with no way
  for them to retry.

**Two honest limits**, both now stated in Privacy §9:

1. We may retain some information to prevent fraud, meet legal obligations and
   so on — standard, and it is what the policy says.
2. **Backups.** Deleting removes the rows from the live database. Supabase's
   automatic backups are overwritten on their own schedule, so a copy can
   survive there briefly. Privacy §7 already covers this in general terms
   ("stored in backup archives… isolate it from any further processing until
   deletion is possible") and §9 now says it plainly.

**One operational precondition.** Deleting a Supabase login needs the
**service-role key**, which the anon key cannot do by design. The route reads
`SUPABASE_SERVICE_ROLE_KEY`; if it is not set it **deletes nothing at all** and
tells the person to email instead, rather than removing their data and
stranding their login. That is the safe failure, but it means Terms §10 and
Privacy §9 overstate the site until the key is in Vercel. **Setting it is a
precondition for merging this branch.**

---

## 2. Seven corrections to the generated policy

Termly asks what you *might* do, so it emitted several clauses describing a
larger, ad-funded site. Each of these was changed **because it was false about
Podtracker**, not because it read badly. Every one is marked with a comment at
the line in `src/app/privacy/page.tsx`, so any can be put back.

| # | Section | Generated text said | Changed to | Why |
|---|---|---|---|---|
| 1 | §1 Payment Data | We collect "your payment instrument number, and the security code" | Payment is handled entirely by Stripe; card details never reach our servers | `/api/donate` uses Stripe Checkout. Terms §9 already said this |
| 2 | §1 Location Data | We use "GPS and other technologies"; you can disable your device Location setting | Coarse country, derived from IP by the analytics provider; no GPS, no permission to turn off | Nothing in `src/` calls a geolocation API |
| 3 | §5 Cookies | Third parties use trackers "for analytics and advertising… to tailor advertisements to your interests" | Explicit statement that there is no advertising, plus the actual two-item inventory | No ad network. Sasha declined AdSense |
| 4 | §5 Cookies | "set out in our Cookie Notice" | The inventory itself, inline | There is no Cookie Notice page. Linking to nothing is worse than saying it plainly |
| 5 | §4 Sharing | A "Business Partners… products, services, or promotions" bullet | Removed | There are no business partners |
| 6 | §11 Table | Category F (Internet activity) **NO**, Category G (Geolocation) **NO** | Both **YES** | Directly contradicted §1, which says log/usage and location data are collected. YES matches both §1 and the derivative-data answer Sasha gave the generator. Both categories were also added to the twelve-month disclosure list and the retention list, for consistency |
| 7 | §9 Account Information | Implied you could terminate your account from settings | ~~Says to email~~ — **reversed on 2026-11-07**: deletion was built the same day, so §9 describes the real Settings flow and Terms §10 was restored to match | Listed because the correction and its reversal are both history worth seeing. Depends on the service-role key above |

Corrections 1–5 narrow what the policy claims. Correction 6 **widens** it — it
admits to collecting two more categories than the generated version did. That
direction is deliberate: a privacy policy that under-declares is the one that
causes trouble.

---

## 2b. Four clauses added to the Terms, drafted by Claude

Sasha nearly regenerated the whole Terms with Termly to pick these up, and
decided to keep Phillip's text and add to it instead. The trade-off is worth
being explicit about: **Termly's clauses come off an attorney-drafted template,
and these do not.** They are plain-English renderings of standard clauses
written by an AI. They are the least validated text in either document and
should be the first thing read.

| § | Clause | What it does | Watch for |
|---|---|---|---|
| 8 | **DMCA** (expanded) | Was one "email us" paragraph. Now lists the six things a §512(c)(3) notice must contain, gives a counter-notice route with the 10–14 business day restore window, and states a repeat-infringer policy | **The safe harbour does not exist until a designated agent is registered with the US Copyright Office.** See below |
| 13 | **Indemnification** (new) | User covers our reasonable costs for claims arising from what they posted or did | Scoped to claims actually caused by the user, with notice and a right to take over the defence, so it is not one-sided. Check the scope is tight enough |
| 15 | **Governing law and disputes** (expanded) | Absorbed the old §14 and added a 30-day talk-to-us-first step before anything formal. Preserves small claims court | **No arbitration clause and no class-action waiver** — deliberately. See below |
| 16 | **The rest** (new) | Severability, entire agreement, no-waiver, assignment, survival of §§11–13 | Standard. Check the survival list is right |

Old §13 (changes) became §14 and old §14 (governing law) became §15. Nothing
outside the file referenced those numbers.

**Two decisions that were deliberately not made here:**

1. **The DMCA agent is a registration, not a paragraph.** Writing a DMCA
   section does not create safe-harbour protection under 17 U.S.C. §512(c).
   That requires a designated agent registered with the US Copyright Office at
   `dmca.copyright.gov` — about $6, renewable every three years. Until that is
   done, §8 describes a process Podtracker is running voluntarily rather than a
   statutory protection it can rely on. For a site whose entire content is
   user-posted, this is the single cheapest piece of legal protection available
   and it is currently not in place.

2. **No arbitration or class-action waiver.** Most US consumer terms have one.
   It was left out on purpose rather than slipped in: it is a genuine
   trade-off — it caps class-action exposure, but mass-arbitration filing fees
   can be far worse than the thing they prevent, and for a one-person site with
   a US$50 liability cap it may buy nothing. This is a lawyer's call. Raise it
   with Sasha either way; do not treat its absence as an oversight.

## 3. Open questions for the review

These were left exactly as generated. They need a legal answer, not a factual
one, so nothing was guessed.

1. **§3 legal bases are incomplete for GDPR.** The policy lists Consent, Legal
   Obligations and Vital Interests. It does **not** list performance of a
   contract, which is normally the basis for operating an account someone signed
   up for, or legitimate interests. Sasha's generator answers produced this;
   whether it is a problem is the reviewer's call.

2. **§2's purpose list is very thin** — account creation/authentication, and
   protecting someone's vital interests. That is all. It does not say "to show
   your reviews to other people on the site", which is the main thing the site
   does with what you write. §13 covers the publicity, but not as a stated
   processing purpose.

3. **No minors section at all.** Termly usually emits one and this policy has
   none. The three documents also disagree on the age:

   - Terms §2: at least **13**, or **16** in the UK/EEA
   - Signup checkbox: "I'm at least **16** years old"
   - Privacy policy: silent

   The checkbox being stricter than the Terms is safe but untidy. Pick one age
   and make all three agree. Note that 13 brings COPPA into scope in the US and
   16 avoids the UK/EU age-of-consent question entirely — this is worth deciding
   deliberately rather than by accident.

4. **Rights requests go to a Termly-hosted form.** §9, §11 and §16 all link to
   `app.termly.io/dsar/379aa4d1-…`. Two consequences: Termly is itself a
   processor of those requests and is **not** in §4's list of third parties; and
   if the Termly subscription lapses, the policy's stated route for exercising
   your rights stops working. Every one of those sections also offers the email
   address as an alternative, so nothing is unreachable — but the dependency is
   real.

5. **The postal address in §15 is `Ann Arbor, MI 48105`** — city, state and ZIP,
   no street. It is a real, permanent, public address disclosure. Worth
   confirming Sasha is happy with that, since there is no company to put in
   front of it.

6. **No DPA has been signed with anyone.** Vercel's applies automatically on the
   Pro plan with nothing to accept. Supabase, Resend and Stripe each publish one.
   Whether any needs actively signing for a one-person US-based site with EU
   visitors is a question for the reviewer.

7. **Standard Contractual Clauses.** §6 says SCCs are in place and "can be
   provided upon request". That is true in the sense that the processors'
   standard terms incorporate them; Sasha has not separately executed anything
   and could not produce a signed document if an EU user asked. Worth checking
   whether the wording overstates it.

---

## What happens next

1. Review both pages. They render at `/privacy` and `/terms` when the branch is
   checked out and `npm run dev` is running.
2. ~~Build account deletion~~ — **done 2026-11-07**, see above.
3. **Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel** (Supabase → Project Settings →
   API → `service_role`). Without it the delete button refuses and two
   documents overstate the site. This blocks the merge.
4. Decide the age question and make Terms, the checkbox and the policy agree.
5. Only then merge `legal-pages` into `main`, which publishes both.

Phillip wrote the original Terms and has **not** been told that the page was
reverted on 2026-11-04, restored on this branch, or edited since. Someone should
tell him before this merges.
