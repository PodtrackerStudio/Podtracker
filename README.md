# Podtracker

## Change log

Short record of every change, newest first. The full reasoning for each one is in
[`docs/change-log.md`](docs/change-log.md).

- **2026-11-06 — Alignment and polish pass across the site.** Every public
  page was screenshotted in Chrome at desktop (1440px) and phone (390px)
  width and checked for overflow, broken images and console errors. Fixed:
  - **Footer on phones (every page):** links no longer break over two lines or
    run into the icons.
  - **Phone layout of the landing/About, show, episode, profile and review
    pages:** headings, meta rows and descriptions line up, and nothing runs to
    the screen edge.
  - **List pages:** a cover with small artwork now fills its tile.
  - **Hydration errors:** profile and list pages no longer rebuild themselves
    in the browser (React #418) for visitors outside UTC.
  - **Wording:** "Here's what *you've* been listening to" and "*Your* Ratings"
    on other people's profiles, "1 episodes", and "8 podcasts" on a list of
    episodes.

  Design itself is unchanged.
- **2026-11-06 — Fix: full episode lists showed "No episodes found".**
  Introduced by the paging change an hour earlier, and live until this fix.
  The server page read the page size from a client component, which hands the
  server a reference instead of the number. It now lives in
  `src/lib/episodePaging.ts`. Load more and Newest/Oldest were checked by
  clicking them in Chrome.
- **2026-11-06 — Sasha added to the Discord bot.** `DISCORD_ALLOWED_USER_IDS`
  in Vercel is now Phillip (`712458108953427968`) and Sasha
  (`779831401369042948`), and production was redeployed. A setting, not code;
  to add someone else, append their id with a comma and redeploy.
- **2026-11-06 — Full episode lists load a page at a time.** The page used to
  send every episode at once: 928 KB for Joe Rogan's 2,777. It now sends the
  first 20 (32 KB), and "Load more" and Newest/Oldest fetch the rest from
  `/api/podcast/[id]/episodes`.
- **2026-11-06 — Security hardening.**
  - **Write requests to `/api/*` from other websites are refused (403).** This
    blocks cross-site request forgery, including a trick that could sign a
    visitor into an attacker's account.
  - **New security headers on every page:** no framing (clickjacking),
    `nosniff`, a referrer policy, and camera/mic/location switched off.
- **2026-11-06 — Speed: server region and page loading.**
  - **The site's code now runs in Cleveland (`cle1`), next to the database in
    Ohio**, instead of Washington. Every database and login call used to cross
    between the two.
  - **Podcast and episode pages run their database queries alongside the
    Apple/feed lookup** instead of after it.
  - **Each page and its title/metadata share one data load** instead of doing
    the work twice.
- **2026-11-06 — Speed: profile pictures and login checks.** Profile
  pictures (stored as text, up to 3.9 MB) were embedded inside every page that
  showed them, twice. They're now served as cached images from
  `/api/avatar/<id>`, and pages no longer load them from the database.
  - **Snezhana's profile: 7.8 MB → 45 KB.** Each review on `/home` was
    carrying its author's whole picture, and so was every keystroke in the nav
    search.
  - **Login checks are now verified locally** instead of with two round trips
    to Supabase on every page and API call.
- **2026-11-06 — Podcast data fixes.**
  - **Feeds are parsed once even when two requests ask at the same moment**,
    and the in-memory feed cache is capped at 40 feeds. It used to grow
    forever.
  - **Episodes are ordered newest-first by date**, so shows that publish
    oldest-first no longer show their oldest episodes as "recent", and their
    Previous/Next links aren't swapped.
  - **The home feed no longer hides a show's new episodes for 30 minutes**
    after one failed feed load.
  - **Fixed display bugs:** durations like "1h 60m", and descriptions with no
    spaces (Chinese, Japanese, long links) not being shortened.
  - **Fixed crashes:** a repeated `?t=` crashed the episode page.
  - **Fixed links:** usernames with spaces or symbols broke links from search
    results.
- **2026-11-06 — API routes made robust against failures and races.**
  - **Episodes that two shows share can be rated, logged and listed.** Before,
    every action on them failed. A double-click on a new episode no longer 502s.
  - **Creating a list is one all-or-nothing write**, capped at 100 titles.
  - **Next listening can't split across two lists.**
  - **Double-clicking remove no longer errors.**
  - **Reviews are validated** (text only, at most 10,000 characters).
  - **Follow and favourite failures return a readable error** instead of a bare 500.
  - **Legacy show slugs can't write a fake "Modern Wisdom" row.**
- **2026-11-06 — Account and login fixes.**
  - **Email changes in Settings now go through Supabase**, with a confirmation
    link. Before, a changed email silently broke "change password" and let
    anyone claim someone else's address.
  - **Profile pictures are shrunk to 400px before upload and capped on the
    server.** Some were 3.9 MB.
  - **Settings input is validated**, so a bad request gets a clear error
    instead of a 500.
  - **Signup no longer creates an unreachable profile** for an email that
    already has an account.
  - **Password-reset email failures are now logged.**
  - **`/auth/confirm` accepts `type=email` links.**
- **2026-11-06 — Security: Next.js 16.2.11 → 16.4.3, Prisma 7.9 → 7.10.1.**
  `npm audit` reported 13 vulnerable packages (1 critical, 11 high). Among them
  were unauthenticated remote-code-execution flaws in Next.js, including one in
  `next/og`, which the Discord bot uses. Now 0. Build, type check, lint and a
  smoke test of every main page, the auth links and the bot all pass.
- **2026-11-06 — Discord bot is now one command, `/analytics`, drawn like
  Vercel's dashboard.** It replies with an image: visitors and page views with
  change against the previous period, a visitors chart, and Pages, Referrers,
  Countries, Devices, Browsers and OS panels, plus an "Open in Vercel" button.
  Rendered with `next/og` in the Geist font (bundled, open font license).
  `/traffic`, `/toppages`, `/referrers` and `/stats` are retired.
- **2026-11-06 — Discord bot: today's visits were missing from `/traffic`.**
  Vercel rounds a query's end time down to midnight, so totals left out the
  current day and showed 0. Queries now run one unit past "now", and top pages
  and referrers are sorted by views. Checked against the live Analytics API.
- **2026-11-06 — Discord analytics bot.** Slash commands `/traffic`,
  `/toppages`, `/referrers` (Vercel Web Analytics) and `/stats` (accounts and
  activity from the database), answered by `src/app/api/discord/route.ts`, so
  there is no separate bot to host. Only allow-listed Discord users can use it.
  New `npm run discord:register`. **Still needed:** create the Discord app, set
  the environment variables, and register the commands. Setup steps are in
  [`docs/discord-bot.md`](docs/discord-bot.md).
- **2026-11-06 — Vercel Web Analytics added.** Installed `@vercel/analytics` and
  rendered it site-wide from `src/components/SiteAnalytics.tsx`, mounted in
  `src/app/layout.tsx`. URLs under `/auth/*` are recorded without their query
  string, so one-time login tokens from emailed links never reach the analytics
  dashboard. **Still needed:** enable Analytics on the project in the Vercel
  dashboard; nothing is collected until that is done.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
