import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PlayIcon } from "@/components/icons";
import styles from "./explore.module.css";

const DEMO_EPISODE_HREF = "/podcast/modern-wisdom/episode/1109";
const DEMO_LIST_HREF = "/list/joe-rogan-mma-show";

const topPodcasts = [
  { id: "jre", title: "The Joe Rogan Experience", meta: "Comedy · Interview", tier: "highly", tierLabel: "Highly Recommend", score: 3.8, img: "/explore/joe-rogan.jpg" },
  { id: "shawn-ryan", title: "The Shawn Ryan Show", meta: "Interview · News", tier: "highly", tierLabel: "Highly Recommend", score: 3.9, img: "/explore/shawn-ryan.jpg" },
  { id: "crime-junkie", title: "Crime Junkie", meta: "True Crime", tier: "highly", tierLabel: "Highly Recommend", score: 3.7, img: "/explore/crime-junkie.jpg" },
  { id: "good-hang", title: "Good Hang with Amy Poehler", meta: "Comedy", tier: "recommend", tierLabel: "Recommend", score: 3.1, img: "/explore/good-hang-amy-poehler.jpg" },
  { id: "theo-von", title: "This Past Weekend w/ Theo Von", meta: "Comedy · Interview", tier: "highly", tierLabel: "Highly Recommend", score: 3.6, img: "/explore/theo-von.jpg" },
  { id: "the-daily", title: "The Daily", meta: "News", tier: "recommend", tierLabel: "Recommend", score: 3.0, img: "/explore/the-daily.jpg" },
  { id: "doac", title: "The Diary of a CEO", meta: "Business · Interview", tier: "recommend", tierLabel: "Recommend", score: 3.3, img: "/explore/diary-of-a-ceo.jpg" },
  { id: "matt-shane", title: "Matt & Shane's Secret Podcast", meta: "Comedy", tier: "highly", tierLabel: "Highly Recommend", score: 3.9, img: "/explore/matt-and-shane.jpg" },
];

const popularEpisodes = [
  { id: "e1", title: "Joe Rogan #2161 – Tony Hinchcliffe", date: "Jun 3, 2025", tier: "highly", tierLabel: "Highly Recommend", score: 3.9, img: "/explore/ep-joe-rogan-2161.jpg" },
  { id: "e2", title: "The Shawn Ryan Show #171", date: "Jun 1, 2025", tier: "highly", tierLabel: "Highly Recommend", score: 3.8, img: "/explore/ep-shawn-ryan-171.jpg" },
  { id: "e3", title: "Up First – NPR", date: "May 30, 2025", tier: "recommend", tierLabel: "Recommend", score: 3.0, img: "/explore/ep-up-first-npr.jpg" },
  { id: "e4", title: "The Shawn Ryan Show #170", date: "May 27, 2025", tier: "recommend", tierLabel: "Recommend", score: 3.2, img: "/explore/ep-shawn-ryan-170.jpg" },
  { id: "e5", title: "Murdered: Carmen Van Huss", date: "May 24, 2025", tier: "highly", tierLabel: "Highly Recommend", score: 3.7, img: "/explore/ep-murdered-carmen.jpg" },
  { id: "e6", title: "Teen Takeovers & Netanyahu's New Nightmare | The Tim Dillon Show", date: "May 22, 2025", tier: "recommend", tierLabel: "Recommend", score: 2.9, img: "/explore/ep-tim-dillon.jpg" },
  { id: "e7", title: "Joe Rogan #2521 – Aravind Srinivas", date: "May 20, 2025", tier: "recommend", tierLabel: "Recommend", score: 3.1, img: "/explore/ep-joe-rogan-2521.jpg" },
  { id: "e8", title: "Good Hang with Amy Poehler", date: "May 18, 2025", tier: "highly", tierLabel: "Highly Recommend", score: 3.6, img: "/explore/ep-good-hang.jpg" },
];

const trendingUsers = [
  { id: "tony-soprano", name: "Tony Soprano", followers: "89k followers", img: "/explore/trending-tony-soprano.webp" },
  { id: "alexander-knysh", name: "Alexander Knysh", followers: "50k followers", img: "/explore/trending-alexander-knysh.jpg" },
  { id: "chris-williamson", name: "Chris Williamson", followers: "70k followers", img: "/explore/trending-chris-williamson.jpg" },
  { id: "elizabeth", name: "Elizabeth", followers: "55k followers", img: "/explore/trending-elizabeth.jpg" },
  { id: "jay-shetty", name: "Jay Shetty", followers: "70k followers", img: "/explore/trending-jay-shetty.jpg" },
];

const popularLists = [
  { id: "l1", author: "Alexander Knysh", avatar: "https://picsum.photos/seed/av1/40/40", title: "Joe Rogan MMA show", more: 150, gallery: ["/explore/list-mma-1.jpg", "/explore/list-mma-2.jpg", "https://picsum.photos/seed/mma3/200/200"] },
  { id: "l2", author: "James", avatar: "https://picsum.photos/seed/av9/40/40", title: "Shane Gillis episodes", more: 40, gallery: ["/explore/list-gillis-1.jpg", "/explore/list-gillis-2.jpg", "/explore/list-gillis-3.jpg"] },
  { id: "l3", author: "Ryan Jones", avatar: "https://picsum.photos/seed/av10/40/40", title: "Watch to fix your sleep", more: 10, gallery: ["/explore/list-sleep-1.webp", "/explore/list-sleep-2.jpg", "/explore/list-sleep-3.jpg"] },
];

const curatedLists = [
  { id: "top-shows", title: "Top rated shows", img: "/explore/curated-top-rated-shows.jpg" },
  { id: "top-episodes", title: "Top rated episodes", img: "/explore/curated-top-rated-episodes.jpg" },
  { id: "most-popular", title: "Most popular shows", img: "/explore/curated-most-popular-shows.webp" },
];

export default function ExplorePage() {
  return (
    <>
      <SiteNav active="explore" />

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1>Discover more podcasts!</h1>
        </section>

        <section>
          <div className={styles.sectionHeaderRow}>
            <h2 className={styles.sectionTitle}>Top podcasts of today</h2>
            <a href="#" className={styles.seeFullLink}>
              See full list →
            </a>
          </div>
          <div className={styles.coverGrid}>
            {topPodcasts.map((p) => (
              <Link className={styles.coverCard} href={`/podcast/${p.id}`} key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt="Podcast cover" />
                <div className={styles.hoverCard}>
                  <div className={styles.hoverCardTitle}>{p.title}</div>
                  <div className={styles.hoverCardDate}>{p.meta}</div>
                  <div className={styles.hoverCardRating}>
                    <span className={styles.hoverCardScore}>{p.score.toFixed(1)}</span>
                    <span className={`${styles.hoverCardLabel} ${styles[p.tier]}`}>{p.tierLabel}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <hr className="divider" />

        <section>
          <div className={styles.sectionHeaderRow}>
            <h2 className={styles.sectionTitle}>Popular episodes</h2>
            <a href="#" className={styles.seeFullLink}>
              See full list →
            </a>
          </div>
          <div className={styles.episodeGrid}>
            {popularEpisodes.map((ep) => (
              <Link className={styles.episodeThumb} href={DEMO_EPISODE_HREF} key={ep.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ep.img} alt="Episode thumbnail" />
                <div className={styles.playOverlay}>
                  <PlayIcon />
                </div>
                <div className={styles.hoverCard}>
                  <div className={styles.hoverCardTitle}>{ep.title}</div>
                  <div className={styles.hoverCardDate}>{ep.date}</div>
                  <div className={styles.hoverCardRating}>
                    <span className={styles.hoverCardScore}>{ep.score.toFixed(1)}</span>
                    <span className={`${styles.hoverCardLabel} ${styles[ep.tier]}`}>{ep.tierLabel}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <hr className="divider" />

        <section>
          <div className={styles.sectionHeaderRow} style={{ marginBottom: 24 }}>
            <h2 className={styles.sectionTitle}>Trending users</h2>
            <a href="#" className={styles.seeFullLink}>
              See more →
            </a>
          </div>
          <div className={styles.trendingGrid}>
            {trendingUsers.map((u) => (
              <Link className={styles.trendingCard} href={`/user/${u.id}`} key={u.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.trendingAvatar} src={u.img} alt={u.name} />
                <span className={styles.trendingName}>{u.name}</span>
                <span className={styles.trendingFollowers}>{u.followers}</span>
              </Link>
            ))}
          </div>
        </section>

        <hr className="divider" />

        <section>
          <div className={styles.sectionHeaderRow} style={{ marginBottom: 24 }}>
            <h2 className={styles.sectionTitle}>Popular lists</h2>
            <a href="#" className={styles.seeFullLink}>
              See more →
            </a>
          </div>
          <div className={styles.listsGrid}>
            {popularLists.map((l) => (
              <Link className={styles.listCard} href={DEMO_LIST_HREF} key={l.id}>
                <div className={styles.listGallery}>
                  {l.gallery.map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={l.title} key={src} />
                  ))}
                  <span className={styles.listGalleryBadge}>+{l.more}</span>
                </div>
                <div className={styles.listMeta}>
                  <div className={styles.listAuthor}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className={styles.avatar} src={l.avatar} alt="" />
                    <span className={styles.reviewerName}>{l.author}</span>
                  </div>
                  <div className={styles.listTitle}>{l.title}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <hr className="divider" />

        <section>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 24 }}>
            Curated lists
          </h2>
          <div className={styles.curatedGrid}>
            {curatedLists.map((c) => (
              <div className={styles.curatedCard} key={c.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.img} alt={c.title} />
                <div className={styles.curatedOverlay}>
                  <span>{c.title}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
