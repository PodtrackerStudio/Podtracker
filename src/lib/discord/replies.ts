import { renderAnalyticsCard } from "./analyticsCard";
import { AnalyticsError, PERIOD_LABEL, parsePeriod, report } from "./vercelAnalytics";

/**
 * What `/analytics` answers with: one summary line, one image of the
 * dashboard, and one "Open in Vercel" link button.
 */

export type Reply = {
  payload: Record<string, unknown>;
  file?: { name: string; data: Buffer };
};

const DASHBOARD_URL = "https://vercel.com/podtracker/podtracker/analytics";

function textReply(content: string): Reply {
  return { payload: { content, attachments: [] } };
}

const fmt = (n: number) => n.toLocaleString("en-US");

function changeText(change: number | null): string {
  if (change === null) return "";
  const pct = Math.round(change * 100);
  return pct === 0 ? " (±0%)" : ` (${pct > 0 ? "+" : "−"}${Math.abs(pct)}%)`;
}

/**
 * One line above the image with the two numbers people look for first. The
 * image is a whole dashboard, which a phone shows small until it's tapped;
 * this is readable straight away, and it's what shows in notifications.
 */
function summaryLine(data: Awaited<ReturnType<typeof report>>): string {
  return [
    `**${PERIOD_LABEL[data.period]}**`,
    `${fmt(data.visitors)} visitors${changeText(data.visitorsChange)}`,
    `${fmt(data.pageviews)} page views${changeText(data.pageviewsChange)}`,
  ].join(" · ");
}

export async function replyFor(command: string, options: Record<string, unknown>): Promise<Reply> {
  if (command !== "analytics") {
    return textReply(`\`/${command}\` has been retired. Use \`/analytics\`.`);
  }

  try {
    const data = await report(parsePeriod(options.period));
    const png = await renderAnalyticsCard(data, "podtracker.studio");
    return {
      file: { name: "analytics.png", data: png },
      payload: {
        content: summaryLine(data),
        attachments: [{ id: 0, filename: "analytics.png" }],
        components: [
          {
            type: 1,
            components: [{ type: 2, style: 5, label: "Open in Vercel", url: DASHBOARD_URL }],
          },
        ],
      },
    };
  } catch (error) {
    if (error instanceof AnalyticsError) return textReply(`⚠️ ${error.message}`);
    console.error("[discord] /analytics failed:", error);
    return textReply("⚠️ Something went wrong drawing the analytics. The details are in the Vercel logs.");
  }
}
