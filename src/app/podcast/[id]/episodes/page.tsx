import type { Metadata } from "next";
import { getPodcastDetail } from "@/lib/podcastDetail";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { getEpisodeList } from "@/lib/episodeDetail";
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
  const { podcastTitle, episodes } = await getEpisodeList(id);

  return (
    <>
      <SiteNav />
      <EpisodeListClient podcastId={id} podcastTitle={podcastTitle} episodes={episodes} />
      <SiteFooter />
    </>
  );
}
