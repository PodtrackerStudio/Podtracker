import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { SpotifyIcon, YouTubeIcon, ApplePodcastsIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon, MicIcon } from "@/components/icons";
import { RatingWidget } from "@/components/RatingWidget";
import { ReviewWidget } from "@/components/ReviewWidget";
import { HAS_COMMUNITY_DATA } from "@/lib/community";
import styles from "./episode.module.css";

// Mock data standing in for the database + Podcast Index lookup until those are wired up.
function getMockEpisode(podcastId: string, epId: string) {
  return {
    id: epId,
    podcastId,
    podcastTitle: "Modern Wisdom",
    title: `Inside Modern Politics – Ezra Klein #${epId}`,
    date: "June 1, 2026",
    duration: "2h 14m",
    coverUrl: "https://picsum.photos/seed/epcover/300/300",
    description:
      "Chris Williamson sits down with Ezra Klein — journalist, author, and co-founder of Vox — to dig into the state of modern politics, the Democratic Party's identity crisis, media polarization, and what it actually takes to change someone's mind. One of the most substantive political conversations Chris has had on the show.",
    avgScore: "3.8",
    distribution: [
      { tier: "highly", label: "Highly Recommend", pct: 48, count: 284 },
      { tier: "recommend", label: "Recommend", pct: 30, count: 177 },
      { tier: "ok", label: "OK", pct: 12, count: 71 },
      { tier: "dont", label: "Don't Recommend", pct: 7, count: 41 },
      { tier: "didnt", label: "Didn't Finish", pct: 3, count: 18 },
    ],
  };
}

const reviews = [
  { id: "r1", avatar: "https://picsum.photos/seed/av5/88/88", name: "JohnJam", tier: "recommend", tierLabel: "Recommend", date: "6/24/2026", text: "Excellent podcast, features many interesting guests and appearances. Chris is highly talented and really interesting to listen to. Ezra Klein brought a lot of nuance to the political discussion that you rarely hear…" },
  { id: "r2", avatar: "https://picsum.photos/seed/vitoc/88/88", name: "Vito Corleone", tier: "ok", tierLabel: "OK", date: "7/1/2026", text: "Excellent podcast, features many interesting guests and appearances. Chris is highly talented and really interesting to listen to. This particular episode felt a little long in the middle section but picked up toward the end…" },
  { id: "r3", avatar: "https://picsum.photos/seed/av2/88/88", name: "Phillip Neiman", tier: "highly", tierLabel: "Highly Recommend", date: "6/28/2026", text: "One of the best political episodes I've heard all year. Ezra Klein is a rare guest who can go deep without losing the thread. Chris pushed back at exactly the right moments…" },
];

const lists = [
  { id: "l1", avatar: "https://picsum.photos/seed/danielocean/80/80", title: "Modern Wisdom (all episodes)", author: "Daniel Ocean", more: 42, gallery: ["https://picsum.photos/seed/listep1/80/80", "https://picsum.photos/seed/listep2/80/80", "https://picsum.photos/seed/epcover/80/80"] },
  { id: "l2", avatar: "https://picsum.photos/seed/rowan/80/80", title: "Ezra Klein appearances", author: "Rowan", more: 5, gallery: ["https://picsum.photos/seed/epcover/80/80", "https://picsum.photos/seed/listep1/80/80", "https://picsum.photos/seed/listep2/80/80"] },
  { id: "l3", avatar: "https://picsum.photos/seed/laimerkor/80/80", title: "Episodes I listened this week", author: "LaimerKor", more: 3, gallery: ["https://picsum.photos/seed/listep1/80/80", "https://picsum.photos/seed/listep2/80/80", "https://picsum.photos/seed/epcover/80/80"] },
];

const featuredPeople = [
  { id: "chris", slug: "chris-williamson", name: "Chris Williamson", role: "Host", avatar: "https://picsum.photos/seed/chriswilliamson/120/120" },
  { id: "ezra", slug: "ezra-klein", name: "Ezra Klein", role: "Guest", avatar: "https://picsum.photos/seed/ezraklein/120/120" },
];

// `HAS_COMMUNITY_DATA` (imported above) renders Sasha's no-users episode design
// when false — the right-hand Figma frame — and the with-users one when true.

export default async function EpisodePage({ params }: { params: Promise<{ id: string; epId: string }> }) {
  const { id, epId } = await params;
  const episode = getMockEpisode(id, epId);

  return (
    <>
      <SiteNav />

      {/* No banner on episode pages — Sasha's call (2026-08-17): podcasts aren't
          as visual as films or shows, and it read as clunky. The old one was
          `height: 100vh`, which pushed the title entirely below the fold. */}

      <main className={styles.main}>
        <section className={styles.episodeInfoRow}>
          <div className={styles.episodeLeft}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.episodeCover} src={episode.coverUrl} alt="Episode cover" />
            {HAS_COMMUNITY_DATA && (
              <>
                <div className={styles.avgMic}>
                  <MicIcon />
                </div>
                <div className={styles.scoreDisplay}>{episode.avgScore}</div>
                <div className={styles.avgLabel}>Average rating</div>

                <div className={styles.distSection}>
                  <div className={styles.distSectionTitle}>Ratings distribution</div>
                  {episode.distribution.map((d) => (
                    <div className={styles.distRow} key={d.tier}>
                      <div className={styles.distTrack}>
                        <div className={`${styles.distFill} ${styles[d.tier]}`} style={{ width: `${d.pct}%` }} />
                        <span className={styles.distTooltip}>{d.count} ratings</span>
                      </div>
                      <span className={`${styles.distLabelText} ${styles[d.tier]}`}>{d.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div>
            <Link className={styles.episodePodcastLink} href={`/podcast/${episode.podcastId}`}>
              ← {episode.podcastTitle}
            </Link>
            <h1 className={styles.episodeTitle}>{episode.title}</h1>
            <div className={styles.episodeMeta}>
              <span>{episode.date}</span>
              <span>·</span>
              <span>{episode.duration}</span>
              <span>·</span>
              <span>Episode {epId}</span>
            </div>

            <div className={styles.descListenRow}>
              <p className={styles.episodeDesc}>{episode.description}</p>
              <div className={styles.whereToListen}>
                <div className={styles.whereLabel}>Where to listen</div>
                <div className={styles.listenCubby}>
                  <a className={styles.listenItem} href="#">
                    <SpotifyIcon />
                    Spotify
                  </a>
                  <a className={styles.listenItem} href="#">
                    <YouTubeIcon />
                    YouTube
                  </a>
                  <a className={styles.listenItem} href="#">
                    <ApplePodcastsIcon />
                    Apple Podcasts
                  </a>
                </div>
              </div>
            </div>

            <div className={styles.actionRow}>
              <RatingWidget styles={styles} />
              <ReviewWidget styles={styles} buttonClassName={styles.btnLog} />
              <button className={styles.btnAddList}>
                <PlusIcon />
                Add to list
              </button>
            </div>

            <div className={styles.prevNextRow}>
              <Link href="#" className={styles.prevNextBtn}>
                <ChevronLeftIcon />
                Previous episode
              </Link>
              <Link href="#" className={styles.prevNextBtn}>
                Next episode
                <ChevronRightIcon />
              </Link>
            </div>
          </div>
        </section>

        {HAS_COMMUNITY_DATA && (
          <>
        <hr className="divider" />

        <section>
          <h2 className={styles.sectionTitle}>Popular reviews</h2>
          <div className={styles.reviewsList}>
            {reviews.map((r) => (
              <div className={styles.reviewCard} key={r.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.reviewerAvatar} src={r.avatar} alt="" />
                <div>
                  <div className={styles.reviewerName}>{r.name}</div>
                  <span className={`${styles.ratingTag} ${styles[r.tier]}`}>{r.tierLabel}</span>
                  <p className={styles.reviewText}>{r.text}</p>
                  <Link href="#" className={styles.moreLink}>
                    MORE
                  </Link>
                </div>
                <div className={styles.reviewDate}>{r.date}</div>
              </div>
            ))}
          </div>
          <div className={styles.seeMoreRow}>
            <button className={styles.btnSeeMore}>See More</button>
          </div>
        </section>

        <hr className="divider" />

        <section>
          <h2 className={styles.sectionTitle}>Popular Lists</h2>
          <div className={styles.listsList}>
            {lists.map((l) => (
              <Link className={styles.listCard} href="/list/joe-rogan-mma-show" key={l.id}>
                <div className={styles.listCardLeft}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.listAvatar} src={l.avatar} alt="" />
                  <div>
                    <div className={styles.listInfoTitle}>{l.title}</div>
                    <div className={styles.listInfoAuthor}>{l.author}</div>
                  </div>
                </div>
                <div className={styles.listGallery}>
                  {l.gallery.map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={styles.listGalleryImg} src={src} alt="" key={src} />
                  ))}
                  <div className={styles.listGalleryMore}>+{l.more}</div>
                </div>
              </Link>
            ))}
          </div>
          <div className={styles.seeMoreRow}>
            <button className={styles.btnSeeMore}>See more</button>
          </div>
        </section>
          </>
        )}

        <hr className="divider" />

        <section>
          <h2 className={styles.sectionTitle}>Featured people</h2>
          <div className={styles.featuredPeopleList}>
            {featuredPeople.map((p) => (
              <Link className={styles.featuredPerson} href={`/person/${p.slug}`} key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.featuredPersonAvatar} src={p.avatar} alt={p.name} />
                <div>
                  <div className={styles.featuredPersonName}>{p.name}</div>
                  <div className={styles.featuredPersonRole}>{p.role}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
