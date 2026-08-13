import { redirect } from "next/navigation";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { getCurrentUser } from "@/lib/auth";
import { getPopularPodcasts } from "@/lib/popularPodcasts";
import styles from "./landing.module.css";

const features = [
  "Rate episodes and allow other users to know whether a show or episode is worth watching or a skip.",
  "Create lists to organize episodes or shows based on your own selected categories.",
  "Write reviews for episodes and share your thoughts to the world.",
  "Follow accounts and discover new podcasts in the process.",
];

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
        <h1>Welcome to Podtracker!</h1>
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

      {/* WHAT IS */}
      <section className={styles.whatIsSection}>
        <h2 className={styles.sectionTitle}>What is Podtracker?</h2>
        <div className={styles.whatIsBox}>
          We are a social platform dedicated to providing a community for podcast listeners to track and organize
          their listening activity and share their recommendations on what they&apos;ve been listening to with other
          users.
        </div>
        <div className={styles.featuresGrid}>
          {features.map((f) => (
            <div className={styles.featureItem} key={f}>
              {f}
            </div>
          ))}
        </div>
      </section>

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
