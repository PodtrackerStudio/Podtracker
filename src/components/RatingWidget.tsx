"use client";

import { useState } from "react";
import { MicIcon } from "./icons";

const TIERS = [
  { key: "highly", label: "Highly Recommend" },
  { key: "recommend", label: "Recommend" },
  { key: "ok", label: "OK" },
  { key: "dont", label: "Don't Recommend" },
] as const;

type TierKey = (typeof TIERS)[number]["key"];

const tierClass: Record<TierKey, string> = {
  highly: "ratedHighly",
  recommend: "ratedRecommend",
  ok: "ratedOk",
  dont: "ratedDont",
};

export function RatingWidget({ styles }: { styles: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<TierKey | null>(null);
  const [pending, setPending] = useState<TierKey | null>(null);

  function openPopup() {
    setPending(rating);
    setOpen(true);
  }

  function submit() {
    if (pending) setRating(pending);
    setOpen(false);
  }

  return (
    <>
      <button className={`${styles.micBtn} ${rating ? styles[tierClass[rating]] : ""}`} onClick={openPopup}>
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
                  fill={pending ? `var(--${pending === "dont" ? "dont" : pending === "ok" ? "ok" : pending === "recommend" ? "recommend" : "highly-recommend"})` : "#9ca3af"}
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
                  color: `var(--${t.key === "dont" ? "dont" : t.key === "ok" ? "ok" : t.key === "recommend" ? "recommend" : "highly-recommend"})`,
                }}
              >
                {t.label}
              </button>
            ))}
            <div style={{ width: "100%", borderTop: "1px solid #ccc", margin: "8px 0" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 4 }}>
              <button
                onClick={submit}
                style={{ background: "#06b6d4", color: "#fff", border: "none", borderRadius: 5, padding: "7px 24px", fontSize: 14, fontFamily: "inherit", fontWeight: 600, cursor: "pointer" }}
              >
                Rate
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
