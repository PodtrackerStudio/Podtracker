import Image from "next/image";

/**
 * Artwork slot with a generated fallback.
 *
 * No podcast API is connected yet, and the Figma mockup uses real cover art
 * that should not be committed to the repo. Until `src` is supplied, this
 * renders a deterministic tile — same title always yields the same colours —
 * so the page reads as designed rather than as broken images.
 *
 * When the API lands, pass `src` and this component starts using it. Nothing
 * else has to change.
 */

/** Stable hue in [0, 360) derived from the title. */
function hueFromSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  }
  return hash;
}

/**
 * Up to two initials, skipping articles and any token that does not start with
 * a letter. Episode titles lead with a number ("#2535 - Andrew Wilson"), which
 * would otherwise produce "#A" instead of "AW".
 */
function initialsFromTitle(title: string): string {
  const words = title
    .split(/[\s\-–—]+/)
    .filter((w) => /^[a-z]/i.test(w))
    .filter((w) => !/^(the|a|an|of|and)$/i.test(w));

  if (words.length === 0) {
    return title.match(/[a-z0-9]/i)?.[0].toUpperCase() ?? "?";
  }

  return words
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

type ArtworkProps = {
  title: string;
  src?: string;
  /** Tailwind classes for sizing and shape; caller owns layout. */
  className?: string;
  /**
   * `tile` shows initials, `avatar` is a circular crop, `plain` is a bare
   * swatch — used where several tiles overlap in a collage and repeating the
   * same initials would look like a rendering bug.
   */
  variant?: "tile" | "avatar" | "plain";
};

export function Artwork({
  title,
  src,
  className = "",
  variant = "tile",
}: ArtworkProps) {
  const hue = hueFromSeed(title);
  const rounded = variant === "avatar" ? "rounded-full" : "rounded-md";

  if (src) {
    return (
      <div className={`relative overflow-hidden ${rounded} ${className}`}>
        <Image src={src} alt={title} fill className="object-cover" />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={title}
      className={`flex items-center justify-center overflow-hidden ${rounded} ${className}`}
      style={{
        backgroundImage: `linear-gradient(135deg, hsl(${hue} 42% 66%), hsl(${
          (hue + 45) % 360
        } 38% 44%))`,
      }}
    >
      {variant === "tile" && (
        <span className="font-serif text-2xl font-semibold text-white/90 select-none">
          {initialsFromTitle(title)}
        </span>
      )}
    </div>
  );
}
