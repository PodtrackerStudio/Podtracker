import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { TopRatedClient } from "./TopRatedClient";

export default async function TopRatedEpisodesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <SiteNav />
      <TopRatedClient podcastId={id} podcastTitle="Modern Wisdom" />
      <SiteFooter />
    </>
  );
}
