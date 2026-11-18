/**
 * Cover art at the size it will be shown, in a modern format.
 *
 * **Images were 75–80% of every page's download** (Lighthouse on the live
 * site, 2026-11-18: 1.3–1.5 MB of ~1.7 MB). Everything was requested at
 * 600px, as whatever format the publisher uploaded. One cover on the landing
 * page was a 399 KB PNG; the same image as 600px WebP is 22 KB, and at 300px
 * it is 9 KB.
 *
 * Two image servers will resize on request, and this asks them to:
 *
 *   - **Apple (`*.mzstatic.com`)** — the size and format are the last path
 *     segment, `…/600x600bb.png`. Rewritten to the wanted size and `.webp`.
 *   - **imgix (`*.imgix.net`)** — where several large podcast hosts
 *     (Megaphone among them) keep episode art. Takes `w`/`h` query
 *     parameters. Left alone if the URL is signed (`s=`), since changing a
 *     signed URL breaks it.
 *
 * Anything else — a feed's image on an unknown host, a local placeholder, an
 * avatar — is returned untouched.
 *
 * `cssPixels` is the size on screen. It is doubled for high-density screens
 * and rounded up to a few standard steps, so the image servers and the
 * browser cache see a handful of URLs rather than one per layout.
 */
const STEPS = [100, 200, 300, 600];

export function artworkAt(url: string | null | undefined, cssPixels: number): string {
  if (!url) return url ?? "";
  const wanted = cssPixels * 2;
  const size = STEPS.find((s) => s >= wanted) ?? STEPS[STEPS.length - 1];

  if (/^https:\/\/[a-z0-9-]+\.mzstatic\.com\//i.test(url)) {
    return url.replace(/\/\d+x\d+(bb)?(-\d+)?\.(jpg|jpeg|png|webp)$/i, `/${size}x${size}bb.webp`);
  }

  if (/^https:\/\/[a-z0-9-]+\.imgix\.net\//i.test(url)) {
    try {
      const u = new URL(url);
      if (u.searchParams.has("s")) return url;
      u.searchParams.set("w", String(size));
      u.searchParams.set("h", String(size));
      u.searchParams.set("fit", "crop");
      u.searchParams.set("auto", "format,compress");
      return u.toString();
    } catch {
      return url;
    }
  }

  return url;
}
