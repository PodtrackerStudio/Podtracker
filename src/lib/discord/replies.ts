import {
  AnalyticsError,
  PERIOD_LABEL,
  overTime,
  parsePeriod,
  top,
  totals,
  type DimensionRow,
  type TimeRow,
} from "./vercelAnalytics";
import { getSiteStats } from "./siteStats";

/**
 * Builds the message each slash command answers with.
 *
 * Embeds rather than plain text: they keep the numbers aligned and readable
 * on a phone, which is where most "how's the site doing?" checks happen.
 * #7BBAFF is the site's primary button blue (`--btn-primary-blue`).
 */

const COLOR = 0x7bbaff;

type Embed = {
  title: string;
  description?: string;
  color: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
};

export type Reply = { content?: string; embeds?: Embed[] };

const fmt = (n: number) => n.toLocaleString("en-US");

/** A text bar chart, since Discord cannot draw one. Block characters stay
 *  aligned in the code block they are shown in. */
function bars(rows: TimeRow[], period: "24h" | "7d" | "30d"): string {
  if (rows.length === 0) return "_No visits recorded in this period._";
  const max = Math.max(...rows.map((r) => r.pageviews), 1);
  const lines = rows.map((r) => {
    const d = new Date(r.timestamp);
    const label =
      period === "24h"
        ? `${String(d.getUTCHours()).padStart(2, "0")}:00`
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    const width = Math.round((r.pageviews / max) * 16);
    return `${label.padEnd(6)} ${"█".repeat(width).padEnd(16)} ${fmt(r.pageviews)}`;
  });
  // An embed description holds 4096 characters. 30 rows sit far below that,
  // but keep only the most recent rows if Vercel ever returns more.
  return "```\n" + lines.slice(-31).join("\n") + "\n```";
}

function ranking(rows: DimensionRow[]): string {
  if (rows.length === 0) return "_No visits recorded in this period._";
  return rows
    .map((r, i) => `**${i + 1}.** \`${r.key.slice(0, 80)}\` — ${fmt(r.pageviews)} views · ${fmt(r.visitors)} visitors`)
    .join("\n")
    .slice(0, 4000);
}

async function traffic(periodOption: unknown): Promise<Reply> {
  const period = parsePeriod(periodOption);
  const [sum, series] = await Promise.all([totals(period), overTime(period)]);
  // Page views from the series, which matches the chart exactly. Visitors from
  // the count endpoint, since summing per-bucket visitors would count one
  // person once per hour or day they came back.
  const pageviews = series.reduce((total, row) => total + row.pageviews, 0);
  return {
    embeds: [
      {
        title: `Traffic — ${PERIOD_LABEL[period]}`,
        color: COLOR,
        fields: [
          { name: "Visitors", value: fmt(sum.visitors), inline: true },
          { name: "Page views", value: fmt(pageviews), inline: true },
          {
            name: "Views per visitor",
            value: sum.visitors ? (pageviews / sum.visitors).toFixed(1) : "—",
            inline: true,
          },
        ],
        description: bars(series, period),
        footer: {
          text:
            period === "24h"
              ? "Vercel Web Analytics · production only · times in UTC · visitors counted over yesterday and today (UTC)"
              : "Vercel Web Analytics · production only · times in UTC",
        },
      },
    ],
  };
}

async function topPages(periodOption: unknown): Promise<Reply> {
  const period = parsePeriod(periodOption);
  return {
    embeds: [
      {
        title: `Top pages — ${PERIOD_LABEL[period]}`,
        color: COLOR,
        description: ranking(await top("requestPath", period)),
        footer: { text: "Vercel Web Analytics · production only" },
      },
    ],
  };
}

async function referrers(periodOption: unknown): Promise<Reply> {
  const period = parsePeriod(periodOption);
  return {
    embeds: [
      {
        title: `Where visitors came from — ${PERIOD_LABEL[period]}`,
        color: COLOR,
        description: ranking(await top("referrerHostname", period)),
        footer: { text: "Vercel Web Analytics · production only" },
      },
    ],
  };
}

async function stats(): Promise<Reply> {
  const s = await getSiteStats();
  const pct = s.accounts ? Math.round((s.activeAccounts / s.accounts) * 100) : 0;
  return {
    embeds: [
      {
        title: "Podtracker — accounts and activity",
        color: COLOR,
        fields: [
          { name: "Accounts", value: `${fmt(s.accounts)} (+${fmt(s.accountsThisWeek)} this week)`, inline: true },
          { name: "Have used the site", value: `${fmt(s.activeAccounts)} (${pct}%)`, inline: true },
          { name: "Have written a review", value: fmt(s.reviewers), inline: true },
          { name: "Logs", value: `${fmt(s.logs)} (+${fmt(s.logsThisWeek)} this week)`, inline: true },
          { name: "Reviews", value: fmt(s.reviews), inline: true },
          { name: "Ratings", value: fmt(s.ratings), inline: true },
          { name: "Show follows", value: fmt(s.follows), inline: true },
          { name: "Lists", value: fmt(s.lists), inline: true },
          { name: "Likes · Comments", value: `${fmt(s.likes)} · ${fmt(s.comments)}`, inline: true },
        ],
        footer: { text: "Podtracker database · accounts = profiles, as in npm run stats" },
      },
    ],
  };
}

export async function replyFor(command: string, options: Record<string, unknown>): Promise<Reply> {
  try {
    switch (command) {
      case "traffic":
        return await traffic(options.period);
      case "toppages":
        return await topPages(options.period);
      case "referrers":
        return await referrers(options.period);
      case "stats":
        return await stats();
      default:
        return { content: `I don't know the command \`/${command}\`.` };
    }
  } catch (error) {
    if (error instanceof AnalyticsError) return { content: `⚠️ ${error.message}` };
    console.error(`[discord] /${command} failed:`, error);
    return { content: `⚠️ Something went wrong answering \`/${command}\`. The details are in the Vercel logs.` };
  }
}
