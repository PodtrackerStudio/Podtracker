import { redirect } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PlayIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HAS_COMMUNITY_DATA } from "@/lib/community";
import styles from "./home.module.css";

// Same escape hatch the profile page uses: `sasha` always sees the fully
// populated design so it stays viewable while the feed still runs on mock data.
const DEMO_USERNAME = "sasha";

const newEpisodes = [
  { id: "ep1", title: "Joe Rogan #2002 – Bill Burr", date: "May 28, 2025", score: "3.7", tier: "recommend", tierLabel: "Recommend", img: "https://picsum.photos/seed/ep1/480/270" },
  { id: "ep2", title: "This Past Weekend #651 – Ella Langley", date: "May 22, 2025", score: "3.9", tier: "highly", tierLabel: "Highly Recommend", img: "https://picsum.photos/seed/ep2/480/270" },
  { id: "ep3", title: "Huberman Lab – Build a Resilient Body", date: "May 19, 2025", score: "2.8", tier: "ok", tierLabel: "OK", img: "https://picsum.photos/seed/ep3/480/270" },
  { id: "ep4", title: "Bill Simmons Podcast – NBA Power Poll", date: "May 15, 2025", score: "3.2", tier: "recommend", tierLabel: "Recommend", img: "https://picsum.photos/seed/ep4/480/270" },
  { id: "ep5", title: "Lex Fridman #494 – Jensen Huang", date: "May 10, 2025", score: "3.8", tier: "highly", tierLabel: "Highly Recommend", img: "https://picsum.photos/seed/ep5/480/270" },
  { id: "ep6", title: "FLAGRANT – Episode 312", date: "May 7, 2025", score: "1.8", tier: "dont", tierLabel: "Don't Recommend", img: "https://picsum.photos/seed/ep6/480/270" },
];

const friendReviews = [
  { id: "rev1", thumb: "https://picsum.photos/seed/rev1/160/160", avatar: "https://picsum.photos/seed/av1/40/40", name: "Alexander Knysh", tier: "dont", tierLabel: "Don't recommend", episode: "Joe Rogan #1842", text: "Could've been more entertaining if it wasn't bogged down by constant references to MMA for no apparent reason. Joe Rogan can't spend more than an episode without constant mentions of UFC. However, conversations relating to films were actually entertaining to listen to and showed some insight regarding the film industry…" },
  { id: "rev2", thumb: "https://picsum.photos/seed/rev2/160/160", avatar: "https://picsum.photos/seed/av2/40/40", name: "Phillip Neiman", tier: "highly", tierLabel: "Highly Recommend", episode: "Rick Beato #492 – Lex Fridman", text: "This was a great and super informative episode that was both an enjoyable and chill conversation as well as a somewhat informative explanation of different elements of music, all naturally interwoven between each other. In terms of pure value, this one can be a bit lacking but overall…" },
  { id: "rev3", thumb: "https://picsum.photos/seed/rev3/160/160", avatar: "https://picsum.photos/seed/av3/40/40", name: "Walter White", tier: "dont", tierLabel: "Don't recommend", episode: "Piers Morgan Uncensored", text: "This episode is complete nonsense! Me and Jesse could've recorded a better episode in a week!" },
  { id: "rev4", thumb: "https://picsum.photos/seed/rev4/160/160", avatar: "https://picsum.photos/seed/av4/40/40", name: "Knicksfan1988", tier: "recommend", tierLabel: "Recommend", episode: "Shockingly Good – Bill Simmons", text: "Bill Simmons is a smart commentator, but I have to say without bias that he's slightly underrating the Knicks. They'll tear Wemby apart and we'll finally have our victory! However I think he has some good takes in this episode regarding some of our weaknesses…" },
];

const friendLists = [
  { id: "list1", author: "Alexander Knysh", avatar: "https://picsum.photos/seed/av1/40/40", title: "Joe Rogan UFC episodes", more: 14, gallery: ["https://picsum.photos/seed/list1a/120/120", "https://picsum.photos/seed/list1b/120/120", "https://picsum.photos/seed/list1c/120/120"] },
  { id: "list2", author: "Phillip Neiman", avatar: "https://picsum.photos/seed/av2/40/40", title: "Joe Rogan + Theo Von", more: 8, gallery: ["https://picsum.photos/seed/list2a/120/120", "https://picsum.photos/seed/list2b/120/120", "https://picsum.photos/seed/list2c/120/120"] },
];

const popularReviews = [
  { id: "pop1", thumb: "https://picsum.photos/seed/pop1/160/160", avatar: "https://picsum.photos/seed/av5/40/40", name: "JohnJam", tier: "highly", tierLabel: "Highly Recommend", episode: "How to Deal with Loneliness", text: "Taught me how to be a sigma in a single hour. Listen to this podcast!" },
  { id: "pop2", thumb: "https://picsum.photos/seed/pop2/160/160", avatar: "https://picsum.photos/seed/av6/40/40", name: "Peter Prokhorov", tier: "recommend", tierLabel: "Recommend", episode: "Whistleblower CIA – Tucker Carlson", text: "Even if the Tucker Carlson show is clearly biased, listening to John speak on a lot of interesting things is still worth it. While it won't offer the most unbiased take, it will certainly provide an informative one…" },
  { id: "pop3", thumb: "https://picsum.photos/seed/pop3/160/160", avatar: "https://picsum.photos/seed/av3/40/40", name: "Walter White", tier: "dont", tierLabel: "Don't Recommend", episode: "Piers Morgan Uncensored", text: "This episode is complete nonsense! Me and Jesse could've recorded a better episode in a week!" },
  { id: "pop4", thumb: "https://picsum.photos/seed/pop4/160/160", avatar: "https://picsum.photos/seed/av4/40/40", name: "Knicksfan1988", tier: "recommend", tierLabel: "Recommend", episode: "Shockingly Good – Bill Simmons", text: "Bill Simmons is a smart commentator, but I have to say without bias that he's slightly underrating the Knicks. They'll tear Wemby apart and we'll finally have our victory! However I think he has some good takes in this episode regarding some of our weaknesses…" },
];

const popularLists = [
  { id: "plist1", author: "William Singh", avatar: "https://picsum.photos/seed/av7/40/40", title: "Israel–Palestine debates", more: 62, gallery: ["https://picsum.photos/seed/plist1a/144/144", "https://picsum.photos/seed/plist1b/144/144", "https://picsum.photos/seed/plist1c/144/144"] },
  { id: "plist2", author: "Donny", avatar: "https://picsum.photos/seed/av8/40/40", title: "Shane Gillis best appearances", more: 21, gallery: ["https://picsum.photos/seed/plist2a/144/144", "https://picsum.photos/seed/plist2b/144/144", "https://picsum.photos/seed/plist2c/144/144"] },
];

const DEMO_EPISODE_HREF = "/podcast/modern-wisdom/episode/1109";

function ReviewCard({ r, styles }: { r: (typeof friendReviews)[number]; styles: Record<string, string> }) {
  return (
    <div className={styles.reviewCard}>
      {/* `media-thumb` supplies the shared hover-popup behaviour — since the
          card no longer prints the podcast/episode name, hovering the artwork
          is the only way to read it. */}
      <Link className="media-thumb" href={DEMO_EPISODE_HREF}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.reviewThumb} src={r.thumb} alt={r.episode} />
        <div className="media-thumb-popup">
          <div className="media-thumb-title">{r.episode}</div>
        </div>
      </Link>
      <div>
        <div className={styles.reviewHeader}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.avatar} src={r.avatar} alt="" />
          <span className={styles.reviewerName}>{r.name}</span>
        </div>
        <span className={`${styles.ratingTag} ${styles[r.tier]}`}>{r.tierLabel}</span>
        {/* The podcast/episode name is intentionally omitted — it's reachable by
            hovering the artwork thumbnail instead. */}
        <p className={styles.reviewText}>{r.text}</p>
        <Link href="/review/matt-shane-393" className={styles.moreLink}>
          MORE
        </Link>
      </div>
    </div>
  );
}

function ListCard({ list, styles }: { list: (typeof friendLists)[number]; styles: Record<string, string> }) {
  return (
    <Link className={styles.listCard} href="/list/joe-rogan-mma-show">
      <div className={styles.listGallery}>
        {list.gallery.map((src) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.listGalleryImg} src={src} alt="" key={src} />
        ))}
        <div className={styles.listGalleryMore}>+{list.more}</div>
      </div>
      <div>
        <div className={styles.listAuthor}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.avatar} src={list.avatar} alt="" />
          <span className={styles.reviewerName}>{list.author}</span>
        </div>
        <div className={styles.listTitle}>{list.title}</div>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // A brand-new account follows nothing, so there are no uploads to show yet —
  // it gets the empty-state hero and nothing below it.
  const followCount = await db.podcastFollow.count({ where: { userId: user.id } });
  const hasFeed = followCount > 0 || user.username === DEMO_USERNAME;

  if (!hasFeed) {
    return (
      <>
        <SiteNav active="home" />
        <main className={styles.main}>
          <section className={styles.hero}>
            <h1>Good to see you, {user.displayName}!</h1>
            <p>Add favorites in the following section…</p>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteNav active="home" />

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1>Good to see you, {user.displayName}!</h1>
          <p>Here are new uploads from your favorite Podcasts…</p>
        </section>

        <section>
          <div className={styles.episodeGrid}>
            {newEpisodes.map((ep) => (
              <Link className={styles.episodeThumb} href={DEMO_EPISODE_HREF} key={ep.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ep.img} alt="Episode thumbnail" />
                <div className={styles.playOverlay}>
                  <PlayIcon />
                </div>
                <div className={styles.hoverCard}>
                  <div className={styles.hoverCardTitle}>{ep.title}</div>
                  <div className={styles.hoverCardDate}>{ep.date}</div>
                  {HAS_COMMUNITY_DATA && (
                    <div className={styles.hoverCardRating}>
                      <span className={styles.hoverCardScore}>{ep.score}</span>
                      <span className={`${styles.hoverCardLabel} ${styles[ep.tier]}`}>{ep.tierLabel}</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
          <div className={styles.nextPageRow}>
            <button className={styles.btnGhost}>Next page →</button>
          </div>
        </section>

        <hr className="divider" />

        <section>
          <h2 className={styles.sectionTitle}>Recent activity from friends</h2>

          <h3 className={styles.subsectionTitle}>New reviews</h3>
          <div className={styles.reviewsGrid}>
            {friendReviews.map((r) => (
              <ReviewCard r={r} styles={styles} key={r.id} />
            ))}
          </div>
          <div className={styles.seeMoreRow}>
            <button className={styles.btnSeeMore}>See more</button>
          </div>

          <h3 className={styles.subsectionTitle} style={{ marginTop: 40 }}>
            New lists from friends
          </h3>
          <div className={styles.listsGrid}>
            {friendLists.map((l) => (
              <ListCard list={l} styles={styles} key={l.id} />
            ))}
          </div>
          <div className={styles.seeMoreRow}>
            <button className={styles.btnSeeMore}>See more</button>
          </div>
        </section>

        <hr className="divider" />

        <section>
          <h2 className={styles.sectionTitle}>Popular reviews</h2>
          <div className={styles.reviewsGrid} style={{ marginTop: 24 }}>
            {popularReviews.map((r) => (
              <ReviewCard r={r} styles={styles} key={r.id} />
            ))}
          </div>
          <div className={styles.seeMoreRow}>
            <button className={styles.btnSeeMore}>See more</button>
          </div>
        </section>

        <hr className="divider" />

        <section>
          <h2 className={styles.sectionTitle}>Popular Lists</h2>
          <div className={styles.popularListsGrid} style={{ marginTop: 24 }}>
            {popularLists.map((l) => (
              <ListCard list={l} styles={styles} key={l.id} />
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
