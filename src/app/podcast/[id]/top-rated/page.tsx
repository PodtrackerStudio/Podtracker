import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { getPodcastDetail } from "@/lib/podcastDetail";
import { getTopRatedEpisodes } from "@/lib/topRatedEpisodes";
import { artworkAt } from "@/lib/artwork";
import styles from "../episodeListing.module.css";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const detail = await getPodcastDetail(id).catch(() => null);
  if (!detail?.isLive) return {};

  return {
    title: `Best episodes of ${detail.title}`,
    description: `The highest-rated episodes of ${detail.title}, ranked by Podtracker listeners — and which ones to skip.`,
    alternates: { canonical: `/podcast/${id}/top-rated` },
  };
}

/**
 * A show's episodes ranked by rating.
 *
 * **A server component now.** It was `TopRatedClient`, which invented episodes
 * from random topic and guest lists and linked every row to episode 1109 of a
 * different show. There is nothing interactive here — a ranked list does not
 * need state — so the client component went with the mock.
 *
 * Every value is lifted from the episode list beside it (`episodeListing.module.css`),
 * which already had `.episodeRank` and `.listHeaderSimple` waiting for this
 * page. The only addition is the tier badge, coloured from the documented
 * rating variables.
 */
export default async function TopRatedEpisodesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [detail, episodes] = await Promise.all([
    getPodcastDetail(id).catch(() => null),
    getTopRatedEpisodes(id),
  ]);

  const title = detail?.title ?? "this show";

  return (
    <>
      <SiteNav />

      <main className={styles.main}>
        <div className={styles.listHeaderSimple}>
          <h1>
            <Link href={`/podcast/${id}`}>{title}</Link>
          </h1>
          <div className={styles.subtitle}>
            {episodes.length > 0
              ? "Top rated episodes — and which ones to skip"
              : "Top rated episodes"}
          </div>
        </div>

        {episodes.length === 0 ? (
          /* Reachable by typing the URL even when the podcast page does not
             offer the link, so it says why it is empty rather than rendering
             an empty scaffold. */
          <p className={styles.subtitle}>
            Nobody has rated an episode of {title} yet. Rate a few and they&apos;ll be ranked here.
          </p>
        ) : (
          <div>
            {episodes.map((ep, i) => {
              const row = (
                <>
                  <div className={styles.episodeRank}>{i + 1}.</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    loading="lazy"
                    decoding="async"
                    className={styles.episodeThumb}
                    src={artworkAt(ep.coverUrl ?? detail?.coverUrl ?? "/placeholder-cover.svg", 60)}
                    alt=""
                  />
                  <div className={styles.episodeText}>
                    <div className={styles.episodeTitleLine}>{ep.title}</div>
                    <div className={styles.episodeDate}>
                      {ep.publishedAt.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                      {" · "}
                      {ep.summary.total} {ep.summary.total === 1 ? "rating" : "ratings"}
                    </div>
                  </div>
                  {ep.tier && ep.tierLabel && (
                    <span className={`${styles.episodeTier} ${styles[ep.tier]} rating-label`}>
                      {ep.tierLabel}
                    </span>
                  )}
                </>
              );

              // No href when the episode has no stored guid: an unlinked row is
              // better than one that navigates somewhere wrong, which is what
              // the mock did on every single row.
              return ep.href ? (
                <Link className={styles.episodeRow} href={ep.href} key={ep.id}>
                  {row}
                </Link>
              ) : (
                <div className={styles.episodeRow} key={ep.id}>
                  {row}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
