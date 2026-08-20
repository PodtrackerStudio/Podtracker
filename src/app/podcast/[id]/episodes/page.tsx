import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { getEpisodeList } from "@/lib/episodeDetail";
import { EpisodeListClient } from "./EpisodeListClient";

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
