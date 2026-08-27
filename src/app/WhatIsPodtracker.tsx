import styles from "./landing.module.css";

const features = [
  "Rate episodes and allow other users to know whether a show or episode is worth watching or a skip.",
  "Create lists to organize episodes or shows based on your own selected categories.",
  "Write reviews for episodes and share your thoughts to the world.",
  "Follow accounts and discover new podcasts in the process.",
];

/**
 * The "What is Podtracker?" section — the intro box and the four feature tiles.
 *
 * Rendered in two places on purpose (Sasha, 2026-08-27): in its usual spot on
 * the landing page, and alone at `/about`, which is where the footer's About Us
 * goes. It lives here rather than inline in the landing page so the two can't
 * drift apart, and it keeps `landing.module.css` as the one home for its styles.
 *
 * Everything below has its own max-width and `margin: 0 auto`, so it drops into
 * any page without a layout wrapper.
 */
export function WhatIsPodtracker({ headingAs = "h2" }: { headingAs?: "h1" | "h2" }) {
  // On /about this section is the page, so its title is the page's h1 there and
  // a section heading on the landing page. Same styling either way.
  const Heading = headingAs;

  return (
    <section id="what-is-podtracker" className={styles.whatIsSection}>
      <Heading className={styles.sectionTitle}>What is Podtracker?</Heading>
      <div className={styles.whatIsBox}>
        We are a social platform dedicated to providing a community for podcast listeners to track and organize their
        listening activity and share their recommendations on what they&apos;ve been listening to with other users.
      </div>
      <div className={styles.featuresGrid}>
        {features.map((f) => (
          <div className={styles.featureItem} key={f}>
            {f}
          </div>
        ))}
      </div>
    </section>
  );
}
