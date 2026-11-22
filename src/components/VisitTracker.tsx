"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Reports page views and the moment a tab is left to `/api/visit`, so bounce
 * rate and time on site can be measured — Vercel's analytics API has neither.
 * See `src/lib/visits.ts`.
 *
 * The visit id lives in **sessionStorage**, which the browser deletes when the
 * tab closes: no cookie, and nothing that recognises the same person on a
 * later visit. A tab idle for 30 minutes starts a new visit, matching the
 * server's `VISIT_IDLE_MS`.
 *
 * Only the path is sent, never the query string, so the one-time tokens in
 * emailed `/auth/*` links never leave the browser through here.
 */

const KEY = "pt_visit";
const IDLE_MS = 30 * 60 * 1000;

type Stored = { id: string; last: number };

function read(): Stored | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as Stored) : null;
    return v && typeof v.id === "string" && typeof v.last === "number" ? v : null;
  } catch {
    return null;
  }
}

function write(v: Stored) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    // Storage blocked (private mode, a strict browser): the visit just goes unmeasured.
  }
}

/** The live visit's id, if there is one — for the signup form to send along. */
export function currentVisitId(): string | null {
  const v = read();
  return v && Date.now() - v.last <= IDLE_MS ? v.id : null;
}

function send(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  // A string body goes as text/plain: no preflight, and it survives the page unloading.
  if (typeof navigator.sendBeacon === "function" && navigator.sendBeacon("/api/visit", body)) return;
  fetch("/api/visit", { method: "POST", body, keepalive: true }).catch(() => {});
}

export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || typeof crypto?.randomUUID !== "function") return;
    const now = Date.now();
    const existing = read();
    const live = existing && now - existing.last <= IDLE_MS ? existing : null;
    const visit = live ?? { id: crypto.randomUUID(), last: now };
    write({ id: visit.id, last: now });
    send({
      event: "view",
      id: visit.id,
      path: pathname,
      // Where they came from, on a visit's first page only.
      ...(!live && document.referrer && { referrer: document.referrer }),
    });
  }, [pathname]);

  useEffect(() => {
    let leaveSent = false;
    const leave = () => {
      if (leaveSent) return;
      const v = read();
      if (!v || Date.now() - v.last > IDLE_MS) return;
      leaveSent = true;
      write({ id: v.id, last: Date.now() });
      send({ event: "leave", id: v.id });
    };
    // Hidden covers closing the tab, switching away and locking a phone;
    // pagehide catches browsers that unload without a visibility change.
    const onVisibility = () => {
      if (document.visibilityState === "hidden") leave();
      else leaveSent = false;
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", leave);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", leave);
    };
  }, []);

  return null;
}
