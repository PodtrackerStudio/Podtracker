/**
 * Personal themes: each signed-in person can pick a main colour, an accent
 * colour and a font. It changes the site for them only — everyone else, and
 * every signed-out visitor, sees Sasha's design.
 *
 * A theme is applied by overriding the same CSS variables the whole site is
 * already built on (see `:root` in globals.css), so no component knows themes
 * exist. Null fields mean "leave Sasha's value alone".
 *
 * Shared by the server (`ThemeStyle`, which writes the saved theme into the
 * page) and the client (the Settings preview), so both produce identical CSS.
 */

export type Theme = {
  main: string | null;
  accent: string | null;
  font: ThemeFontKey | null;
};

export const DEFAULT_THEME: Theme = { main: null, accent: null, font: null };

/**
 * Font pairs. `display` replaces PT Serif Caption (nav, headlines, most
 * copy); `body` replaces Roboto (reviews). Null keeps the original. The
 * variables are loaded in layout.tsx with `preload: false`, so a font is only
 * downloaded by people whose theme actually uses it.
 */
export const THEME_FONTS = {
  // `--font-pt-serif` is a second handle on PT Serif that themes never
  // override, so the Classic card still shows it while another font previews.
  classic: { label: "Classic", display: null, body: null, sample: "var(--font-pt-serif)" },
  modern: { label: "Modern", display: "var(--font-dm-sans)", body: "var(--font-dm-sans)", sample: "var(--font-dm-sans)" },
  friendly: { label: "Friendly", display: "var(--font-nunito)", body: "var(--font-nunito)", sample: "var(--font-nunito)" },
  editorial: { label: "Editorial", display: "var(--font-fraunces)", body: null, sample: "var(--font-fraunces)" },
  typewriter: { label: "Typewriter", display: "var(--font-space-mono)", body: null, sample: "var(--font-space-mono)" },
} as const;

export type ThemeFontKey = keyof typeof THEME_FONTS;

/** Main colours. Stored as a vivid base; the site uses soft tints of it. */
export const MAIN_PRESETS = [
  { name: "Sand", hex: "#c9a26b" },
  { name: "Mint", hex: "#2fbf8f" },
  { name: "Peach", hex: "#ff8a5c" },
  { name: "Lavender", hex: "#9b7bff" },
  { name: "Rose", hex: "#ff5c9a" },
  { name: "Lemon", hex: "#f2c230" },
  { name: "Sage", hex: "#7fa36b" },
  { name: "Slate", hex: "#6b7a90" },
] as const;

/** Accent colours: buttons, links, focus rings. Used as-is. */
export const ACCENT_PRESETS = [
  { name: "Blue", hex: "#3b82f6" },
  { name: "Green", hex: "#28ba60" },
  { name: "Pink", hex: "#ff40d9" },
  { name: "Orange", hex: "#ff7a1a" },
  { name: "Purple", hex: "#8b5cf6" },
  { name: "Red", hex: "#e5484d" },
  { name: "Teal", hex: "#14b8a6" },
  { name: "Ink", hex: "#222222" },
] as const;

const HEX = /^#[0-9a-f]{6}$/;

/** Lower-cased `#rrggbb`, or null for anything else. This is the only gate
 *  between user input and a <style> tag, so nothing else may reach the CSS. */
export function cleanHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return HEX.test(v) ? v : null;
}

export function cleanFont(value: unknown): ThemeFontKey | null {
  return typeof value === "string" && Object.hasOwn(THEME_FONTS, value) ? (value as ThemeFontKey) : null;
}

export function cleanTheme(raw: { main?: unknown; accent?: unknown; font?: unknown } | null | undefined): Theme {
  if (!raw) return DEFAULT_THEME;
  const font = cleanFont(raw.font);
  return { main: cleanHex(raw.main), accent: cleanHex(raw.accent), font: font === "classic" ? null : font };
}

export function isDefaultTheme(t: Theme): boolean {
  return !t.main && !t.accent && !t.font;
}

/** WCAG relative luminance of a `#rrggbb`. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Black or white, whichever reads better on `hex`. White gets the benefit of
 *  the doubt on mid-tones because Sasha's own blue button carries white. */
export function readableOn(hex: string): string {
  return luminance(hex) > 0.5 ? "#111111" : "#ffffff";
}

const mix = (hex: string, pct: number, other: string) => `color-mix(in srgb, ${hex} ${pct}%, ${other})`;

/** The CSS variables a theme overrides. Empty for the default theme. */
export function themeVars(t: Theme): Record<string, string> {
  const vars: Record<string, string> = {};
  if (t.main) {
    vars["--accent-blue"] = mix(t.main, 35, "#ffffff"); // nav bar, soft cards, selection
    vars["--btn-nav-blue"] = mix(t.main, 55, "#ffffff"); // nav pills
    // Opaque, unlike Sasha's translucent --bg: a hint of the colour in the grey.
    vars["--bg"] = mix(t.main, 8, "#e7e7e7");
    vars["--page-bg-alt"] = mix(t.main, 8, "#e7e7e7");
    // Outlines stay a shade darker than the tinted page, as Sasha's #e0e0e0
    // is against her grey; otherwise outlined buttons vanish into it.
    vars["--border"] = mix(t.main, 12, "#d6d6d6");
  }
  if (t.accent) {
    const on = readableOn(t.accent);
    vars["--btn-primary-blue"] = t.accent;
    vars["--on-accent"] = on;
    vars["--theme-on-accent"] = on;
    // Link hover text sits on the grey page, so it needs to be darker than a
    // pale accent. Very dark accents are left as they are.
    vars["--link-hover"] = luminance(t.accent) > 0.08 ? mix(t.accent, 70, "#000000") : t.accent;
  }
  if (t.font) {
    const f = THEME_FONTS[t.font];
    if (f.display) vars["--font-display"] = `${f.display}, Georgia, serif`;
    if (f.body) vars["--font-body"] = `${f.body}, Arial, sans-serif`;
  }
  return vars;
}

/** A stylesheet for the server to inline. `html:root` outranks the font
 *  classes next/font puts on <html>, whatever order the CSS loads in. */
export function themeCss(t: Theme): string {
  const body = Object.entries(themeVars(t))
    .map(([k, v]) => `${k}:${v};`)
    .join("");
  return body ? `html:root{${body}}` : "";
}
