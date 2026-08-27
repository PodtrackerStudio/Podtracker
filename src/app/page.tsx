import { redirect } from "next/navigation";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { getCurrentUser } from "@/lib/auth";
import { getPopularPodcasts } from "@/lib/popularPodcasts";
import { TypedText } from "./TypedText";
import { WhatIsPodtracker } from "./WhatIsPodtracker";
import styles from "./landing.module.css";

const ratingTiers = [
  { name: "Highly recommend", color: "var(--highly-recommend)" },
  { name: "Recommend", color: "var(--recommend)" },
  { name: "Ok", color: "var(--ok)" },
  { name: "Don't recommend", color: "var(--dont)" },
  { name: "Didn't finish", color: "var(--didnt-finish)" },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/home");

  const popularPodcasts = await getPopularPodcasts();

  return (
    <main className={styles.page}>
      {/* HERO */}
      <section className={styles.hero}>
        <h1>
          <TypedText text="Welcome to Podtracker!" />
        </h1>
        <div className={styles.heroCta}>
          <Link href="/signup" className={styles.btnPrimary}>
            Create account
          </Link>
          <Link href="/login" className={styles.btnSecondary}>
            Login
          </Link>
        </div>
      </section>

      {/* POPULAR PODCASTS */}
      <section>
        <h2 className={styles.sectionTitle}>Popular podcasts</h2>
        <div className={styles.podcastGrid}>
          {popularPodcasts.map((p) => (
            <Link className={styles.podcastCard} href={`/podcast/${p.id}`} key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.artworkUrl} alt={p.title} />
            </Link>
          ))}
        </div>
      </section>

      {/* WHAT IS — shared with /about, which is where the footer's About Us
          goes. Same component, so the two can't drift. */}
      <WhatIsPodtracker />

      {/* RATINGS EXPLAINED */}
      <section>
        <h2 className={styles.sectionTitle}>Ratings explained</h2>
        <p className={styles.ratingsIntro}>
          Instead of a 5 star rating scale, Podtracker offers a unique rating system, using five distinct categories.
          Each show and episode will receive an average rating based on user responses.
        </p>
        <div className={styles.ratingTierList}>
          {ratingTiers.map((t) => (
            <div className={`${styles.ratingTierName} rating-label`} style={{ color: t.color }} key={t.name}>
              {t.name}
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
