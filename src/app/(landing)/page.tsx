import { redirect } from "next/navigation";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { getCurrentUser } from "@/lib/auth";
import { getPopularPodcasts } from "@/lib/popularPodcasts";
import { HeroIntro } from "../HeroIntro";
import { WhatIsPodtracker } from "../WhatIsPodtracker";
import styles from "../landing.module.css";

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
        {/* Headline plus the subheading that fades in once it has typed out.
            They share a component because only TypedText knows when that is —
            see HeroIntro. */}
        <HeroIntro />
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
              <img loading="lazy" decoding="async" src={p.artworkUrl} alt={p.title} />
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

      {/* Fazier launch badge, added 2026-11-16 for the launch. Sasha's snippet
          converted to JSX; the only change to it is `rel` on the link, which
          `target="_blank"` needs so the opened page cannot reach back through
          `window.opener`.

          The doubled slash in `/api/v1//public/` is Fazier's own, kept
          verbatim — do not "fix" it without checking the badge still loads.

          Width is 180 rather than the 250 Fazier's snippet specifies: Sasha
          asked for it smaller. It is the one number to change.

          Not from a Figma frame — there is no frame for a third-party launch
          badge. Sits at the foot of the page, after the ratings and above the
          footer, where Sasha asked for it. */}
      <a
        className={styles.launchBadge}
        href="https://fazier.com/launches/www.podtracker.studio"
        target="_blank"
        rel="noopener noreferrer"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img loading="lazy" decoding="async"
          src="https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=featured&theme=light"
          width={180}
          alt="Podtracker featured on Fazier"
        />
      </a>

      <SiteFooter />
    </main>
  );
}
