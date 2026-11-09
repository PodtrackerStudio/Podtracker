"use client";

import { useEffect } from "react";

/**
 * Run the cursor (or a finger) through the landing headline and each letter it
 * touches bursts into little balls that fly off, drift, then pull back
 * together into the letter. Phillip's idea, 2026-11-09.
 *
 * How it works:
 *   - The headline stays real text: one `[data-letter]` span per character.
 *     Only `visibility` changes, so layout, wrapping, screen readers and
 *     crawlers never notice.
 *   - On contact, the letter is drawn to an offscreen canvas in its own
 *     computed font and sampled every few pixels. Each opaque sample becomes a
 *     ball whose "home" is that pixel, in page coordinates.
 *   - Balls fly with the cursor's velocity plus a burst away from it, are free
 *     for a moment, then spring home, fading from the rating colours back to
 *     the text colour. When all of a letter's balls are home, the real letter
 *     fades back in and the balls fade out over the same 250ms.
 *   - A single fixed, pointer-events-none canvas draws everything, and the
 *     animation loop only runs while there are balls, so an idle page costs
 *     nothing.
 */

const PALETTE = ["#ff40d9", "#28ba60", "#c7bf2d", "#ff0000", "#7bbaff", "#9ccbff"];
const GAP = 2.4; // CSS px between samples: smaller means more balls
const RADIUS = 1.35;
const FREE_MS = [450, 1100]; // how long a ball flies before heading home
const SETTLE = 0.35; // px from home that counts as "landed"
const FADE_MS = 250;

type Ball = {
  x: number; y: number; vx: number; vy: number;
  hx: number; hy: number;
  colour: [number, number, number];
  freeUntil: number;
};

type Burst = {
  el: HTMLElement;
  balls: Ball[];
  home: [number, number, number];
  landedAt: number | null;
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function cssColourToRgb(css: string): [number, number, number] {
  const m = css.match(/\d+(\.\d+)?/g);
  return m && m.length >= 3 ? [Number(m[0]), Number(m[1]), Number(m[2])] : [17, 17, 17];
}

/** Opaque pixels of one rendered letter, as page-coordinate points. */
function sampleLetter(el: HTMLElement): [number, number][] {
  const rect = el.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return [];
  const style = getComputedStyle(el);
  const scale = 2; // sample at 2x for cleaner edges regardless of screen
  const c = document.createElement("canvas");
  c.width = Math.ceil(rect.width * scale);
  c.height = Math.ceil(rect.height * scale);
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.scale(scale, scale);
  ctx.font = style.font;
  ctx.fillStyle = "#000";
  ctx.textBaseline = "alphabetic";
  // An inline box's content area starts one font-ascent above the baseline,
  // which is what the span's rect measures.
  const ascent = ctx.measureText(el.textContent ?? "").fontBoundingBoxAscent || rect.height * 0.8;
  ctx.fillText(el.textContent ?? "", 0, ascent);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;

  const pts: [number, number][] = [];
  const left = rect.left + window.scrollX;
  const top = rect.top + window.scrollY;
  for (let y = 0; y < rect.height; y += GAP) {
    for (let x = 0; x < rect.width; x += GAP) {
      const i = (Math.floor(y * scale) * c.width + Math.floor(x * scale)) * 4 + 3;
      if (data[i] > 110) pts.push([left + x + (Math.random() - 0.5), top + y + (Math.random() - 0.5)]);
    }
  }
  return pts;
}

export function useShatterLetters(container: React.RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const root = container.current;
    if (!enabled || !root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "fixed", inset: "0", width: "100vw", height: "100vh",
      pointerEvents: "none", zIndex: "20",
    });
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d")!;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };
    resize();

    const letters = Array.from(root.querySelectorAll<HTMLElement>("[data-letter]"));
    const bursts = new Map<HTMLElement, Burst>();
    let raf = 0;
    let lastX = 0, lastY = 0, lastT = 0, pvx = 0, pvy = 0;
    let pointer: { x: number; y: number } | null = null; // page coords

    const shatter = (el: HTMLElement, px: number, py: number) => {
      if (bursts.has(el) || !el.textContent?.trim()) return;
      const pts = sampleLetter(el);
      if (pts.length === 0) return;
      const now = performance.now();
      const home = cssColourToRgb(getComputedStyle(el).color);
      const balls: Ball[] = pts.map(([hx, hy]) => {
        const dx = hx - px, dy = hy - py;
        const d = Math.hypot(dx, dy) || 1;
        const burst = 2 + Math.random() * 5;
        return {
          x: hx, y: hy, hx, hy,
          vx: (dx / d) * burst + pvx * 0.35 + (Math.random() - 0.5) * 3,
          vy: (dy / d) * burst + pvy * 0.35 + (Math.random() - 0.5) * 3 - 1.5,
          colour: hexToRgb(PALETTE[(Math.random() * PALETTE.length) | 0]),
          freeUntil: now + FREE_MS[0] + Math.random() * (FREE_MS[1] - FREE_MS[0]),
        };
      });
      el.style.transition = "none";
      el.style.opacity = "0";
      bursts.set(el, { el, balls, home, landedAt: null });
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMove = (clientX: number, clientY: number) => {
      const now = performance.now();
      const dt = Math.max(8, now - lastT);
      const recent = lastT && now - lastT < 120;
      // Trace the path since the last event, so a quick flick can't skip
      // straight over a letter between two pointer updates.
      const fromX = recent ? lastX : clientX, fromY = recent ? lastY : clientY;
      if (recent) {
        pvx = ((clientX - lastX) / dt) * 16;
        pvy = ((clientY - lastY) / dt) * 16;
      } else {
        pvx = pvy = 0;
      }
      lastX = clientX; lastY = clientY; lastT = now;
      pointer = { x: clientX + window.scrollX, y: clientY + window.scrollY };

      const steps = Math.max(1, Math.ceil(Math.hypot(clientX - fromX, clientY - fromY) / 6));
      const rects = letters.map((el) => el.getBoundingClientRect());
      for (let s = 1; s <= steps; s++) {
        const x = fromX + ((clientX - fromX) * s) / steps;
        const y = fromY + ((clientY - fromY) * s) / steps;
        letters.forEach((el, i) => {
          const r = rects[i];
          if (x >= r.left - 4 && x <= r.right + 4 && y >= r.top - 2 && y <= r.bottom + 2) {
            shatter(el, x + window.scrollX, y + window.scrollY);
          }
        });
      }
      if (bursts.size && !raf) raf = requestAnimationFrame(tick);
    };

    const onPointerMove = (e: PointerEvent) => onMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) onMove(t.clientX, t.clientY);
    };
    const onLeave = () => { pointer = null; };

    function tick(now: number) {
      raf = 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const sx = window.scrollX, sy = window.scrollY;

      for (const burst of bursts.values()) {
        let allHome = true;
        const fade = burst.landedAt ? Math.max(0, 1 - (now - burst.landedAt) / FADE_MS) : 1;

        for (const b of burst.balls) {
          // The cursor keeps batting balls around while they're out.
          if (pointer && !burst.landedAt) {
            const dx = b.x - pointer.x, dy = b.y - pointer.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 900 && d2 > 0.01) {
              const f = (1 - Math.sqrt(d2) / 30) * 1.6;
              const d = Math.sqrt(d2);
              b.vx += (dx / d) * f + pvx * 0.05;
              b.vy += (dy / d) * f + pvy * 0.05;
            }
          }

          if (now < b.freeUntil) {
            b.vy += 0.06; // a little float-down
            b.vx *= 0.97; b.vy *= 0.97;
          } else {
            b.vx += (b.hx - b.x) * 0.045;
            b.vy += (b.hy - b.y) * 0.045;
            b.vx *= 0.82; b.vy *= 0.82;
          }
          b.x += b.vx; b.y += b.vy;

          const away = Math.hypot(b.hx - b.x, b.hy - b.y);
          if (now < b.freeUntil || away > SETTLE || Math.abs(b.vx) + Math.abs(b.vy) > 0.2) allHome = false;
          if (now >= b.freeUntil && away < SETTLE * 3) { b.x = b.hx; b.y = b.hy; }
        }

        if (allHome && !burst.landedAt) {
          burst.landedAt = now;
          burst.el.style.transition = `opacity ${FADE_MS}ms ease`;
          burst.el.style.opacity = "1";
        }

        // Draw: colour eases to the text colour as each ball nears home.
        for (const b of burst.balls) {
          const away = Math.min(1, Math.hypot(b.hx - b.x, b.hy - b.y) / 40);
          const t = now < b.freeUntil ? 1 : away;
          const r = Math.round(burst.home[0] + (b.colour[0] - burst.home[0]) * t);
          const g = Math.round(burst.home[1] + (b.colour[1] - burst.home[1]) * t);
          const bl = Math.round(burst.home[2] + (b.colour[2] - burst.home[2]) * t);
          ctx.fillStyle = `rgba(${r},${g},${bl},${fade})`;
          ctx.beginPath();
          ctx.arc(b.x - sx, b.y - sy, RADIUS + t * 0.9, 0, Math.PI * 2);
          ctx.fill();
        }

        if (burst.landedAt && now - burst.landedAt > FADE_MS) bursts.delete(burst.el);
      }

      if (bursts.size) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", resize);
      for (const { el } of bursts.values()) {
        el.style.opacity = "";
        el.style.transition = "";
      }
      canvas.remove();
    };
  }, [container, enabled]);
}
