import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { AppearancesGrid } from "./AppearancesGrid";
import { getCreator } from "@/lib/creators";
import styles from "./person.module.css";

type PersonData = {
  name: string;
  photo: string;
  bio: string;
  hostedShow: { title: string; cover: string; href: string } | null;
  appearances: { id: string; title: string; img: string; href: string; popularity: number; order: number }[];
};

const DEMO_EPISODE_HREF = "/podcast/modern-wisdom/episode/1109";

/**
 * Guest appearances are community data — which episodes of other shows someone
 * turned up on. No public API gives us that, so it stays mock here, keyed by
 * creator slug, exactly as `community` stays page-level on the podcast page.
 *
 * The person themselves — name, photo, bio, hosted show — comes from the shared
 * creator registry in `src/lib/creators.ts`, so a creator added there appears
 * both here and in the Creators strip on the podcast page.
 */
const appearancesBySlug: Record<string, PersonData["appearances"]> = {
  "joe-rogan": [
    { id: "a1", title: "This Past Weekend #554 – Joe Rogan", img: "https://picsum.photos/seed/tpwjoe/480/320", href: DEMO_EPISODE_HREF, popularity: 88, order: 1 },
    { id: "a2", title: "KILL TONY – Joe Rogan & That Mexican OT", img: "https://picsum.photos/seed/killtonyjoe/480/320", href: DEMO_EPISODE_HREF, popularity: 95, order: 2 },
    { id: "a3", title: "Lex Fridman #300 – Joe Rogan Round 2", img: "https://picsum.photos/seed/lexjoe300/480/480", href: DEMO_EPISODE_HREF, popularity: 99, order: 3 },
  ],
  "chris-williamson": [
    { id: "a1", title: "The Diary of a CEO – Chris Williamson", img: "https://picsum.photos/seed/doacchris/480/320", href: DEMO_EPISODE_HREF, popularity: 70, order: 1 },
  ],
  "ezra-klein": [
    { id: "a1", title: "Modern Wisdom – Inside Modern Politics", img: "https://picsum.photos/seed/mwezra/480/320", href: DEMO_EPISODE_HREF, popularity: 82, order: 1 },
  ],
};

function getMockPerson(slug: string): PersonData {
  const creator = getCreator(slug);
  if (creator) {
    return {
      name: creator.name,
      photo: creator.avatarUrl,
      bio: creator.bio,
      hostedShow: creator.hostedShow,
      appearances: appearancesBySlug[slug] ?? [],
    };
  }

  // Unknown slug: title-case it back into a name so the page still renders
  // something sensible rather than 404ing.
  return {
    name: slug
      .split("-")
      .map((w) => w[0]?.toUpperCase() + w.slice(1))
      .join(" "),
    photo: `https://picsum.photos/seed/${slug}/460/460`,
    bio: "No bio available yet for this person.",
    hostedShow: null,
    appearances: [],
  };
}

export default async function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const person = getMockPerson(slug);

  return (
    <>
      <SiteNav />

      <main className={styles.main}>
        <div className={styles.layout}>
          <div className={styles.left}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.photo} src={person.photo} alt={person.name} />
            <p className={styles.bio}>{person.bio}</p>
          </div>

          <div className={styles.right}>
            <h1 className={styles.name}>{person.name}</h1>

            {person.hostedShow && (
              <>
                <div className={styles.hostedShowLabel}>Hosted show</div>
                <Link className={styles.hostedShowLink} href={person.hostedShow.href}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.hostedShowCover} src={person.hostedShow.cover} alt={person.hostedShow.title} />
                </Link>
              </>
            )}

            {person.appearances.length > 0 && <AppearancesGrid appearances={person.appearances} />}
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
