# Privacy Policy and Terms: notes for review

**Status: both documents are on the `legal-pages` branch and are NOT public.**
`main` deploys automatically, so neither page can be merged until the review is
done. The Terms page was deliberately pulled from `main` on 2026-11-04 for this
reason.

This file exists for the person reviewing them — Sasha's brother, a law
student. It is in three parts:

1. **What the site actually does**, so the documents can be checked against
   reality without reading any code.
2. **Seven places the generated privacy policy was factually wrong** about
   Podtracker and was corrected. Each is listed so it can be reverted.
3. **Open questions** that need a legal answer rather than a factual one.

The privacy policy was generated with [Termly](https://termly.io) on
2026-11-07, from answers Sasha gave question by question. The Terms were drafted
from scratch against the codebase. **Neither has been read by a lawyer.**

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
authentication. Nobody is hidden behind the longer list.

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

### Account deletion — the one real gap

**`/api/account` has `PATCH` and no `DELETE`.** There is no way for a user to
delete their own account, and no endpoint for an admin to do it either; it would
be done by hand in the Supabase dashboard.

Both documents are worded around this honestly — they say to email and ask,
rather than promising a button that does not exist. Three places say it:
Terms §10, Privacy §9 (Account Information), and Privacy §13.

This is the highest-priority thing to actually build. Until it exists, the
promise is only as good as Sasha reading his email.

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
| 7 | §9 Account Information | Implied you could terminate your account from settings | Says to email, because there is no self-serve delete | See the gap above. Same correction already made to Terms §10 |

Corrections 1–5 narrow what the policy claims. Correction 6 **widens** it — it
admits to collecting two more categories than the generated version did. That
direction is deliberate: a privacy policy that under-declares is the one that
causes trouble.

---

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
2. Build account deletion — a `DELETE` on `/api/account` — because three
   documents now promise it.
3. Decide the age question and make Terms, the checkbox and the policy agree.
4. Only then merge `legal-pages` into `main`, which publishes both.

Phillip wrote the original Terms and has **not** been told that the page was
reverted on 2026-11-04, restored on this branch, or edited since. Someone should
tell him before this merges.
