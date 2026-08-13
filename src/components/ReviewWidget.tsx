"use client";

import { useState } from "react";

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

export function ReviewWidget({ styles, buttonClassName }: { styles: Record<string, string>; buttonClassName: string }) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [text, setText] = useState("");

  function openPopup() {
    const now = new Date();
    setSelectedDate(now);
    setCalendarDate(now);
    setDatePickerOpen(false);
    setOpen(true);
  }

  const today = new Date();
  const days = buildCalendarDays(calendarDate.getFullYear(), calendarDate.getMonth());

  return (
    <>
      <button className={buttonClassName} onClick={openPopup}>
        Add Log / Review
      </button>

      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div style={{ background: "#e5e7eb", borderRadius: 12, padding: "32px 36px", minWidth: 520, maxWidth: 620, position: "relative" }}>
            <button
              style={{ position: "absolute", top: 10, right: 14, background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted)", lineHeight: 1 }}
              onClick={() => setOpen(false)}
            >
              ✕
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, position: "relative" }}>
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
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <button
                onClick={() => setOpen(false)}
                style={{ background: "var(--text)", color: "#fff", border: "none", borderRadius: 5, padding: "9px 26px", fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
