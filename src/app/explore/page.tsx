import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PlayIcon } from "@/components/icons";
import { HAS_COMMUNITY_DATA } from "@/lib/community";
import { getTrendingEpisodes } from "@/lib/trendingEpisodes";
import { getPopularPodcasts } from "@/lib/popularPodcasts";
import styles from "./explore.module.css";

// The Popular lists cards are mock rows with no real list behind them, so
// they have nowhere to go — /list/[id] renders real lists only now. They sit
// behind HAS_COMMUNITY_DATA and get real hrefs when real lists rank here.
const DEMO_LIST_HREF = "#";


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

export default async function ExplorePage() {
  // Both from Apple's charts — real popularity, replacing hardcoded lists.
  // Fetched together: the episode chart resolves feeds, so it's the slower one.
  const [topPodcasts, trendingEpisodes] = await Promise.all([getPopularPodcasts(8), getTrendingEpisodes(8)]);

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
            <Link href="/explore/top-podcasts" className={styles.seeFullLink}>
              See full list →
            </Link>
          </div>
          <div className={styles.coverGrid}>
            {topPodcasts.map((p) => (
              <Link className={styles.coverCard} href={`/podcast/${p.id}`} key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.artworkUrl} alt="Podcast cover" />
                <div className={styles.hoverCard}>
                  <div className={styles.hoverCardTitle}>{p.title}</div>
                  <div className={styles.hoverCardDate}>{p.artistName}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <hr className="divider" />

        <section>
          <div className={styles.sectionHeaderRow}>
            <h2 className={styles.sectionTitle}>Popular episodes</h2>
            <Link href="/explore/trending-episodes" className={styles.seeFullLink}>
              See full list →
            </Link>
          </div>
          <div className={styles.episodeGrid}>
            {trendingEpisodes.map((ep) => (
              <Link className={styles.episodeThumb} href={ep.href} key={ep.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ep.artworkUrl} alt="Episode thumbnail" />
                <div className={styles.playOverlay}>
                  <PlayIcon />
                </div>
                <div className={styles.hoverCard}>
                  <div className={styles.hoverCardTitle}>{ep.title}</div>
                  {/* The show name, not a date — the chart carries no date. */}
                  <div className={styles.hoverCardDate}>{ep.showName}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Trending users, Popular lists and Curated lists all rank things that
            only exist once people are using the site — followers, user-made
            lists, top-rated shows. The page stops after Popular episodes until
            then, matching Sasha's no-users frame. */}
        {HAS_COMMUNITY_DATA && (
          <>
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
          </>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
