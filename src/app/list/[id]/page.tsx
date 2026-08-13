import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ListDetailClient, type ListEpisode } from "./ListDetailClient";
import rawEpisodes from "@/lib/jreMmaShowEpisodes.json";
import styles from "./list.module.css";

const DEMO_EPISODE_HREF = "/podcast/the-joe-rogan-experience/episode/1109";

// Real curated data pulled from jrelibrary.com/guests/mixed-martial-artists/ — this specific
// "which JRE episodes are MMA episodes" curation isn't available through any podcast API
// (there's no separate "JRE MMA Show" feed in iTunes/Podcast Index; it's a fan-maintained
// directory). Titles and order are real; exact air dates aren't shown on that page, so dates
// here are approximated to preserve the real most-recent-to-oldest ordering for sorting.
// Reused across all episodes instead of one unique picsum URL each — 12 distinct
// images means the browser only makes 12 network requests (cached after that)
// instead of ~150, which is both faster and more reliable for placeholder art.
const COVER_POOL = Array.from({ length: 12 }, (_, i) => `https://picsum.photos/seed/jre-mma-cover-${i}/300/300`);

function buildEpisodes(): ListEpisode[] {
  const dateCursor = new Date("2026-07-27");

  return rawEpisodes.map((ep, i) => {
    const numberMatch = ep.title.match(/#(\d+)/);
    const episodeNumber = numberMatch ? parseInt(numberMatch[1], 10) : 0;

    if (i > 0) dateCursor.setDate(dateCursor.getDate() - 6);

    return {
      id: ep.slug,
      title: ep.title,
      cover: COVER_POOL[i % COVER_POOL.length],
      href: DEMO_EPISODE_HREF,
      episodeNumber,
      publishedAt: dateCursor.toISOString().slice(0, 10),
      avgRating: Math.round((1 + Math.random() * 3) * 10) / 10,
      listPosition: i + 1,
    };
  });
}

function getMockList() {
  return {
    title: "Joe Rogan- MMA Show",
    author: "Alexander Knysh",
    description: "MMA fighters  on the Joe Rogan podcast, from most recent to oldest.",
    isRanked: false,
    episodes: buildEpisodes(),
  };
}

export default async function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await params;
  const list = getMockList();

  return (
    <>
      <SiteNav />

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>{list.title}</h1>
          <div className={styles.byline}>by {list.author}</div>
        </div>

        <ListDetailClient episodes={list.episodes} isRanked={list.isRanked} description={list.description} />
      </main>

      <SiteFooter />
    </>
  );
}
