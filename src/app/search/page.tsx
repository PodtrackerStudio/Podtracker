import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { search, hrefForSearchItem, subtitleForSearchItem, type SearchItem } from "@/lib/search";
import styles from "./search.module.css";

export const metadata: Metadata = {
  title: "Search",
  // Search result pages are the classic way to fill an index with thousands of
  // near-identical thin pages, one per query string. Google's own guidance is
  // to keep them out.
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const { topResult, otherResults } = await search(query, "all", { includeUsers: true });

  // Members get their own section rather than sitting among cover art. Pulled
  // back out of the combined list so the catalogue results keep iTunes' own
  // ranking, which is better than anything re-sortable here.
  const userResults = otherResults.filter((item) => item.type === "user");
  const mediaResults = otherResults.filter((item) => item.type !== "user");

  return (
    <>
      <SiteNav />

      <main className={styles.main}>
        <div className={styles.showingFor}>Showing results for &ldquo;{query}&rdquo;</div>

        {!topResult && <p className={styles.noResults}>No results found.</p>}

        {topResult && (
          <section>
            <h2 className={styles.sectionTitle}>Top result</h2>
            <Link className={styles.topResultCard} href={hrefForSearchItem(topResult)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={
                  topResult.type === "user"
                    ? `${styles.topResultCover} ${styles.topResultCoverUser}`
                    : styles.topResultCover
                }
                src={topResult.cover}
                alt={topResult.type === "user" ? "" : topResult.title}
              />
              <div>
                <div className={styles.topResultTitle}>{topResult.title}</div>
                <div className={styles.topResultSubtitle}>{subtitleForSearchItem(topResult)}</div>
              </div>
            </Link>
          </section>
        )}

        {userResults.length > 0 && (
          <section>
            <h2 className={styles.sectionTitle}>Users</h2>
            <div className={styles.resultsList}>
              {userResults.map((item: SearchItem) => (
                <Link className={styles.resultCard} href={hrefForSearchItem(item)} key={item.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className={`${styles.resultCover} ${styles.resultCoverUser}`}
                    src={item.cover}
                    alt=""
                  />
                  <div>
                    <div className={styles.resultTitle}>{item.title}</div>
                    <div className={styles.resultSubtitle}>{subtitleForSearchItem(item)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {mediaResults.length > 0 && (
          <section>
            <h2 className={styles.sectionTitle}>Other results</h2>
            <div className={styles.resultsList}>
              {mediaResults.map((item: SearchItem) => (
                <Link className={styles.resultCard} href={hrefForSearchItem(item)} key={item.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.resultCover} src={item.cover} alt={item.title} />
                  <div>
                    <div className={styles.resultTitle}>{item.title}</div>
                    <div className={styles.resultSubtitle}>{subtitleForSearchItem(item)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
