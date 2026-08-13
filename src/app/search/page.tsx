import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { search, hrefForSearchItem, subtitleForSearchItem } from "@/lib/search";
import styles from "./search.module.css";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const { topResult, otherResults } = search(query);

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
              <img className={styles.topResultCover} src={topResult.cover} alt={topResult.title} />
              <div>
                <div className={styles.topResultTitle}>{topResult.title}</div>
                <div className={styles.topResultSubtitle}>{subtitleForSearchItem(topResult)}</div>
              </div>
            </Link>
          </section>
        )}

        {otherResults.length > 0 && (
          <section>
            <h2 className={styles.sectionTitle}>Other results</h2>
            <div className={styles.resultsList}>
              {otherResults.map((item) => (
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
