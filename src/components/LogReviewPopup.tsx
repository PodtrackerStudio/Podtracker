"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The tiers you can set, matching `RatingWidget` exactly.
 *
 * `DIDNT_FINISH` is deliberately absent, as it is there: the enum has it and
 * the profile distribution and landing-page legend display it, but no control
 * on the site sets it. Adding it here would make the two rating controls
 * disagree — that is a design decision, not a code one.
 */
const RATING_TIERS = [
  { api: "HIGHLY_RECOMMEND", label: "Highly Recommend", colorVar: "--highly-recommend" },
  { api: "RECOMMEND", label: "Recommend", colorVar: "--recommend" },
  { api: "OK", label: "OK", colorVar: "--ok" },
  { api: "DONT_RECOMMEND", label: "Don't Recommend", colorVar: "--dont" },
] as const;

type TierApi = (typeof RATING_TIERS)[number]["api"];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function formatDate(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const offset = (firstDay + 6) % 7;

  const days: { label: number; muted: boolean; date: Date }[] = [];
  for (let i = offset - 1; i >= 0; i--) {
    days.push({ label: daysInPrevMonth - i, muted: true, date: new Date(year, month - 1, daysInPrevMonth - i) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ label: d, muted: false, date: new Date(year, month, d) });
  }
  const remainder = (offset + daysInMonth) % 7 === 0 ? 0 : 7 - ((offset + daysInMonth) % 7);
  for (let i = 1; i <= remainder; i++) {
    days.push({ label: i, muted: true, date: new Date(year, month + 1, i) });
  }
  return days;
}

/**
 * The log/review popup: a date, an optional review, Submit.
 *
 * **Extracted from `ReviewWidget` so the "+ Log podcast" flow can open the
 * literally identical screen** rather than a second one built to look like it
 * (Sasha, 2026-08-26). `ReviewWidget` is now the button that opens this; the
 * `/log` page opens it once a show or episode has been picked.
 *
 * It captures no rating, so logs written here store `tier: null` — allowed,
 * since Sasha's rule is that a rating isn't required to log. Adding a tier
 * control is a design change, not a code one.
 */
export function LogReviewPopup({
  externalId,
  episodeKey,
  onClose,
  onSaved,
}: {
  externalId: string;
  /** Present for an episode; absent logs the show itself. */
  episodeKey?: string;
  onClose: () => void;
  /** Runs after a successful save, before the popup is dismissed by the caller. */
  onSaved?: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tier, setTier] = useState<TierApi | null>(null);
  const [tierMenuOpen, setTierMenuOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tierWrapRef = useRef<HTMLDivElement>(null);

  // The existing rating is fetched rather than passed in: only the show page
  // loads one server-side, in a different shape, and /log picks its target in
  // the browser. One path keeps the two from drifting. Until it lands the row
  // reads "Add rating", which is also the answer when there is none.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = new URLSearchParams({ externalId, ...(episodeKey ? { episodeKey } : {}) });
        const res = await fetch(`/api/rate?${qs}`);
        const data = await res.json();
        // Never clobber a choice made while the request was in flight.
        if (!cancelled && data?.tier) setTier((current) => current ?? data.tier);
      } catch {
        // Leave it as "Add rating"; the rating just isn't prefilled.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [externalId, episodeKey]);

  // Click-away closes the tier menu, matching the other dropdowns on the site.
  useEffect(() => {
    if (!tierMenuOpen) return;
    function onDown(e: MouseEvent) {
      if (tierWrapRef.current && !tierWrapRef.current.contains(e.target as Node)) setTierMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [tierMenuOpen]);

  const selectedTier = RATING_TIERS.find((t) => t.api === tier) ?? null;

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalId,
          episodeKey,
          // /api/log writes the LogEntry snapshot and upserts the current
          // rating in one transaction, so no separate /api/rate call.
          tier,
          reviewText: text.trim() || null,
          listenedDate: selectedDate.toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Could not save that log.");
        return;
      }
      if (onSaved) onSaved();
      else onClose();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  const today = new Date();
  const days = buildCalendarDays(calendarDate.getFullYear(), calendarDate.getMonth());

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{ background: "#e5e7eb", borderRadius: 12, padding: "32px 36px", minWidth: 520, maxWidth: 620, position: "relative" }}>
        <button
          style={{ position: "absolute", top: 10, right: 14, background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted)", lineHeight: 1 }}
          onClick={onClose}
        >
          ✕
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, position: "relative" }}>
          <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{formatDate(selectedDate)}</span>
          <button
            style={{ background: "none", border: "none", fontFamily: "inherit", fontSize: 14, color: "var(--text-muted)", cursor: "pointer", textDecoration: "underline", padding: 0 }}
            onClick={() => setDatePickerOpen((v) => !v)}
          >
            Change date
          </button>

          {datePickerOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 8,
                boxShadow: "0 8px 24px rgba(0,0,0,0.13)",
                padding: "14px 16px",
                zIndex: 300,
                minWidth: 220,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  {MONTHS[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text-muted)", fontFamily: "inherit", padding: "0 3px" }}
                    onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                  >
                    ‹
                  </button>
                  <button
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text-muted)", fontFamily: "inherit", padding: "0 3px" }}
                    onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                  >
                    ›
                  </button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center" }}>
                {DAY_LABELS.map((d, i) => (
                  <div key={`label-${i}`} style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, paddingBottom: 4 }}>
                    {d}
                  </div>
                ))}
                {days.map((day, i) => {
                  const isSelected = day.date.toDateString() === selectedDate.toDateString();
                  const isToday = day.date.toDateString() === today.toDateString();
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        if (day.muted) return;
                        setSelectedDate(day.date);
                        setDatePickerOpen(false);
                      }}
                      style={{
                        fontSize: 12,
                        padding: "5px 0",
                        borderRadius: "50%",
                        cursor: day.muted ? "default" : "pointer",
                        color: day.muted ? "#ccc" : "var(--text)",
                        background: isSelected ? "var(--highly-recommend)" : "transparent",
                        fontWeight: isSelected ? 700 : 400,
                        border: isToday ? "1.5px solid var(--text)" : "none",
                      }}
                    >
                      {day.label}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Rating sits directly under the date. Unrated reads "Add rating" in
            black PT Serif Caption (Sasha, 2026-08-26); once set it becomes the
            tier in its own colour, in the Londrina face `.rating-label` gives
            every tier label on the site. Either way the same menu opens. */}
        <div ref={tierWrapRef} style={{ position: "relative", marginBottom: 16 }}>
          <button
            onClick={() => setTierMenuOpen((v) => !v)}
            aria-expanded={tierMenuOpen}
            aria-haspopup="listbox"
            className={selectedTier ? "rating-label" : undefined}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontSize: 18,
              fontFamily: selectedTier ? undefined : "var(--font-display), Georgia, 'Times New Roman', serif",
              color: selectedTier ? `var(${selectedTier.colorVar})` : "var(--text)",
            }}
          >
            {selectedTier ? selectedTier.label : "Add rating"}
            <span aria-hidden="true" style={{ fontSize: 12, color: "var(--text-muted)" }}>
              ▾
            </span>
          </button>

          {tierMenuOpen && (
            <div
              role="listbox"
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 8,
                boxShadow: "0 8px 24px rgba(0,0,0,0.13)",
                padding: "6px 0",
                zIndex: 300,
                minWidth: 200,
              }}
            >
              {RATING_TIERS.map((t) => (
                <button
                  key={t.api}
                  role="option"
                  aria-selected={t.api === tier}
                  className="rating-label"
                  onClick={() => {
                    setTier(t.api);
                    setTierMenuOpen(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: t.api === tier ? "#f1f1f1" : "none",
                    border: "none",
                    padding: "7px 14px",
                    fontSize: 16,
                    cursor: "pointer",
                    color: `var(${t.colorVar})`,
                  }}
                >
                  {t.label}
                </button>
              ))}
              {/* Logging without judging is allowed, so the rating has to be
                  removable again once given. */}
              {tier && (
                <button
                  onClick={() => {
                    setTier(null);
                    setTierMenuOpen(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    borderTop: "1px solid var(--border)",
                    marginTop: 4,
                    padding: "8px 14px",
                    fontFamily: "var(--font-display), Georgia, 'Times New Roman', serif",
                    fontSize: 14,
                    cursor: "pointer",
                    color: "var(--text-muted)",
                  }}
                >
                  No rating
                </button>
              )}
            </div>
          )}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your review here…"
          style={{
            width: "100%",
            minHeight: 240,
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: 14,
            fontFamily: "inherit",
            fontSize: 14,
            resize: "vertical",
            outline: "none",
            color: "var(--text)",
            lineHeight: 1.6,
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14, marginTop: 14 }}>
          {error && <span style={{ color: "#dc2626", fontSize: 13 }}>{error}</span>}
          <button
            onClick={submit}
            disabled={saving}
            style={{ background: "var(--text)", color: "#fff", border: "none", borderRadius: 5, padding: "9px 26px", fontSize: 14, fontFamily: "inherit", cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
