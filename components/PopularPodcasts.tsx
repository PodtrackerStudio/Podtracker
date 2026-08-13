import Link from "next/link";
import { Artwork } from "./Artwork";
import type { Podcast } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";

/** Frame 1, lower half: the 4x2 grid of trending shows. */
export function PopularPodcasts({ podcasts }: { podcasts: Podcast[] }) {
  return (
    <section className="px-6 py-10">
      <SectionHeading>Popular podcasts</SectionHeading>

      <ul className="mx-auto mt-10 grid max-w-6xl grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {podcasts.map((podcast) => (
          <li key={podcast.id}>
            <Link
              href={`/podcast/${podcast.id}`}
              className="group block focus-visible:outline-none"
            >
              <Artwork
                title={podcast.title}
                src={podcast.artworkUrl}
                className="aspect-square w-full transition-transform group-hover:scale-[1.03] group-focus-visible:ring-2 group-focus-visible:ring-accent"
              />
              <p className="mt-3 text-sm font-medium group-hover:underline">
                {podcast.title}
              </p>
              {podcast.publisher && (
                <p className="text-xs text-ink-muted">{podcast.publisher}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
