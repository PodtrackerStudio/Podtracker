import Link from "next/link";
import type { RatingTierKey } from "@/lib/ratingTier";

type Rating = { score: number; tier: RatingTierKey; tierLabel: string };

export function MediaThumbCard({
  href,
  cover,
  title,
  subtitle,
  rating,
}: {
  href: string;
  cover: string;
  title: string;
  subtitle?: string;
  rating?: Rating;
}) {
  return (
    <Link className="media-thumb" href={href}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="media-thumb-cover" src={cover} alt={title} />
      <div className="media-thumb-popup">
        <div className="media-thumb-title">{title}</div>
        {subtitle && <div className="media-thumb-subtitle">{subtitle}</div>}
        {rating && (
          <div className="media-thumb-rating">
            <span className="media-thumb-score">{rating.score.toFixed(1)}</span>
            <span className={`media-thumb-tier media-thumb-tier-${rating.tier}`}>{rating.tierLabel}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
