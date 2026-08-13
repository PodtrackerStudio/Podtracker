import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { AppearancesGrid } from "./AppearancesGrid";
import styles from "./person.module.css";

type PersonData = {
  name: string;
  photo: string;
  bio: string;
  hostedShow: { title: string; cover: string; href: string } | null;
  appearances: { id: string; title: string; img: string; href: string; popularity: number; order: number }[];
};

const DEMO_EPISODE_HREF = "/podcast/modern-wisdom/episode/1109";

const people: Record<string, PersonData> = {
  "joe-rogan": {
    name: "Joe Rogan",
    photo: "https://picsum.photos/seed/joerogan/460/460",
    bio: "Joseph James Rogan Jr. (born August 11, 1967) is an American podcaster, sports commentator, comedian, actor, and former television host. He hosts The Joe Rogan Experience, which is one of the most popular podcasts in the world and has been the most streamed podcast on Spotify since 2020. Rogan was born in Newark, New Jersey, and began his career in comedy in 1988 in the Boston area. After relocating to Los Angeles in 1994, he signed an exclusive developmental deal with Disney and appeared as an actor on several television shows, including Hardball and NewsRadio. In 1997, he started working for the UFC as an interviewer and color commentator. He released his first comedy special, I'm Gonna Be Dead Someday..., in 2000 and hosted the game show Fear Factor from 2001 to 2006. After leaving Fear Factor, Rogan focused on his stand-up career and hosted more comedy specials. He launched The Joe Rogan Experience in 2009; by 2015, it was one of the most popular podcasts in the world, regularly receiving millions of plays per episode. Spotify obtained exclusive distribution rights to The Joe Rogan Experience in 2020 for $200 million. Rogan's audience has since grown significantly, and in 2024, he renewed his deal with Spotify for an estimated $250 million, but will no longer be exclusive to them.",
    hostedShow: { title: "The Joe Rogan Experience", cover: "/explore/joe-rogan.jpg", href: "/podcast/the-joe-rogan-experience" },
    appearances: [
      { id: "a1", title: "This Past Weekend #554 – Joe Rogan", img: "https://picsum.photos/seed/tpwjoe/480/320", href: DEMO_EPISODE_HREF, popularity: 88, order: 1 },
      { id: "a2", title: "KILL TONY – Joe Rogan & That Mexican OT", img: "https://picsum.photos/seed/killtonyjoe/480/320", href: DEMO_EPISODE_HREF, popularity: 95, order: 2 },
      { id: "a3", title: "Lex Fridman #300 – Joe Rogan Round 2", img: "https://picsum.photos/seed/lexjoe300/480/480", href: DEMO_EPISODE_HREF, popularity: 99, order: 3 },
    ],
  },
  "chris-williamson": {
    name: "Chris Williamson",
    photo: "https://picsum.photos/seed/chriswilliamson/460/460",
    bio: "Chris Williamson is a British podcaster and former club night promoter, best known as the host of Modern Wisdom, a podcast focused on self-improvement and conversations with leading thinkers across psychology, philosophy, health, and business.",
    hostedShow: { title: "Modern Wisdom", cover: "https://picsum.photos/seed/mwcover/460/460", href: "/podcast/modern-wisdom" },
    appearances: [
      { id: "a1", title: "The Diary of a CEO – Chris Williamson", img: "https://picsum.photos/seed/doacchris/480/320", href: DEMO_EPISODE_HREF, popularity: 70, order: 1 },
    ],
  },
  "ezra-klein": {
    name: "Ezra Klein",
    photo: "https://picsum.photos/seed/ezraklein/460/460",
    bio: "Ezra Klein is an American journalist, political analyst, and podcast host. He is a columnist for The New York Times and co-founder of Vox, known for his in-depth conversations on politics, media, and public policy.",
    hostedShow: { title: "The Ezra Klein Show", cover: "https://picsum.photos/seed/ezrashow/460/460", href: "/podcast/the-ezra-klein-show" },
    appearances: [
      { id: "a1", title: "Modern Wisdom – Inside Modern Politics", img: "https://picsum.photos/seed/mwezra/480/320", href: DEMO_EPISODE_HREF, popularity: 82, order: 1 },
    ],
  },
};

function getMockPerson(slug: string): PersonData {
  return (
    people[slug] ?? {
      name: slug
        .split("-")
        .map((w) => w[0]?.toUpperCase() + w.slice(1))
        .join(" "),
      photo: `https://picsum.photos/seed/${slug}/460/460`,
      bio: "No bio available yet for this person.",
      hostedShow: null,
      appearances: [],
    }
  );
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
