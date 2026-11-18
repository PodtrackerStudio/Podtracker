import type { Metadata } from "next";
import { getPodcastDetail } from "@/lib/podcastDetail";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { TopRatedClient } from "./TopRatedClient";

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

export default async function TopRatedEpisodesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The real show's name. This was hardcoded to "Modern Wisdom" from the days
  // of the demo page, so every show's top-rated page was titled that.
  // `getPodcastDetail` is already called by `generateMetadata` above and its
  // fetches are cached, so this costs nothing extra.
  const detail = await getPodcastDetail(id).catch(() => null);

  return (
    <>
      <SiteNav />
      <TopRatedClient podcastId={id} podcastTitle={detail?.title ?? "this show"} />
      <SiteFooter />
    </>
  );
}
