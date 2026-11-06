import { renderAnalyticsCard } from "./analyticsCard";
import { AnalyticsError, parsePeriod, report } from "./vercelAnalytics";

/**
 * What `/analytics` answers with: one image of the dashboard and one link
 * button, with no text, so the message reads like a screenshot of Vercel.
 */

export type Reply = {
  payload: Record<string, unknown>;
  file?: { name: string; data: Buffer };
};

const DASHBOARD_URL = "https://vercel.com/podtracker/podtracker/analytics";

function textReply(content: string): Reply {
  return { payload: { content, attachments: [] } };
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
        content: "",
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
