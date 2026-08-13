import Link from "next/link";
import { Artwork } from "./Artwork";
import type { EpisodeList } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";

/** Frame 5: user-built collections, shown as a fanned artwork collage. */
export function PopularLists({ lists }: { lists: EpisodeList[] }) {
  return (
    <section className="px-6 py-16">
      <SectionHeading>Popular Lists</SectionHeading>

      <ul className="mx-auto mt-12 grid max-w-5xl gap-x-12 gap-y-12 sm:grid-cols-2">
        {lists.map((list) => (
          <li key={list.id} className="flex items-center gap-6">
            <Link
              href={`/list/${list.id}`}
              className="flex shrink-0"
              aria-label={list.title}
            >
              {list.episodeArtwork.map((art, index) => (
                <Artwork
                  key={index}
                  title={`${list.title} ${index}`}
                  src={art}
                  variant="plain"
                  className={`size-20 ring-2 ring-canvas ${
                    index > 0 ? "-ml-6" : ""
                  }`}
                />
              ))}
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Artwork
                  title={list.author.name}
                  src={list.author.avatarUrl}
                  variant="avatar"
                  className="size-7 shrink-0"
                />
                <span className="text-sm text-ink-muted">
                  {list.author.name}
                </span>
              </div>
              <h3 className="mt-1 text-xl">
                <Link href={`/list/${list.id}`} className="hover:underline">
                  {list.title}
                </Link>
              </h3>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
