import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { DIMENSIONS, PERIOD_LABEL, type DimensionRow, type Report, type TimeRow } from "./vercelAnalytics";

/**
 * Draws the `/analytics` reply as one PNG, styled after Vercel's own Web
 * Analytics dashboard: black, Geist, hairline borders, a blue area chart, and
 * breakdown panels with a faint bar behind each row.
 *
 * Discord embeds are text boxes with a coloured edge and cannot look like this,
 * so the whole dashboard is an image instead. `ImageResponse` (Satori + Resvg)
 * ships with Next, so there is no new dependency. Satori lays out with flexbox
 * only: **every element with more than one child needs `display: flex`**, or
 * it throws.
 *
 * Geist is bundled from `./fonts` (SIL Open Font License, see `OFL.txt`).
 * `next.config.ts` traces that folder into the `/api/discord` function, since
 * a path built from `process.cwd()` is not picked up automatically.
 */

/**
 * Wide rather than square. Discord fits an attachment inside a wide preview,
 * so height is what limits how large the image displays. The first version was
 * 1600×1560 and showed smaller than it needed to. The panels hold five rows
 * and the chart is shorter to get here.
 */
const WIDTH = 1600;
const HEIGHT = 1180;
const ROWS = 5;

const C = {
  page: "#000000",
  card: "#0a0a0a",
  border: "#1f1f1f",
  borderStrong: "#2e2e2e",
  text: "#ededed",
  muted: "#a1a1a1",
  faint: "#6e6e6e",
  bar: "#161616",
  blue: "#0a72ef",
  green: "#4ade80",
  greenBg: "rgba(74, 222, 128, 0.12)",
  red: "#ff6166",
  redBg: "rgba(255, 97, 102, 0.12)",
  greyBg: "rgba(255, 255, 255, 0.06)",
};

let fontCache: Promise<{ name: string; data: Buffer; weight: 400 | 500 | 600; style: "normal" }[]> | null = null;

function fonts() {
  fontCache ??= (async () => {
    const dir = join(process.cwd(), "src/lib/discord/fonts");
    const [regular, medium, semibold] = await Promise.all([
      readFile(join(dir, "Geist-Regular.ttf")),
      readFile(join(dir, "Geist-Medium.ttf")),
      readFile(join(dir, "Geist-SemiBold.ttf")),
    ]);
    return [
      { name: "Geist", data: regular, weight: 400 as const, style: "normal" as const },
      { name: "Geist", data: medium, weight: 500 as const, style: "normal" as const },
      { name: "Geist", data: semibold, weight: 600 as const, style: "normal" as const },
    ];
  })();
  return fontCache;
}

/** 1,234 below ten thousand, then 12.3K, like the dashboard. */
function num(n: number): string {
  if (n < 10_000) return n.toLocaleString("en-US");
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** A tick ceiling that splits into four even, round steps. */
function niceMax(value: number): number {
  if (value <= 4) return 4;
  const raw = value / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? 10 * magnitude;
  return step * 4;
}

function Change({ value }: { value: number | null }) {
  if (value === null) return null;
  const pct = Math.round(value * 100);
  const [color, background] = pct > 0 ? [C.green, C.greenBg] : pct < 0 ? [C.red, C.redBg] : [C.muted, C.greyBg];
  return (
    <div
      style={{
        display: "flex",
        marginLeft: 16,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 20,
        fontWeight: 500,
        color,
        background,
      }}
    >
      {`${pct > 0 ? "+" : ""}${pct}%`}
    </div>
  );
}

function Metric({ label, value, delta, active }: { label: string; value: number; delta: number | null; active: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "18px 26px",
        marginRight: 12,
        borderRadius: 10,
        background: active ? "#141414" : "transparent",
        border: `1px solid ${active ? C.borderStrong : "transparent"}`,
        minWidth: 300,
      }}
    >
      <div style={{ display: "flex", fontSize: 20, color: C.muted, fontWeight: 500 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 10 }}>
        <div style={{ display: "flex", fontSize: 56, fontWeight: 600, color: C.text, letterSpacing: -2, lineHeight: 1 }}>
          {num(value)}
        </div>
        <Change value={delta} />
      </div>
    </div>
  );
}

function tickLabel(row: TimeRow, period: Report["period"]): string {
  const d = new Date(row.timestamp);
  if (period === "24h") return `${String(d.getUTCHours()).padStart(2, "0")}:00`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function Chart({ series, period }: { series: TimeRow[]; period: Report["period"] }) {
  // The card's inner width (1600 − 2×44 page padding − 2×24 card padding − 2px
  // border) less the 44px axis column. The first version used 1420 against a
  // 1410 space, so the line ran into the card's right border.
  const width = 1418;
  const height = 170;
  const values = series.map((r) => r.visitors);
  const top = niceMax(Math.max(0, ...values));
  const n = Math.max(values.length, 2);
  const x = (i: number) => (i / (n - 1)) * width;
  const y = (v: number) => height - (v / top) * (height - 4) - 2;

  const points = (values.length ? values : [0, 0]).map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const line = `M ${points.join(" L ")}`;
  const area = `${line} L ${x(n - 1).toFixed(1)},${height} L 0,${height} Z`;

  // About seven labels, evenly spaced, always including the newest point, each
  // centred under its own point rather than spread by flexbox.
  const last = series.length - 1;
  const count = series.length <= 8 ? series.length : 7;
  const tickIndexes =
    count <= 1 ? [0] : [...new Set(Array.from({ length: count }, (_, k) => Math.round((k * last) / (count - 1))))];

  return (
    <div style={{ display: "flex", flexDirection: "column", marginTop: 22 }}>
      <div style={{ display: "flex" }}>
        <div style={{ display: "flex", position: "relative", width: 44, height, fontSize: 16, color: C.faint }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{ display: "flex", position: "absolute", left: 0, top: ((height - 1) * i) / 4 - 10, height: 20, alignItems: "center" }}
            >
              {num(Math.round((top * (4 - i)) / 4))}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", position: "relative", width, height }}>
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <defs>
              <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.blue} stopOpacity="0.32" />
                <stop offset="100%" stopColor={C.blue} stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={i}
                x1="0"
                x2={width}
                y1={((height - 1) * i) / 4 + 0.5}
                y2={((height - 1) * i) / 4 + 0.5}
                stroke={C.border}
                strokeWidth="1"
                strokeDasharray={i === 4 ? undefined : "4 6"}
              />
            ))}
            <path d={area} fill="url(#fill)" />
            <path d={line} fill="none" stroke={C.blue} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <div style={{ display: "flex", position: "relative", height: 22, marginTop: 14, fontSize: 16, color: C.faint }}>
        {series.length > 0 &&
          tickIndexes.map((i) => {
            const centre = 44 + x(i);
            // The first and last labels sit inside the chart's edges.
            const left = i === 0 ? 44 : i === last ? 44 + width - 80 : centre - 40;
            const align = i === 0 ? "flex-start" : i === last ? "flex-end" : "center";
            return (
              <div key={i} style={{ display: "flex", position: "absolute", left, width: 80, justifyContent: align }}>
                {tickLabel(series[i], period)}
              </div>
            );
          })}
      </div>
    </div>
  );
}

function Panel({ title, rows }: { title: string; rows: DimensionRow[] }) {
  const shown = rows.slice(0, ROWS);
  const max = Math.max(1, ...shown.map((r) => r.visitors));
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        // (1600 − 2×44 padding − 2×21 gaps) ÷ 3: three panels and two equal gaps
        // exactly fill the row, matching the 20px gap between the rows.
        width: 490,
        height: 268,
        padding: "18px 22px",
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", fontSize: 22, fontWeight: 500, color: C.text }}>{title}</div>
        <div style={{ display: "flex", fontSize: 14, fontWeight: 500, color: C.faint, letterSpacing: 1.5 }}>VISITORS</div>
      </div>
      {shown.length === 0 ? (
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", fontSize: 18, color: C.faint }}>
          No data
        </div>
      ) : (
        shown.map((row) => (
          <div
            key={row.key}
            style={{ display: "flex", position: "relative", alignItems: "center", height: 36, marginBottom: 5 }}
          >
            <div
              style={{
                display: "flex",
                position: "absolute",
                left: 0,
                top: 0,
                height: 36,
                width: `${Math.max(2, (row.visitors / max) * 100)}%`,
                background: C.bar,
                borderRadius: 6,
              }}
            />
            <div style={{ display: "flex", flex: 1, paddingLeft: 14, fontSize: 19, color: row.key === "Others" ? C.muted : C.text }}>
              {truncate(row.key, 34)}
            </div>
            <div style={{ display: "flex", paddingRight: 12, fontSize: 19, color: C.text, fontWeight: 500 }}>
              {num(row.visitors)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export async function renderAnalyticsCard(report: Report, siteName: string): Promise<Buffer> {
  const generated = report.generatedAt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });

  const image = new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: WIDTH,
          height: HEIGHT,
          padding: 44,
          background: C.page,
          color: C.text,
          fontFamily: "Geist",
        }}
      >
        {/* Header: breadcrumb left, environment and period right */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 28 }}>
            <div style={{ display: "flex", fontWeight: 600 }}>{siteName}</div>
            <div style={{ display: "flex", color: C.borderStrong, margin: "0 16px", fontWeight: 400 }}>/</div>
            <div style={{ display: "flex", color: C.muted, fontWeight: 500 }}>Web Analytics</div>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            {["Production", PERIOD_LABEL[report.period]].map((pill) => (
              <div
                key={pill}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginLeft: 12,
                  padding: "8px 16px",
                  border: `1px solid ${C.borderStrong}`,
                  borderRadius: 8,
                  fontSize: 18,
                  color: C.text,
                  background: C.card,
                }}
              >
                {pill === "Production" && (
                  <div style={{ display: "flex", width: 8, height: 8, borderRadius: 8, background: C.blue, marginRight: 10 }} />
                )}
                {pill}
              </div>
            ))}
          </div>
        </div>

        {/* Overview: the two numbers and the chart */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 24,
            padding: 24,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
          }}
        >
          <div style={{ display: "flex" }}>
            <Metric label="Visitors" value={report.visitors} delta={report.visitorsChange} active />
            <Metric label="Page Views" value={report.pageviews} delta={report.pageviewsChange} active={false} />
          </div>
          <Chart series={report.series} period={report.period} />
        </div>

        {/* Breakdowns, in the dashboard's order */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", marginTop: 20 }}>
          {DIMENSIONS.map((d, i) => (
            <div key={d.key} style={{ display: "flex", marginTop: i < 3 ? 0 : 20 }}>
              <Panel title={d.title} rows={report.breakdowns[d.key]} />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "auto", fontSize: 16, color: C.faint }}>
          <div style={{ display: "flex" }}>
            {report.period === "24h"
              ? "Chart shows visitors per hour. Visitor total covers yesterday and today (UTC)."
              : "Chart shows visitors per day. Change is against the previous period."}
          </div>
          <div style={{ display: "flex" }}>{`${generated} UTC`}</div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, fonts: await fonts() },
  );

  return Buffer.from(await image.arrayBuffer());
}
