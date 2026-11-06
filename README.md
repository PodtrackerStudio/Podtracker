# Podtracker

## Change log

Short record of every change, newest first. The full reasoning for each one is in
[`docs/change-log.md`](docs/change-log.md).

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
