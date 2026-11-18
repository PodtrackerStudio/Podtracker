/**
 * Apple cover art at the size it will be shown.
 *
 * Apple's image URLs end in a size — `…/600x600bb.jpg` — and the CDN will
 * serve any size asked for. Everything was requested at 600px, including the
 * 44px thumbnails in the search dropdown and the hundred covers on the full
 * chart pages, so a phone downloaded megabytes of pixels it then threw away.
 *
 * `size` is the CSS size times two (for high-density screens), rounded up to
 * a few standard steps so the CDN and the browser cache see the same handful
 * of URLs rather than one per layout.
 *
 * Anything that is not an Apple artwork URL — a feed's own episode image, a
 * placeholder — is returned untouched.
 */
const STEPS = [100, 200, 300, 600];

export function artworkAt(url: string | null | undefined, cssPixels: number): string {
  if (!url) return url ?? "";
  if (!/^https:\/\/[a-z0-9-]+\.mzstatic\.com\//i.test(url)) return url;
  const wanted = cssPixels * 2;
  const size = STEPS.find((s) => s >= wanted) ?? STEPS[STEPS.length - 1];
  return url.replace(/\/\d+x\d+(bb)?(-\d+)?\.(jpg|jpeg|png|webp)$/i, `/${size}x${size}bb.$3`);
}
