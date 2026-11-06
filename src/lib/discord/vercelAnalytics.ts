/**
 * Reads Vercel Web Analytics through its public query API.
 *
 * Docs: https://vercel.com/docs/analytics/web-analytics-api
 *
 *   - `visits/count`     → one total of page views and unique visitors
 *   - `visits/aggregate` → rows grouped by a time unit or a dimension
 *
 * Both count **production traffic only**, which is what Sasha wants to see.
 * Previews and localhost never appear.
 *
 * Needs `VERCEL_ACCESS_TOKEN` and `VERCEL_PROJECT_ID`, plus `VERCEL_TEAM_ID`
 * when the project belongs to a team rather than a personal account. The
 * token is a secret: set it in Vercel's environment variables, never in the repo.
 */

const API = "https://api.vercel.com/v1/query/web-analytics/visits";

export type Period = "24h" | "7d" | "30d";

export const PERIOD_LABEL: Record<Period, string> = {
  "24h": "last 24 hours",
  "7d": "last 7 days",
  "30d": "last 30 days",
};

const PERIOD_MS: Record<Period, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export function parsePeriod(value: unknown): Period {
  return value === "24h" || value === "30d" ? value : "7d";
}

/** Thrown with a message that is safe and useful to show in Discord. */
export class AnalyticsError extends Error {}

function config() {
  const token = process.env.VERCEL_ACCESS_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  if (!token || !projectId) {
    throw new AnalyticsError(
      "Vercel Analytics isn't connected yet: `VERCEL_ACCESS_TOKEN` and `VERCEL_PROJECT_ID` need setting in Vercel's environment variables.",
    );
  }
  return { token, projectId, teamId: process.env.VERCEL_TEAM_ID?.trim() || null };
}

async function query<T>(endpoint: "count" | "aggregate", params: Record<string, string>): Promise<T> {
  const { token, projectId, teamId } = config();
  const url = new URL(`${API}/${endpoint}`);
  url.searchParams.set("projectId", projectId);
  if (teamId) url.searchParams.set("teamId", teamId);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[discord/analytics] Vercel answered", res.status, body.slice(0, 500));
    if (res.status === 401 || res.status === 403) {
      throw new AnalyticsError(
        "Vercel refused the access token. It may have expired, or it may not have access to this project's team. Check `VERCEL_ACCESS_TOKEN` and `VERCEL_TEAM_ID`.",
      );
    }
    if (res.status === 402) {
      throw new AnalyticsError("Vercel says this period is outside what the current plan keeps. Try a shorter period.");
    }
    if (res.status === 404) {
      throw new AnalyticsError(
        "Vercel couldn't find the project, or Web Analytics isn't enabled on it yet. Check `VERCEL_PROJECT_ID`, and that Analytics is enabled in the dashboard.",
      );
    }
    throw new AnalyticsError(`Vercel Analytics answered with an error (${res.status}). Try again in a minute.`);
  }

  const json = (await res.json()) as { data: T };
  return json.data;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * **Vercel rounds `until` down to the query's granularity**, and the count
 * endpoint works in whole days. Passing "now" as `until` therefore cut off at
 * last midnight UTC, and `/traffic` reported 0 visitors on a day with real
 * traffic. Found against the live API on 2026-11-06. So `until` is pushed one
 * unit into the future, which holds no data, and any bucket after "now" is
 * dropped from the series.
 */
function range(period: Period, unitMs: number) {
  const now = Date.now();
  return { since: String(now - PERIOD_MS[period]), until: String(now + unitMs) };
}

export type Totals = { pageviews: number; visitors: number };

/**
 * Unique visitors and page views over the period. The count endpoint works in
 * whole UTC days, so for "24h" this covers yesterday and today. Page views in
 * `/traffic` come from the hourly or daily series instead, which is exact.
 */
export async function totals(period: Period): Promise<Totals> {
  const data = await query<Partial<Totals>>("count", range(period, DAY_MS));
  return { pageviews: data.pageviews ?? 0, visitors: data.visitors ?? 0 };
}

export type TimeRow = { timestamp: string; pageviews: number; visitors: number };

/** Hourly for 24h, daily otherwise. */
export async function overTime(period: Period): Promise<TimeRow[]> {
  const unit = period === "24h" ? HOUR_MS : DAY_MS;
  const rows = await query<TimeRow[]>("aggregate", {
    ...range(period, unit),
    by: period === "24h" ? "hour" : "day",
    limit: "100",
  });
  const now = Date.now();
  return rows.filter((row) => new Date(row.timestamp).getTime() <= now);
}

export type DimensionRow = { key: string; pageviews: number; visitors: number };

/**
 * Top values for one dimension. Vercel folds everything past `limit` into an
 * "Others" row; it is kept, since it shows how long the tail is.
 */
export async function top(
  dimension: "requestPath" | "referrerHostname",
  period: Period,
  limit = 10,
): Promise<DimensionRow[]> {
  const rows = await query<Array<Record<string, unknown>>>("aggregate", {
    ...range(period, HOUR_MS),
    by: dimension,
    limit: String(limit),
  });
  // Vercel does not return these in order, so sort them, keeping "Others" last.
  return rows
    .map((row) => ({
      key: String(row[dimension] ?? "") || (dimension === "referrerHostname" ? "(direct / none)" : "(unknown)"),
      pageviews: Number(row.pageviews ?? 0),
      visitors: Number(row.visitors ?? 0),
    }))
    .sort((a, b) => Number(a.key === "Others") - Number(b.key === "Others") || b.pageviews - a.pageviews);
}
