import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PlusIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { episodeKeyFromGuid } from "@/lib/episodeKey";
import styles from "./profile.module.css";

// A seeded demo account kept around to show what a populated profile looks
// like — real signups won't have activity until rating/review persistence
// (task #3) exists, so this is the only way to demo the full design for now.
const DEMO_USERNAME = "sasha";

/** Tier → label + colour class for the recent-logs cards. */
const LOG_TIER_DISPLAY: Record<string, { label: string; className: string }> = {
  HIGHLY_RECOMMEND: { label: "Highly Recommend", className: "highly" },
  RECOMMEND: { label: "Recommend", className: "recommend" },
  OK: { label: "Ok", className: "ok" },
  DONT_RECOMMEND: { label: "Don't recommend", className: "dont" },
  DIDNT_FINISH: { label: "Didn't finish", className: "didnt" },
};

function getDemoProfile() {
  return {
    displayName: "Alexander Knysh",
    verified: true,
    followers: 30,
    following: 19,
    friends: 16,
    link: "Youtube.com",
    avatar: "https://picsum.photos/seed/profileav/220/220",
    bio: "I like podcasts, and I recommend the ones I really like here",
    longBio:
      "Lifelong podcast addict, currently somewhere between 3 hours and 11 hours behind on my queue. Big fan of long-form interviews, comedy podcasts, and the occasional deep dive into NBA discourse. Always open to recommendations — especially if they're better than what my friends usually send me.",
  };
}

const demoListening = [
  { id: "l1", img: "https://picsum.photos/seed/listen1/480/300", tier: "highly", tierLabel: "Highly Recommend", hasReview: true },
  { id: "l2", img: "https://picsum.photos/seed/listen2/480/300", tier: "recommend", tierLabel: "Recommend", hasReview: true },
  { id: "l3", img: "https://picsum.photos/seed/listen3/480/300", tier: "ok", tierLabel: "OK", hasReview: false },
];

const demoDistribution = [
  { tier: "highly", label: "Highly Recommend", pct: 42, count: 42 },
  { tier: "recommend", label: "Recommend", pct: 30, count: 30 },
  { tier: "ok", label: "Ok", pct: 16, count: 16 },
  { tier: "dont", label: "Don't recommend", pct: 8, count: 8 },
  { tier: "didnt", label: "Didn't finish", pct: 4, count: 4 },
];

const demoNextListening = ["https://picsum.photos/seed/next1/130/130", "https://picsum.photos/seed/next2/130/130", "https://picsum.photos/seed/next3/130/130"];

const demoListenedDays: Record<number, string[]> = {
  2: ["Joe Rogan #2002 – Bill Burr"],
  4: ["Rick Beato #492 – Lex Fridman"],
  6: ["This Past Weekend #651 – Ella Langley"],
  8: ["Huberman Lab – Build a Resilient Body"],
  12: ["Lex Fridman #494 – Jensen Huang"],
  14: ["Bill Simmons – NBA Power Poll"],
  19: ["Conversations with Coleman – Israel & American Power", "Whistleblower CIA – Tucker Carlson", "FLAGRANT – Episode 312"],
};

const demoFriends = Array.from({ length: 11 }, (_, i) => `https://picsum.photos/seed/friend${i + 1}/110/110`);

// June 2026 starts on a Monday, so no leading/trailing muted days are needed for week 1.
const juneWeeks = [
  [1, 2, 3, 4, 5, 6, 7],
  [8, 9, 10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19, 20, 21],
  [22, 23, 24, 25, 26, 27, 28],
  [29, 30],
];

function ProfileSubnav({ username }: { username: string }) {
  return (
    <div className={styles.profileSubnav}>
      <Link href={`/user/${username}`} className={styles.active}>
        Profile
      </Link>
      {/* Favorites and Following are the same feature — one destination. */}
      <Link href="/following">Favorites</Link>
      <Link href={`/user/${username}/reviews`}>Your Reviews</Link>
      <Link href={`/user/${username}/lists`}>Your lists</Link>
      <Link href={`/user/${username}/diary`}>Full diary</Link>
    </div>
  );
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  if (username === DEMO_USERNAME) {
    const profile = getDemoProfile();
    return (
      <>
        <SiteNav active="profile" />
        <main className={styles.main}>
          <section className={styles.profileHeader}>
            <div className={styles.profileLeft}>
              <div className={styles.profileName}>
                {profile.displayName}
                {profile.verified && <span className={styles.verifiedBadge}>✓</span>}
              </div>
              <div className={styles.profileStats}>
                <span>
                  <strong>{profile.followers}</strong> Followers
                </span>
                <span>
                  <strong>{profile.following}</strong> following
                </span>
                <span>
                  <strong>{profile.friends}</strong> friends
                </span>
              </div>
            </div>

            <div className={styles.profileCenter}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.profileAvatar} src={profile.avatar} alt="Profile picture" />
              <button className={styles.btnEdit}>Edit profile</button>
              <Link href="#" className={styles.profileLink}>
                {profile.link}
              </Link>
              <p className={styles.profileBio}>{profile.bio}</p>
            </div>

            <div className={styles.profileRight}>
              <ProfileSubnav username={username} />
              <p className={styles.profileLongbio}>{profile.longBio}</p>
            </div>
          </section>

          <hr className="divider" />

          <section>
            <div className={styles.listeningHeader}>
              <h2 className={styles.listeningTitle}>Here&apos;s what you&apos;ve been listening to…</h2>
              <button className={styles.btnSeeMore}>See more</button>
            </div>

            <div className={styles.listeningGrid}>
              {demoListening.map((item) => (
                <div key={item.id}>
                  <Link href="/podcast/modern-wisdom/episode/1109">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className={styles.listeningThumb} src={item.img} alt="Episode" />
                  </Link>
                  <div className={styles.listeningMeta}>
                    <span className={`${styles.ratingTag} ${styles[item.tier]}`}>{item.tierLabel}</span>
                    {item.hasReview && (
                      <Link href="/podcast/modern-wisdom/episode/1109" className={styles.readReview}>
                        Read review
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.bottomGrid}>
            <div>
              <h3 className={styles.bottomColTitle}>Ratings distribution</h3>
              {demoDistribution.map((d) => (
                <div className={styles.distRow} key={d.tier}>
                  <span className={`${styles.distName} ${styles[d.tier]}`}>{d.label}</span>
                  <div className={`${styles.distTrack} ${styles.tooltipWrap}`}>
                    <div className={`${styles.distFill} ${styles[d.tier]}`} style={{ width: `${d.pct}%` }} />
                    <span className={styles.tooltip}>{d.count} ratings</span>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 className={styles.bottomColTitle}>Next listening</h3>
              <div className={styles.listGallery}>
                {demoNextListening.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.listGalleryImg} src={src} alt="" key={src} />
                ))}
                <div className={styles.listGalleryMore}>+82</div>
              </div>
            </div>

            <div>
              <h3 className={styles.bottomColTitle}>Calendar</h3>
              <div className={styles.calendar}>
                <div className={styles.calendarHeader}>
                  <span className={styles.calendarMonth}>June 2026</span>
                  <div className={styles.calendarNav}>
                    <button>&lt;</button>
                    <button>&gt;</button>
                  </div>
                </div>
                <div className={styles.calendarGrid}>
                  {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                    <div className={styles.dayLabel} key={`label-${i}`}>
                      {d}
                    </div>
                  ))}
                  {juneWeeks.map((week, wi) =>
                    week.map((day) => {
                      const episodes = demoListenedDays[day];
                      const isListened = Boolean(episodes);
                      const isMulti = (episodes?.length ?? 0) > 1;
                      return (
                        <div className={`${styles.dayCell} ${isListened ? styles.listened : ""} ${isMulti ? styles.multi : ""}`} key={`${wi}-${day}`}>
                          {day}
                          {isListened && (
                            <span className={styles.tooltip}>
                              {isMulti ? (
                                <ul className={styles.tooltipEpisodeList}>
                                  {episodes!.map((ep) => (
                                    <li key={ep}>{ep}</li>
                                  ))}
                                </ul>
                              ) : (
                                episodes![0]
                              )}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                  {["1", "2", "3", "4", "5"].map((d) => (
                    <div className={`${styles.dayCell} ${styles.muted}`} key={`trail-${d}`}>
                      {d}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <hr className="divider" />

          <section>
            <h2 className={styles.friendsTitle}>Your Friends</h2>
            <div className={styles.friendsRow}>
              {demoFriends.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.friendAvatar} src={src} alt="Friend" key={src} />
              ))}
            </div>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  // Real user lookup — every non-demo profile renders from actual database state.
  const profileUser = await db.user.findUnique({ where: { username } });

  if (!profileUser) {
    return (
      <>
        <SiteNav active="profile" />
        <main className={styles.main}>
          <p style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>No user found with username &ldquo;{username}&rdquo;.</p>
        </main>
        <SiteFooter />
      </>
    );
  }

  const viewer = await getCurrentUser();
  const isOwnProfile = viewer?.id === profileUser.id;

  const [followersCount, followingIds, logEntries, podcastRatings, episodeRatings] = await Promise.all([
    db.follow.count({ where: { followingId: profileUser.id } }),
    db.follow.findMany({ where: { followerId: profileUser.id }, select: { followingId: true } }),
    db.logEntry.findMany({
      where: { userId: profileUser.id },
      orderBy: { listenedDate: "desc" },
      take: 6,
      include: { episode: true, podcast: true },
    }),
    db.podcastRating.findMany({ where: { userId: profileUser.id } }),
    db.episodeRating.findMany({ where: { userId: profileUser.id } }),
  ]);

  const followingCount = followingIds.length;
  const friendsCount =
    followingCount > 0
      ? await db.follow.count({ where: { followerId: { in: followingIds.map((f) => f.followingId) }, followingId: profileUser.id } })
      : 0;

  const allRatings = [...podcastRatings, ...episodeRatings];
  const countedRatings = allRatings.filter((r) => r.tier !== "DIDNT_FINISH");
  const distributionCounts = {
    HIGHLY_RECOMMEND: 0,
    RECOMMEND: 0,
    OK: 0,
    DONT_RECOMMEND: 0,
    DIDNT_FINISH: 0,
  };
  for (const r of allRatings) distributionCounts[r.tier]++;

  const hasActivity = logEntries.length > 0 || allRatings.length > 0;

  return (
    <>
      <SiteNav active="profile" />
      <main className={styles.main}>
        <section className={styles.profileHeader}>
          <div className={styles.profileLeft}>
            <div className={styles.profileName}>{profileUser.displayName}</div>
            <div className={styles.profileStats}>
              <span>
                <strong>{followersCount}</strong> Followers
              </span>
              <span>
                <strong>{followingCount}</strong> following
              </span>
              <span>
                <strong>{friendsCount}</strong> friends
              </span>
            </div>
          </div>

          <div className={styles.profileCenter}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.profileAvatar} src={profileUser.avatarUrl ?? "/default-avatar.webp"} alt="Profile picture" />
            {isOwnProfile && (
              <Link href="/settings" className={styles.btnEdit}>
                Edit profile
              </Link>
            )}
            {profileUser.externalLink && (
              <Link href="#" className={styles.profileLink}>
                {profileUser.externalLink}
              </Link>
            )}
            {profileUser.bio && <p className={styles.profileBio}>{profileUser.bio}</p>}
          </div>

          <div className={styles.profileRight}>
            <ProfileSubnav username={username} />
            {profileUser.longBio && <p className={styles.profileLongbio}>{profileUser.longBio}</p>}
          </div>
        </section>

        <hr className="divider" />

        <section>
          <div className={styles.listeningHeader}>
            <h2 className={styles.listeningTitle}>Here&apos;s what you&apos;ve been listening to…</h2>
          </div>

          {hasActivity ? (
            <div className={styles.listeningGrid}>
              {logEntries.map((entry) => {
                const cover = entry.episode?.coverUrl ?? entry.podcast?.coverUrl ?? "/default-avatar.webp";

                // Routes take the EXTERNAL ids — the iTunes id for a show, the
                // hashed feed guid for an episode. Using the raw database cuids
                // sent every link to a non-numeric id, which fell through to
                // the Modern Wisdom placeholder.
                const showExternalId = entry.podcast?.externalId ?? null;
                const episodeKey = entry.episode?.externalId ? episodeKeyFromGuid(entry.episode.externalId) : null;
                const href =
                  episodeKey && showExternalId
                    ? `/podcast/${showExternalId}/episode/${episodeKey}`
                    : showExternalId
                      ? `/podcast/${showExternalId}`
                      : null;

                // Current rating of the same target, not LogEntry.tier — a log
                // can exist without a rating.
                const tier = entry.episodeId
                  ? episodeRatings.find((r) => r.episodeId === entry.episodeId)?.tier
                  : podcastRatings.find((r) => r.podcastId === entry.podcastId)?.tier;
                const tierMeta = tier ? LOG_TIER_DISPLAY[tier] : null;

                return (
                  <div key={entry.id}>
                    {href ? (
                      <Link href={href}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className={styles.listeningThumb} src={cover} alt="Episode" />
                      </Link>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className={styles.listeningThumb} src={cover} alt="Episode" />
                    )}
                    <div className={styles.listeningMeta}>
                      {tierMeta && <span className={`${styles.ratingTag} ${styles[tierMeta.className]}`}>{tierMeta.label}</span>}
                      {entry.reviewText && (
                        <Link href={`/review/${entry.id}`} className={styles.readReview}>
                          Read review
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateText}>No activity yet..</p>
              {isOwnProfile && (
                <Link href="/explore" className={styles.emptyStateAction}>
                  Add podcast
                  <PlusIcon size={22} />
                </Link>
              )}
            </div>
          )}
        </section>

        {hasActivity && (
          <>
            <section className={styles.bottomGrid}>
              <div>
                <h3 className={styles.bottomColTitle}><Link href={`/user/${username}/ratings`} className={styles.distHeadingLink}>Ratings distribution</Link></h3>
                {(
                  [
                    { tier: "highly", key: "HIGHLY_RECOMMEND" as const, label: "Highly Recommend" },
                    { tier: "recommend", key: "RECOMMEND" as const, label: "Recommend" },
                    { tier: "ok", key: "OK" as const, label: "Ok" },
                    { tier: "dont", key: "DONT_RECOMMEND" as const, label: "Don't recommend" },
                    { tier: "didnt", key: "DIDNT_FINISH" as const, label: "Didn't finish" },
                  ] as const
                ).map((d) => {
                  const count = distributionCounts[d.key];
                  const pct = allRatings.length > 0 ? Math.round((count / allRatings.length) * 100) : 0;
                  return (
                    <Link className={styles.distRow} key={d.tier} href={`/user/${username}/ratings?tier=${d.key}`}>
                      <span className={`${styles.distName} ${styles[d.tier]}`}>{d.label}</span>
                      <div className={`${styles.distTrack} ${styles.tooltipWrap}`}>
                        <div className={`${styles.distFill} ${styles[d.tier]}`} style={{ width: `${pct}%` }} />
                        <span className={styles.tooltip}>{count} ratings</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
