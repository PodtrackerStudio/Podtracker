import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { staticSiteOrigin } from "@/lib/siteUrl";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ChevronLeftIcon, ChevronRightIcon, MicIcon } from "@/components/icons";
import { RatingWidget } from "@/components/RatingWidget";
import { ReviewWidget } from "@/components/ReviewWidget";
import { NextListeningButton } from "@/components/NextListeningButton";
import { AddToListButton } from "@/components/AddToListButton";
import { HAS_COMMUNITY_DATA } from "@/lib/community";
import { getEpisodeRatingSummaryByKey } from "@/lib/ratingSummary";
import { aggregateRatingSchema } from "@/lib/ratingScale";
import { getViewerEpisodeState } from "@/lib/viewerState";
import { tierFromScore } from "@/lib/ratingTier";
import { getEpisodeDetail, recoverEpisodeFromSearch, type EpisodeDetail } from "@/lib/episodeDetail";
import styles from "./episode.module.css";
import { artworkAt } from "@/lib/artwork";
import { getEpisodeReviews } from "@/lib/subjectReviews";
import { usernameToPath } from "@/lib/routeParams";

// The mock `community` block that used to sit here — a 3.8 average over 591
// invented ratings — is gone as of 2026-10-03. Both numbers come from
// `getEpisodeRatingSummaryByKey` now, which reads EpisodeRating.

const lists = [
  { id: "l1", avatar: "/default-avatar.webp", title: "Modern Wisdom (all episodes)", author: "Daniel Ocean", more: 42, gallery: ["/placeholder-cover.svg", "/placeholder-cover.svg", "/placeholder-cover.svg"] },
  { id: "l2", avatar: "/default-avatar.webp", title: "Ezra Klein appearances", author: "Rowan", more: 5, gallery: ["/placeholder-cover.svg", "/placeholder-cover.svg", "/placeholder-cover.svg"] },
  { id: "l3", avatar: "/default-avatar.webp", title: "Episodes I listened this week", author: "LaimerKor", more: 3, gallery: ["/placeholder-cover.svg", "/placeholder-cover.svg", "/placeholder-cover.svg"] },
];

// `HAS_COMMUNITY_DATA` (imported above) renders Sasha's no-users episode design
// when false — the right-hand Figma frame — and the with-users one when true.

/**
 * Per-episode titles and previews.
 *
 * **This is the largest search surface the site has.** There are a hundred-odd
 * show pages and tens of thousands of episode pages behind them, and "<episode
 * title> review" is a search with almost no competition — the podcast's own
 * site rarely ranks for it and the platforms do not host reviews at all.
 * Shipping every one of these with no title threw all of it away.
 *
 * A failed lookup returns empty metadata rather than throwing: the page itself
 * decides whether that is a 404 or a retry, and metadata generation should not
 * pre-empt that decision.
 */
/**
 * Reads the `?t=` hint and tries to rebuild the episode from Apple's search.
 *
 * Shared by the page and `generateMetadata` so the two can never disagree
 * about whether a given URL renders — a page that 404s while its metadata
 * describes an episode, or the reverse, is worse than either on its own.
 */
async function recoverFromHint(
  id: string,
  epId: string,
  searchParams: Promise<{ t?: string }>,
): Promise<EpisodeDetail | null> {
  const params = await searchParams.catch(() => null);
  // `?t=a&t=b` arrives as an array. Calling `.trim()` on that threw, so a
  // repeated parameter turned a would-be 404 into a 500.
  const hint = typeof params?.t === "string" ? params.t : null;
  if (!hint) return null;
  return recoverEpisodeFromSearch(id, epId, hint);
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; epId: string }>;
  searchParams: Promise<{ t?: string }>;
}): Promise<Metadata> {
  const { id, epId } = await params;

  const result = await getEpisodeDetail(id, epId).catch(() => null);
  // Recovered episodes get metadata too. Episode pages are this site's largest
  // search surface, so letting a page that renders perfectly well go out with
  // no title would throw away the reason it exists.
  const episode =
    result?.status === "ok"
      ? result.episode
      : result?.status === "not-found"
        ? await recoverFromHint(id, epId, searchParams)
        : null;
  if (!episode) return {};

  const plain = episode.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const description = plain.length > 200 ? `${plain.slice(0, 197).trimEnd()}…` : plain;

  const title = `${episode.title} — ${episode.podcastTitle}`;
  const canonical = `/podcast/${id}/episode/${epId}`;

  return {
    title,
    description: description || `Ratings and reviews for this episode of ${episode.podcastTitle} on Podtracker.`,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      images: episode.coverUrl ? [{ url: episode.coverUrl, alt: episode.title }] : undefined,
    },
    twitter: {
      card: "summary", // square artwork; the wide card crops it badly
      title,
      description,
      images: episode.coverUrl ? [episode.coverUrl] : undefined,
    },
  };
}

export default async function EpisodePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; epId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id, epId } = await params;

  // Started before the feed lookup rather than after it: neither needs the
  // feed, and the feed is the slow part. The catch only stops an unhandled
  // rejection if the page 404s or throws first; the real await is below.
  const side = Promise.all([
    getEpisodeRatingSummaryByKey(id, epId),
    // What THIS viewer has already done, so the Rate mic and Next listening
    // show their real state instead of resetting to blank on every load.
    getViewerEpisodeState(id, epId),
    // Reviews of this episode. Like the two above it, this needs no feed, so
    // it starts before the slow part rather than after it.
    getEpisodeReviews(id, epId),
  ]);
  side.catch(() => {});

  const result = await getEpisodeDetail(id, epId);

  // An upstream hiccup throws rather than 404ing, so a working episode is
  // never reported as nonexistent — that bug made every trending episode on
  // Explore 404 on 2026-08-27 while the same URLs worked minutes later.
  if (result.status === "unavailable") {
    throw new Error(`Could not reach the feed for podcast ${id} — the episode may still exist.`);
  }

  // The feed genuinely has no such episode. Before giving up, try the title
  // hint search put on the link: the feed path cannot reach episodes of shows
  // Apple's lookup refuses, nor ones older than a truncated feed's window, and
  // both were showing up in search and then dying on click.
  const episode =
    result.status === "ok" ? result.episode : await recoverFromHint(id, epId, searchParams);
  if (!episode) notFound();

  // Real ratings as of 2026-10-03, replacing the mock block that sat behind
  // HAS_COMMUNITY_DATA. Gated on having any, not on the global switch.
  const [ratings, viewerState, reviews] = await side;
  // Resolved once — the mic, the label and their colour all need it.
  const averageTier = ratings.average !== null ? tierFromScore(ratings.average) : null;

  const origin = staticSiteOrigin();
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "PodcastEpisode",
      "@id": `${origin}/podcast/${id}/episode/${epId}#episode`,
      name: episode.title,
      url: `${origin}/podcast/${id}/episode/${epId}`,
      description: episode.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500),
      image: episode.coverUrl || undefined,
      partOfSeries: {
        "@type": "PodcastSeries",
        name: episode.podcastTitle,
        url: `${origin}/podcast/${id}`,
      },
      // Absent until someone has rated the episode; see aggregateRatingSchema.
      aggregateRating: aggregateRatingSchema(ratings),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Explore", item: `${origin}/explore` },
        { "@type": "ListItem", position: 2, name: episode.podcastTitle, item: `${origin}/podcast/${id}` },
        { "@type": "ListItem", position: 3, name: episode.title, item: `${origin}/podcast/${id}/episode/${epId}` },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={schema} />
      <SiteNav />

      {/* No banner on episode pages — Sasha's call (2026-08-17): podcasts aren't
          as visual as films or shows, and it read as clunky. The old one was
          `height: 100vh`, which pushed the title entirely below the fold. */}

      <main className={styles.main}>
        <section className={styles.episodeInfoRow}>
          <div className={styles.episodeLeft}>
            {/* Same art glow as the show page: a blurred copy behind the cover. */}
            <div className={styles.coverWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.coverGlow} src={artworkAt(episode.coverUrl, 300)} alt="" aria-hidden="true" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" className={styles.episodeCover} src={artworkAt(episode.coverUrl, 300)} alt="Episode cover" />
            </div>
            {/* Same rule as the show page: visible once anyone has rated this
                episode, absent entirely when nobody has. */}
            {ratings.total > 0 && (
              <>
                {/* Absent when every rating so far is "Didn't finish", which
                    counts in the bars but carries no score. */}
                {averageTier && (
                  <>
                    {/* Mic takes the tier colour too — it was hardcoded green
                        from the mock era. Same fix as the show page. */}
                    <div className={`${styles.avgMic} ${styles[averageTier.tier]}`}>
                      <MicIcon />
                    </div>
                    {/* The tier in its own colour, not a number — same as the
                        show page. Thresholds come from `tierFromScore`. */}
                    <div className={`${styles.scoreDisplay} ${styles[averageTier.tier]} rating-label`}>
                      {averageTier.tierLabel}
                    </div>
                    <div className={styles.avgLabel}>
                      Average rating{" "}
                      <span className={styles.avgBasis}>
                        ({ratings.scored} {ratings.scored === 1 ? "rating" : "ratings"})
                      </span>
                    </div>
                  </>
                )}

                <div className={styles.distSection}>
                  <div className={styles.distSectionTitle}>Ratings distribution</div>
                  {ratings.distribution.map((d) => (
                    <div className={styles.distRow} key={d.tier}>
                      <div className={styles.distTrack}>
                        <div className={`${styles.distFill} ${styles[d.key]}`} style={{ width: `${d.pct}%` }} />
                        <span className={styles.distTooltip}>
                          {d.count} {d.count === 1 ? "rating" : "ratings"}
                        </span>
                      </div>
                      <span className={`${styles.distLabelText} ${styles[d.key]}`}>{d.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Same addition as the show page (Sasha, 2026-11-23): blank space
                reads as an absence, and on a site this young an unrated
                episode is what most visitors meet first. The Rate control
                below already works; this only says so. Replaced by the real
                average the moment one person rates it. */}
            {ratings.total === 0 && (
              <p className={styles.noRatingsYet}>
                No ratings yet — <strong>be the first.</strong>
              </p>
            )}
          </div>

          <div>
            <Link className={styles.episodePodcastLink} href={`/podcast/${episode.podcastId}`}>
              ← {episode.podcastTitle}
            </Link>
            <h1 className={styles.episodeTitle}>{episode.title}</h1>
            {/* No "Episode N": the route key is a hash of the feed guid, and
                feeds don't reliably carry episode numbers. Printing the hash
                would be noise. */}
            <div className={styles.episodeMeta}>
              {episode.date && <span>{episode.date}</span>}
              {episode.date && episode.duration && <span>·</span>}
              {episode.duration && <span>{episode.duration}</span>}
            </div>

            {/* "Where to listen" removed until after MVP — see the note on the
                podcast page. */}
            <div className={styles.descListenRow}>
              <p className={styles.episodeDesc}>{episode.description}</p>
            </div>

            <div className={styles.actionRow}>
              {/* `episodeTitle` is how a write reaches an episode the show's
                  feed has dropped but Apple still lists. The server searches
                  Apple for it and accepts a result only if its guid hashes to
                  the key already in the route, so the title is a search term
                  and never an assertion about what this episode is. Without
                  it, every one of these four buttons 404s on such an episode
                  while the page around them renders fine — which is exactly
                  what happened to The Rest Is History's back catalogue. */}
              <RatingWidget styles={styles} externalId={id} episodeKey={epId} episodeTitle={episode.title} initialTier={viewerState.tier} />
              <ReviewWidget buttonClassName={styles.btnLog} externalId={id} episodeKey={epId} episodeTitle={episode.title} />
              <AddToListButton className={styles.btnAddList} externalId={id} episodeKey={epId} episodeTitle={episode.title} />
              <NextListeningButton
                className={styles.btnAddList}
                externalId={id}
                episodeKey={epId}
                episodeTitle={episode.title}
                initialAdded={viewerState.inNextListening}
              />
            </div>

            {/* Neighbours come from the feed order. Either can be absent — the
                newest episode has no next, the oldest no previous — so each is
                rendered only when it exists rather than linking nowhere. */}
            <div className={styles.prevNextRow}>
              {episode.previousId ? (
                <Link href={`/podcast/${id}/episode/${episode.previousId}`} className={styles.prevNextBtn}>
                  <ChevronLeftIcon />
                  Previous episode
                </Link>
              ) : (
                <span />
              )}
              {episode.nextId && (
                <Link href={`/podcast/${id}/episode/${episode.nextId}`} className={styles.prevNextBtn}>
                  Next episode
                  <ChevronRightIcon />
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Real reviews of this episode, gated on there being any rather than
            on HAS_COMMUNITY_DATA — see the show page. Replaced three invented
            people whose review text nobody wrote. */}
        {reviews.length > 0 && (
          <>
            <hr className="divider" />

            <section>
              <h2 className={styles.sectionTitle}>
                {reviews.length === 1 ? "Review" : "Popular reviews"}
              </h2>
              <div className={styles.reviewsList}>
                {reviews.map((r) => (
                  <div className={styles.reviewCard} key={r.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" className={styles.reviewerAvatar} src={r.authorAvatarUrl} alt="" />
                    <div>
                      <Link href={`/user/${usernameToPath(r.authorUsername)}`} className={styles.reviewerName}>
                        {r.authorName}
                      </Link>
                      {r.tierClass && r.tierLabel && (
                        <span className={`${styles.ratingTag} ${styles[r.tierClass]}`}>{r.tierLabel}</span>
                      )}
                      <p className={styles.reviewText}>{r.text}</p>
                      <Link href={r.href} className={styles.moreLink}>
                        MORE
                      </Link>
                    </div>
                    <div className={styles.reviewDate}>{r.dateLabel}</div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {HAS_COMMUNITY_DATA && (
          <>

        <hr className="divider" />

        <section>
          <h2 className={styles.sectionTitle}>Popular Lists</h2>
          <div className={styles.listsList}>
            {lists.map((l) => (
              <Link className={styles.listCard} href="#" key={l.id}>
                <div className={styles.listCardLeft}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" className={styles.listAvatar} src={l.avatar} alt="" />
                  <div>
                    <div className={styles.listInfoTitle}>{l.title}</div>
                    <div className={styles.listInfoAuthor}>{l.author}</div>
                  </div>
                </div>
                <div className={styles.listGallery}>
                  {l.gallery.map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" decoding="async" className={styles.listGalleryImg} src={artworkAt(src, 64)} alt="" key={src} />
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

        {/* Featured people removed for MVP (Sasha, 2026-08-19). No podcast API
            or RSS feed returns host/guest data, so it only ever showed a
            hardcoded pair — and many shows have no person data at all. Comes
            back when there is a real source. */}
      </main>

      <SiteFooter />
    </>
  );
}
