"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ACCENT_PRESETS,
  DEFAULT_THEME,
  MAIN_PRESETS,
  THEME_FONTS,
  isDefaultTheme,
  themeVars,
  type Theme,
  type ThemeFontKey,
} from "@/lib/theme";
import styles from "./theme.module.css";

/** Every variable any theme can set, so a preview can be fully cleared. */
const ALL_VARS = Object.keys(
  themeVars({ main: "#000000", accent: "#000000", font: "modern" }),
);

/**
 * Settings → Theme. Changes preview live on the whole page (inline styles on
 * <html>, which outrank the saved theme's <style>), and are cleared again when
 * the person leaves the page, so an unsaved preview never sticks.
 */
export function ThemeEditor({ initial }: { initial: Theme }) {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>(initial);
  const [saved, setSaved] = useState<Theme>(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    const root = document.documentElement.style;
    for (const k of ALL_VARS) root.removeProperty(k);
    for (const [k, v] of Object.entries(themeVars(theme))) root.setProperty(k, v);
  }, [theme]);

  useEffect(
    () => () => {
      const root = document.documentElement.style;
      for (const k of ALL_VARS) root.removeProperty(k);
    },
    [],
  );

  const dirty = theme.main !== saved.main || theme.accent !== saved.accent || theme.font !== saved.font;

  function update(patch: Partial<Theme>) {
    setStatus(null);
    setTheme((t) => ({ ...t, ...patch }));
  }

  async function save(next: Theme) {
    setSaving(true);
    setStatus(null);
    const res = await fetch("/api/account/theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      setStatus({ type: "error", text: data?.error ?? "Couldn't save your theme. Try again?" });
      return;
    }
    setTheme(data.theme);
    setSaved(data.theme);
    setStatus({
      type: "success",
      text: isDefaultTheme(data.theme) ? "Back to the original look." : "Saved! The site now looks like this for you.",
    });
    // Re-render the server parts so the nav's saved-theme <style> catches up.
    router.refresh();
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.intro}>
        Make Podtracker yours. Only you see your theme. Everyone else sees the site as normal.
      </p>

      <ColourPicker
        title="Main colour"
        hint="Tints the nav bar, cards and background."
        presets={MAIN_PRESETS}
        value={theme.main}
        onChange={(main) => update({ main })}
        swatchStyle={(hex) => ({ background: `color-mix(in srgb, ${hex} 45%, #fff)` })}
        originalHex="#c3dbff"
      />

      <ColourPicker
        title="Accent colour"
        hint="Buttons, links and highlights."
        presets={ACCENT_PRESETS}
        value={theme.accent}
        onChange={(accent) => update({ accent })}
        swatchStyle={(hex) => ({ background: hex })}
        originalHex="#7bbaff"
      />

      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Font</h2>
        <p className={styles.hint}>Headlines, the nav and most text.</p>
        <div className={styles.fonts} role="radiogroup" aria-label="Font">
          {(Object.keys(THEME_FONTS) as ThemeFontKey[]).map((key) => {
            const f = THEME_FONTS[key];
            const selected = (theme.font ?? "classic") === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`${styles.fontCard} ${selected ? styles.selected : ""}`}
                onClick={() => update({ font: key === "classic" ? null : key })}
              >
                <span className={styles.fontSample} style={{ fontFamily: f.sample }}>
                  Aa
                </span>
                <span className={styles.fontName} style={{ fontFamily: f.sample }}>
                  {f.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.preview} aria-label="Preview">
        <div className={styles.previewNav}>
          <span className={styles.previewLogo}>Podtracker</span>
          <span className={styles.previewPill}>Explore</span>
        </div>
        <div className={styles.previewBody}>
          <h3 className={styles.previewTitle}>Your listening diary</h3>
          <p className={styles.previewText}>
            Loved this episode, the second half especially. <span className={styles.previewLink}>Read more</span>
          </p>
          <div className={styles.previewButtons}>
            <span className={styles.previewPrimary}>Follow</span>
            <span className={styles.previewCard}>Add to list</span>
          </div>
        </div>
      </section>

      {status && <div className={`${styles.status} ${styles[status.type]}`}>{status.text}</div>}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.reset}
          onClick={() => {
            setTheme(DEFAULT_THEME);
            save(DEFAULT_THEME);
          }}
          disabled={saving || (isDefaultTheme(theme) && isDefaultTheme(saved))}
        >
          Reset to original
        </button>
        <button type="button" className={styles.save} onClick={() => save(theme)} disabled={saving || !dirty}>
          {saving ? "Saving…" : "Save theme"}
        </button>
      </div>
    </div>
  );
}

function ColourPicker({
  title,
  hint,
  presets,
  value,
  onChange,
  swatchStyle,
  originalHex,
}: {
  title: string;
  hint: string;
  presets: readonly { name: string; hex: string }[];
  value: string | null;
  onChange: (hex: string | null) => void;
  swatchStyle: (hex: string) => React.CSSProperties;
  /** Sasha's colour, written literally: the variable may be mid-preview. */
  originalHex: string;
}) {
  const isCustom = value !== null && !presets.some((p) => p.hex === value);
  return (
    <section className={styles.group}>
      <h2 className={styles.groupTitle}>{title}</h2>
      <p className={styles.hint}>{hint}</p>
      <div className={styles.swatches} role="radiogroup" aria-label={title}>
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          title="Original"
          className={`${styles.swatch} ${styles.swatchDefault} ${value === null ? styles.selected : ""}`}
          style={{ background: originalHex }}
          onClick={() => onChange(null)}
        >
          <span className={styles.srOnly}>Original</span>
          <span aria-hidden="true" className={styles.swatchDefaultMark}>↺</span>
        </button>
        {presets.map((p) => (
          <button
            key={p.hex}
            type="button"
            role="radio"
            aria-checked={value === p.hex}
            title={p.name}
            className={`${styles.swatch} ${value === p.hex ? styles.selected : ""}`}
            style={swatchStyle(p.hex)}
            onClick={() => onChange(p.hex)}
          >
            <span className={styles.srOnly}>{p.name}</span>
          </button>
        ))}
        <label
          title="Pick any colour"
          className={`${styles.swatch} ${styles.swatchCustom} ${isCustom ? styles.selected : ""}`}
          style={isCustom && value ? swatchStyle(value) : undefined}
        >
          <span className={styles.srOnly}>Custom {title.toLowerCase()}</span>
          <input
            type="color"
            className={styles.colorInput}
            value={value ?? "#7bbaff"}
            onChange={(e) => onChange(e.target.value.toLowerCase())}
          />
          {!isCustom && <span aria-hidden="true">+</span>}
        </label>
      </div>
    </section>
  );
}
