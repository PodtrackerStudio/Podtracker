import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { MicIcon } from "@/components/icons";
import { RatingWidget } from "@/components/RatingWidget";
import { ReviewWidget } from "@/components/ReviewWidget";
import { FollowButton } from "@/components/FollowButton";
import { NextListeningButton } from "@/components/NextListeningButton";
import { AddToListButton } from "@/components/AddToListButton";
import { getPodcastDetail } from "@/lib/podcastDetail";
import { getPodcastCommunityStats, formatCount } from "@/lib/podcastStats";
import { getViewerPodcastState } from "@/lib/viewerState";
import { HAS_COMMUNITY_DATA } from "@/lib/community";
import styles from "./podcast.module.css";

// Community data — ratings, listens, likes, the distribution bars. None of this
// comes from a podcast API; it is this app's own data and there is no user base
// generating it yet, so it stays mock while the show's own details come live
// from `getPodcastDetail`.
const community = {
  listens: "980k",
  likes: "405k",
  avgScore: "3.6",
  distribution: [
    { tier: "highly", label: "Highly Recommend", pct: 38, count: 412 },
    { tier: "recommend", label: "Recommend", pct: 29, count: 314 },
    { tier: "ok", label: "OK", pct: 18, count: 195 },
    { tier: "dont", label: "Don't Recommend", pct: 11, count: 119 },
    { tier: "didnt", label: "Didn't Finish", pct: 4, count: 43 },
  ],
};

const friendsActivity = [
  { id: "fa1", avatar: "https://picsum.photos/seed/fa1/88/88", tier: "highly", tierLabel: "Highly Recommend", hasReview: false },
  { id: "fa2", avatar: "https://picsum.photos/seed/fa2/88/88", tier: "recommend", tierLabel: "Recommend", hasReview: true },
  { id: "fa3", avatar: "https://picsum.photos/seed/fa3/88/88", tier: "ok", tierLabel: "OK", hasReview: true },
  { id: "fa4", avatar: "https://picsum.photos/seed/fa4/88/88", tier: "highly", tierLabel: "Highly Recommend", hasReview: false },
];

const reviews = [
  { id: "r1", avatar: "https://picsum.photos/seed/av5/88/88", name: "JohnJam", tier: "recommend", tierLabel: "Recommend", date: "June 16, 2026", text: "Excellent podcast, features many interesting guests and appearances. Chris is highly talented and really interesting to listen to. The conversations go deep without losing accessibility — a rare thing in the self-improvement space…" },
  { id: "r2", avatar: "https://picsum.photos/seed/av2/88/88", name: "Phillip Neiman", tier: "highly", tierLabel: "Highly Recommend", date: "June 10, 2026", text: "Easily one of the most consistently high-quality long-form podcasts out there. Chris has a genuine gift for drawing out the best in his guests — every episode feels like a real conversation, not an interview…" },
  { id: "r3", avatar: "https://picsum.photos/seed/av6/88/88", name: "Peter Prokhorov", tier: "ok", tierLabel: "OK", date: "June 5, 2026", text: "Good podcast overall but some episodes feel like they drag on longer than necessary. Best consumed one or two episodes a week rather than binging…" },
];

const lists = [
  { id: "l1", avatar: "https://picsum.photos/seed/av5/80/80", title: "Good Self-help podcasts", author: "Ronnie", more: 8, gallery: ["https://picsum.photos/seed/mwcover/80/80", "https://picsum.photos/seed/simhuberman/80/80", "https://picsum.photos/seed/simdoac/80/80"] },
  { id: "l2", avatar: "https://picsum.photos/seed/av9/80/80", title: "Listens of the week", author: "JackM", more: 3, gallery: ["https://picsum.photos/seed/mwcover/80/80", "https://picsum.photos/seed/simhuberman/80/80", "https://picsum.photos/seed/simdoac/80/80"] },
  { id: "l3", avatar: "https://picsum.photos/seed/av10/80/80", title: "Helpful Advice (for me)", author: "Bullsfan1991", more: 11, gallery: ["https://picsum.photos/seed/simrichroll/80/80", "https://picsum.photos/seed/simtimferriss/80/80", "https://picsum.photos/seed/mwcover/80/80"] },
];


// `HAS_COMMUNITY_DATA` (imported above) gates everything needing a user base.
// False renders Sasha's no-users design (Figma Frames 11 + 13); true restores
// the with-users one (Frames 4 + 6).

export default async function PodcastPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const podcast = await getPodcastDetail(id);
  const recentEpisodes = podcast.recentEpisodes;
  // Listens and Likes are this app's own numbers, so they come from the
  // database, not the API. Zero until people start using the site.
  const stats = await getPodcastCommunityStats(id);
  // What THIS viewer has already done, so the controls show their real state
  // instead of resetting to Follow / unrated on every refresh.
  const viewerState = await getViewerPodcastState(id);

  return (
    <>
      <SiteNav />

      {/* No banner (Sasha, 2026-08-18) — same call as the episode page. The
          square cover art was being stretched across a wide strip, which read
          as a heavy zoomed crop, and no podcast API returns a real banner. */}

      <main className={styles.main}>
        <section className={styles.podcastInfo}>
          <div className={styles.podcastLeft}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.podcastCover} src={podcast.coverUrl} alt={`${podcast.title} cover`} />
            {HAS_COMMUNITY_DATA && (
              <>
                <div className={styles.avgMic}>
                  <MicIcon />
                </div>
                <div className={styles.scoreDisplay}>{community.avgScore}</div>
                <div className={styles.avgLabel}>Average rating</div>

                <div className={styles.distSection}>
                  <div className={styles.distSectionTitle}>Ratings distribution</div>
                  {community.distribution.map((d) => (
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

          <div className={styles.podcastRight}>
            <h1 className={styles.podcastTitle}>{podcast.title}</h1>
            <div className={styles.podcastMetaRow}>
              <span>{podcast.author}</span>
              <span>{podcast.years}</span>
            </div>
            <div className={styles.podcastStatsRow}>
              <div className={styles.podcastStat}>
                <strong>{podcast.episodesCount}</strong>
                <span>Episodes</span>
              </div>
              <div className={styles.podcastStat}>
                <strong>{formatCount(stats.listens)}</strong>
                <span>Listens</span>
              </div>
              <div className={styles.podcastStat}>
                <strong>{formatCount(stats.likes)}</strong>
                <span>Likes</span>
              </div>
            </div>
            <div className={styles.genresLine}>Genres: {podcast.genres}</div>

            {/* "Where to listen" removed until after MVP (Sasha, 2026-08-18).
                It listed Spotify / YouTube / Apple unconditionally with dead
                links, asserting availability on three platforms with no basis.
                Only Apple is provable without credentials. */}
            <div className={styles.descListenRow}>
              <p className={styles.podcastDesc}>{podcast.description}</p>
            </div>

            <div className={styles.actionRow}>
              <div className={styles.followGroup}>
                <FollowButton styles={styles} externalId={id} initialFollowing={viewerState.following} />
              </div>
              <RatingWidget styles={styles} externalId={id} initialTier={viewerState.tier} />
              <ReviewWidget styles={styles} buttonClassName={styles.btnLog} externalId={id} />
              <AddToListButton className={styles.btnAddList} externalId={id} />
              <NextListeningButton
                className={styles.btnAddList}
                externalId={id}
                initialAdded={viewerState.inNextListening}
              />
            </div>

            {HAS_COMMUNITY_DATA && (
              <>
                <hr className="divider" style={{ margin: "28px 0 20px" }} />

                <h2 className={styles.sectionTitle} style={{ fontSize: 26, marginBottom: 16 }}>
                  Friends&apos; activity
                </h2>
                <div className={styles.friendsActivityGrid}>
                  {friendsActivity.map((f) => (
                    <div className={styles.friendActivityItem} key={f.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className={styles.friendActivityAvatar} src={f.avatar} alt="" />
                      <span className={`${styles.friendRatingTag} ${styles[f.tier]}`}>{f.tierLabel}</span>
                      {f.hasReview && (
                        <Link href={`/podcast/${podcast.id}/episode/1109`} className={styles.friendReadReview}>
                          Read review
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Creators strip removed for MVP (Sasha, 2026-08-19). Many shows have
            no person data at all, so it appeared for some and not others, and
            the registry it read from covers only a handful by hand. Comes back
            when there is a real source for host/guest data.
            `lib/creators.ts` and `/person/[slug]` are kept — see the change
            log. */}

        <hr className="divider" />

        <section>
          <div className={styles.episodeSectionHeader}>
            <h2 className={styles.sectionTitle}>Recent episodes</h2>
            <div className={styles.episodeNavButtons}>
              <Link href={`/podcast/${podcast.id}/episodes`} className={styles.btnEpisodeNav}>
                Full episode list
              </Link>
              {/* Ranking episodes needs ratings, which need users. */}
              {HAS_COMMUNITY_DATA && (
                <Link href={`/podcast/${podcast.id}/top-rated`} className={styles.btnEpisodeNav}>
                  Top rated episodes
                </Link>
              )}
            </div>
          </div>
          <div className={styles.episodesList}>
            {recentEpisodes.map((ep) => (
              <Link className={styles.episodeRow} href={`/podcast/${podcast.id}/episode/${ep.id}`} key={ep.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.episodeCover} src={ep.img} alt="Episode" />
                <div className={styles.episodeInfo}>
                  <div className={styles.episodeTitle}>{ep.title}</div>
                  <div className={styles.episodeGuest}>{ep.guest}</div>
                </div>
                <div className={styles.episodeDate}>{ep.date}</div>
              </Link>
            ))}
          </div>
          <Link href="#" className={styles.allEpisodesLink}>
            All episodes →
          </Link>
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
            <button className={styles.btnSeeMore}>See all reviews</button>
          </div>
        </section>

        <hr className="divider" />

        <section>
          <h2 className={styles.sectionTitle}>Popular Lists</h2>
          <div className={styles.listsList}>
            {lists.map((l) => (
              <Link className={styles.listCard} href="#" key={l.id}>
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
            <button className={styles.btnSeeMore}>See all lists</button>
          </div>
        </section>
          </>
        )}

        {/* Similar podcasts removed 2026-08-20. iTunes has no similar-podcast
            data at all — no related/similar fields, no such entity — and the
            charts endpoint's ?genre= parameter does not actually filter. It was
            five hardcoded shows with placeholder images, identical on every
            page. Returns as "listeners of this also follow…" computed from
            follow/favourite overlap once there are users. See the change log. */}
      </main>

      <SiteFooter />
    </>
  );
}
