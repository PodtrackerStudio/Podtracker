import type { Metadata } from "next";
import { getPodcastDetail } from "@/lib/podcastDetail";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { getEpisodePage } from "@/lib/episodeDetail";
import { EPISODE_PAGE_SIZE } from "@/lib/episodePaging";
import { EpisodeListClient } from "./EpisodeListClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const detail = await getPodcastDetail(id).catch(() => null);
  if (!detail?.isLive) return {};

  return {
    title: `All episodes of ${detail.title}`,
    description: `Every episode of ${detail.title}, with ratings and reviews from Podtracker listeners.`,
    alternates: { canonical: `/podcast/${id}/episodes` },
  };
}

export default async function FullEpisodeListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Only the first page is rendered; the rest is fetched as it's asked for.
  // See `getEpisodePage`.
  const { podcastTitle, episodes, total } = await getEpisodePage(id, { sort: "newest", offset: 0, limit: EPISODE_PAGE_SIZE });

  return (
    <>
      <SiteNav />
      <EpisodeListClient podcastId={id} podcastTitle={podcastTitle} initialEpisodes={episodes} total={total} />
      <SiteFooter />
    </>
  );
}
