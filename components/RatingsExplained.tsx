import { RATINGS } from "@/lib/ratings";
import { SectionHeading } from "./SectionHeading";

/** Frame 4, upper half: the pitch for the recommendation scale. */
export function RatingsExplained() {
  return (
    <section className="px-6 py-16">
      <SectionHeading>Ratings explained</SectionHeading>

      <p className="mx-auto mt-10 max-w-xl text-lg leading-relaxed">
        Instead of a 5 star rating scale, Podtracker offers a unique rating
        system, using five distinct categories. Each show and episode will
        receive an average rating based on user responses.
      </p>

      <ul className="mt-10 flex flex-col items-center gap-4">
        {RATINGS.map((rating) => (
          <li
            key={rating.id}
            className={`font-sans text-2xl font-black tracking-tight ${rating.className}`}
          >
            {rating.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
