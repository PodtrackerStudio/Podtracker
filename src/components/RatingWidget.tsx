"use client";

import { useState } from "react";
import { MicIcon } from "./icons";

/**
 * The five tiers, in the order the landing page's "Ratings explained" lists
 * them. `didnt` was missing until 2026-08-26: the enum, the legend and the
 * profile distribution all had it, but no control on the site could set it.
 * The colour lives here rather than in a ternary chain so a sixth tier — or a
 * recoloured one — is a single edit.
 */
const TIERS = [
  { key: "highly", label: "Highly Recommend", api: "HIGHLY_RECOMMEND", colorVar: "--highly-recommend", ratedClass: "ratedHighly" },
  { key: "recommend", label: "Recommend", api: "RECOMMEND", colorVar: "--recommend", ratedClass: "ratedRecommend" },
  { key: "ok", label: "OK", api: "OK", colorVar: "--ok", ratedClass: "ratedOk" },
  { key: "dont", label: "Don't Recommend", api: "DONT_RECOMMEND", colorVar: "--dont", ratedClass: "ratedDont" },
  { key: "didnt", label: "Didn't Finish", api: "DIDNT_FINISH", colorVar: "--didnt-finish", ratedClass: "ratedDidnt" },
] as const;

type TierKey = (typeof TIERS)[number]["key"];

const byKey = (key: TierKey) => TIERS.find((t) => t.key === key)!;

/**
 * Rating only — no diary entry. Logging a listen is `ReviewWidget`.
 *
 * `initialTier` is read from the database on page load, so a rating you already
 * gave shows on the mic button instead of resetting every refresh.
 */
export function RatingWidget({
  styles,
  externalId,
  episodeKey,
  initialTier = null,
}: {
  styles: Record<string, string>;
  externalId: string;
  /** Present on episode pages; absent means the show itself is being rated. */
  episodeKey?: string;
  initialTier?: TierKey | null;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<TierKey | null>(initialTier);
  const [pending, setPending] = useState<TierKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openPopup() {
    setPending(rating);
    setError(null);
    setOpen(true);
  }

  async function submit() {
    if (!pending) {
      setOpen(false);
      return;
    }
    const previous = rating;
    setRating(pending);
    setSaving(true);
    try {
      const res = await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalId, episodeKey, tier: byKey(pending).api }),
      });
      if (!res.ok) {
        // Put the old rating back rather than leave the button showing one the
        // database never accepted.
        setRating(previous);
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Could not save that rating.");
        return;
      }
      setOpen(false);
    } catch {
      setRating(previous);
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button className={`${styles.micBtn} ${rating ? styles[byKey(rating).ratedClass] : ""}`} onClick={openPopup}>
        <MicIcon />
        Rate
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            style={{
              background: "#e5e7eb",
              borderRadius: 12,
              padding: "32px 40px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              minWidth: 240,
              position: "relative",
            }}
          >
            <button
              style={{ position: "absolute", top: 10, right: 14, background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted)", lineHeight: 1 }}
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
            <div style={{ marginBottom: 8 }}>
              <svg viewBox="0 0 24 24" width={48} height={48} xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 1C10.34 1 9 2.34 9 4v7c0 1.66 1.34 3 3 3s3-1.34 3-3V4c0-1.66-1.34-3-3-3zm-1 17.93V21h-2v2h6v-2h-2v-2.07A8.001 8.001 0 0020 12h-2a6 6 0 01-12 0H4a8.001 8.001 0 007 7.93z"
                  fill={pending ? `var(${byKey(pending).colorVar})` : "#9ca3af"}
                />
              </svg>
            </div>
            {TIERS.map((t) => (
              <button
                key={t.key}
                onClick={() => setPending(t.key)}
                style={{
                  background: "none",
                  border: "none",
                  fontFamily: "inherit",
                  fontSize: 16,
                  fontWeight: 500,
                  cursor: "pointer",
                  padding: "4px 0",
                  color: `var(${t.colorVar})`,
                }}
              >
                {t.label}
              </button>
            ))}
            <div style={{ width: "100%", borderTop: "1px solid #ccc", margin: "8px 0" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 4 }}>
              <button
                onClick={submit}
                disabled={saving}
                style={{ background: "#06b6d4", color: "#fff", border: "none", borderRadius: 5, padding: "7px 24px", fontSize: 14, fontFamily: "inherit", fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Saving…" : "Rate"}
              </button>
              {error && <span style={{ color: "#dc2626", fontSize: 13 }}>{error}</span>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
