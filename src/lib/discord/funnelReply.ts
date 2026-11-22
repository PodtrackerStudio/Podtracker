import { DURATION_LABELS, funnel, type Funnel, type Match } from "../funnel";
import { PERIOD_LABEL, parsePeriod, vercelVisitors } from "./vercelAnalytics";

/**
 * What `/funnel` answers with: a text message, since it is mostly short lines
 * of numbers, which read better as text on a phone than as an image.
 */

const fmt = (n: number) => n.toLocaleString("en-US");
const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—");

function duration(seconds: number | null): string {
  if (seconds === null) return "—";
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

const MATCH_TEXT: Record<Match["kind"], string> = {
  device: "same browser and network as",
  visit: "made in the same visit as",
  email: "same email inbox as",
  network: "same network as (shared wifi can do this)",
};

/** Discord's limit is 2,000 characters; the list is cut well before that. */
const MAX_SIGNUPS_LISTED = 12;

export function funnelText(f: Funnel, vercel: number | null): string {
  const lines: string[] = [`**Signup funnel · ${PERIOD_LABEL[f.period]}**`, ""];

  if (f.visits === 0) {
    lines.push(
      f.trackingSince
        ? "No visits recorded in this period."
        : "No visits recorded yet. Tracking starts with the deploy that added it.",
    );
  } else {
    lines.push(
      `**Visits:** ${fmt(f.visits)}${vercel !== null ? ` · Vercel counted ${fmt(vercel)} unique visitors` : ""}`,
      `**Bounce rate:** ${pct(f.bounces, f.visits)} (${fmt(f.bounces)} of ${fmt(f.visits)} visits saw one page)`,
      `**Time before leaving:** median ${duration(f.medianSeconds)} · average ${duration(f.averageSeconds)}`,
      f.durations.map((n, i) => `\`${DURATION_LABELS[i]}\` ${pct(n, f.visits)}`).join(" · "),
    );
  }

  const created = f.signups.length;
  lines.push(
    "",
    "**Funnel** (visitors who weren't signed in)",
    `Visited → ${fmt(f.newVisitors)}`,
    `Opened signup → ${fmt(f.sawSignup)} (${pct(f.sawSignup, f.newVisitors)})`,
    `Created an account → ${fmt(created)} (${pct(created, f.sawSignup)} of those)`,
    f.confirmed === null
      ? "Confirmed email → couldn't read Supabase"
      : `Confirmed email → ${fmt(f.confirmed)} (${pct(f.confirmed, created)})`,
  );

  if (created > 0) {
    const flagged = f.signups.filter((s) => s.matches.length > 0).length;
    lines.push("", `**New accounts:** ${fmt(created)} · ${fmt(created - flagged)} look unique · ${fmt(flagged)} flagged`);
    for (const s of f.signups.slice(0, MAX_SIGNUPS_LISTED)) {
      const status = s.confirmed === false ? " (unconfirmed)" : "";
      if (s.matches.length === 0) {
        lines.push(`✅ ${s.username}${status}`);
      } else {
        const why = s.matches.map((m) => `${MATCH_TEXT[m.kind]} ${m.username}`).join("; ");
        lines.push(`⚠️ ${s.username}${status}: ${why}`);
      }
    }
    if (created > MAX_SIGNUPS_LISTED) lines.push(`…and ${fmt(created - MAX_SIGNUPS_LISTED)} more`);
  }

  const since = f.trackingSince;
  if (since && Date.now() - since.getTime() < periodMs(f.period)) {
    lines.push(
      "",
      `_Visit tracking started ${since.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}; visit numbers before then are zero, and the network/browser check only covers accounts made since._`,
    );
  }
  return lines.join("\n");
}

function periodMs(p: Funnel["period"]) {
  return { "24h": 1, "7d": 7, "30d": 30 }[p] * 24 * 60 * 60 * 1000;
}

export async function funnelReport(period: unknown): Promise<string> {
  const p = parsePeriod(period);
  const [f, vercel] = await Promise.all([
    funnel(p),
    // Shown for comparison only; the reply still works if Vercel doesn't answer.
    vercelVisitors(p).catch(() => null),
  ]);
  return funnelText(f, vercel);
}
