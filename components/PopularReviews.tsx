import Link from "next/link";
import { Artwork } from "./Artwork";
import { RATING_BY_ID } from "@/lib/ratings";
import type { Review } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";

/** Frames 4-5: reviews from the wider community. */
export function PopularReviews({ reviews }: { reviews: Review[] }) {
  return (
    <section className="px-6 py-16">
      <SectionHeading>Popular reviews</SectionHeading>

      <ul className="mx-auto mt-10 grid max-w-5xl gap-x-12 gap-y-10 sm:grid-cols-2">
        {reviews.map((review) => (
          <li key={review.id}>
            <ReviewCard review={review} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const rating = review.rating ? RATING_BY_ID[review.rating] : undefined;

  return (
    <article className="flex gap-4">
      <Artwork
        title={review.episode.title}
        src={review.episode.artworkUrl}
        className="size-24 shrink-0"
      />

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Artwork
            title={review.author.name}
            src={review.author.avatarUrl}
            variant="avatar"
            className="size-7 shrink-0"
          />
          <span className="text-sm text-ink-muted">{review.author.name}</span>
        </div>

        <h3 className="mt-1 text-xl">
          <Link
            href={`/episode/${review.episode.id}`}
            className="hover:underline"
          >
            {review.episode.title}
          </Link>
        </h3>
        <p className="text-sm text-ink-muted">{review.episode.podcastTitle}</p>

        {rating && (
          <p className={`mt-2 text-sm font-black ${rating.className}`}>
            {rating.label}
          </p>
        )}

        {/* The mockup truncates the body and offers a MORE affordance. */}
        <p className="mt-2 line-clamp-6 text-sm leading-snug">{review.body}</p>
        <Link
          href={`/episode/${review.episode.id}`}
          className="text-sm text-ink-muted uppercase hover:underline"
        >
          More
        </Link>
      </div>
    </article>
  );
}
