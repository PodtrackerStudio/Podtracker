import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { EpisodeListClient } from "./EpisodeListClient";

export default async function FullEpisodeListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <SiteNav />
      <EpisodeListClient podcastId={id} podcastTitle="Modern Wisdom" />
      <SiteFooter />
    </>
  );
}
