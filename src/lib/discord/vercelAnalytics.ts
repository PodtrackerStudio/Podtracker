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
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const PERIOD_MS: Record<Period, number> = {
  "24h": DAY_MS,
  "7d": 7 * DAY_MS,
  "30d": 30 * DAY_MS,
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

/**
 * **Vercel rounds `until` down to the query's granularity**, and the count
 * endpoint works in whole days. Passing "now" as `until` therefore cut off at
 * last midnight UTC, and the bot reported 0 visitors on a day with real
 * traffic. Found against the live API on 2026-11-06. So `until` is pushed one
 * unit into the future, which holds no data, and any bucket after "now" is
 * dropped from the series.
 */
function window(fromMs: number, toMs: number, unitMs: number) {
  return { since: String(fromMs), until: String(toMs + unitMs) };
}

type Totals = { pageviews: number; visitors: number };
export type TimeRow = { timestamp: string; pageviews: number; visitors: number };
export type DimensionRow = { key: string; visitors: number };

/** The breakdowns the Vercel dashboard shows, in its order. */
export const DIMENSIONS = [
  { key: "requestPath", title: "Pages" },
  { key: "referrerHostname", title: "Referrers" },
  { key: "country", title: "Countries" },
  { key: "deviceType", title: "Devices" },
  { key: "browserName", title: "Browsers" },
  { key: "osName", title: "Operating Systems" },
] as const;

export type DimensionKey = (typeof DIMENSIONS)[number]["key"];

export type Report = {
  period: Period;
  generatedAt: Date;
  visitors: number;
  /** null when there is no fair comparison; see `report`. */
  visitorsChange: number | null;
  pageviews: number;
  pageviewsChange: number | null;
  series: TimeRow[];
  breakdowns: Record<DimensionKey, DimensionRow[]>;
};

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function label(dimension: DimensionKey, raw: unknown): string {
  const value = String(raw ?? "").trim();
  if (value === "Others") return "Others";
  if (!value) return dimension === "referrerHostname" ? "Direct" : "Unknown";
  if (dimension === "country") {
    try {
      return regionNames.of(value.toUpperCase()) ?? value;
    } catch {
      return value;
    }
  }
  if (dimension === "deviceType") return value.charAt(0).toUpperCase() + value.slice(1);
  return value;
}

async function breakdown(dimension: DimensionKey, fromMs: number, toMs: number): Promise<DimensionRow[]> {
  const rows = await query<Array<Record<string, unknown>>>("aggregate", {
    ...window(fromMs, toMs, HOUR_MS),
    by: dimension,
    limit: "6",
  });
  // Vercel does not return these in order. Sorted like the dashboard: by
  // visitors, with "Others" last because it is a remainder, not a value.
  return rows
    .map((row) => ({ key: label(dimension, row[dimension]), visitors: Number(row.visitors ?? 0) }))
    .filter((row) => row.visitors > 0)
    .sort((a, b) => Number(a.key === "Others") - Number(b.key === "Others") || b.visitors - a.visitors);
}

function change(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}

/**
 * Everything the Vercel Analytics dashboard shows that its API exposes. Bounce
 * rate is the one exception: the API has no bounce metric.
 *
 * - **Page views** come from the time series, which is exact to the hour or
 *   day, and the previous period is the series' first half.
 * - **Visitors** are unique, so they cannot be summed from the series: that
 *   would count one person once per hour they returned. They come from the
 *   count endpoint, which works in whole UTC days. For `24h` that means
 *   yesterday and today, and there is no fair previous window, so the change
 *   is left out rather than shown wrong.
 */
export async function report(period: Period): Promise<Report> {
  const now = Date.now();
  const span = PERIOD_MS[period];
  const unit = period === "24h" ? HOUR_MS : DAY_MS;

  const [seriesBoth, current, previous, ...breakdowns] = await Promise.all([
    query<TimeRow[]>("aggregate", {
      ...window(now - 2 * span, now, unit),
      by: period === "24h" ? "hour" : "day",
      limit: "100",
    }),
    query<Partial<Totals>>("count", window(now - span, now, DAY_MS)),
    period === "24h"
      ? Promise.resolve(null)
      : query<Partial<Totals>>("count", { since: String(now - 2 * span), until: String(now - span) }),
    ...DIMENSIONS.map((d) => breakdown(d.key, now - span, now)),
  ]);

  // Buckets are labelled by their start, so a bucket belongs to the current
  // period when it starts after (now - span - one unit).
  const boundary = now - span - unit;
  const rows = (seriesBoth as TimeRow[]).filter((row) => new Date(row.timestamp).getTime() <= now);
  const series = rows.filter((row) => new Date(row.timestamp).getTime() > boundary);
  const before = rows.filter((row) => new Date(row.timestamp).getTime() <= boundary);

  const pageviews = series.reduce((total, row) => total + row.pageviews, 0);
  const previousPageviews = before.reduce((total, row) => total + row.pageviews, 0);
  const visitors = (current as Partial<Totals>).visitors ?? 0;
  const prior = previous as Partial<Totals> | null;

  return {
    period,
    generatedAt: new Date(now),
    visitors,
    visitorsChange: prior ? change(visitors, prior.visitors ?? 0) : null,
    pageviews,
    pageviewsChange: change(pageviews, previousPageviews),
    series,
    breakdowns: Object.fromEntries(
      DIMENSIONS.map((d, i) => [d.key, breakdowns[i] as DimensionRow[]]),
    ) as Report["breakdowns"],
  };
}
