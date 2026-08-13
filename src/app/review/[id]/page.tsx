import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import styles from "../review.module.css";

type ReviewTier = "highly" | "recommend" | "ok" | "dont";

function getMockReview(id: string): {
  episodeTitle: string;
  podcastTitle: string;
  cover: string;
  reviewerName: string;
  date: string;
  tier: ReviewTier;
  tierLabel: string;
  text: string;
} {
  if (id === "matt-shane-393") {
    return {
      episodeTitle: "Ep 393 The Presidents (Feat Louis C.K.)",
      podcastTitle: "Matt and Shane's secret podcast",
      cover: "/explore/matt-and-shane.jpg",
      reviewerName: "Alexander Knysh",
      date: "7/31/26",
      tier: "highly",
      tierLabel: "Highly Recommend",
      text: "A fantastic blend of humor and information, While Neither Shane nor Louis are experts on history, that is exactly what makes the episode so fun. Seeing historical figures be described in such vulgar and brutally honest ways, make their characters and actions more interesting to learn about, and will likely make someone, who's only experience with history is boring classrooms, potentially seek out more of the subject. Hope that the rest of the shows are just as good.",
    };
  }

  return {
    episodeTitle: "Untitled episode",
    podcastTitle: "Unknown podcast",
    cover: "https://picsum.photos/seed/review-fallback/200/200",
    reviewerName: "Anonymous",
    date: "",
    tier: "recommend",
    tierLabel: "Recommend",
    text: "No review text available.",
  };
}

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const review = getMockReview(id);

  return (
    <>
      <SiteNav />

      <main className={styles.main}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.cover} src={review.cover} alt={review.episodeTitle} />
        <h1 className={styles.episodeTitle}>{review.episodeTitle}</h1>
        <div className={styles.podcastTitle}>{review.podcastTitle}</div>

        <div className={styles.metaRow}>
          <span className={styles.reviewerName}>Review by {review.reviewerName}</span>
          <span className={styles.date}>Date: {review.date}</span>
        </div>

        <div className={`${styles.ratingTag} ${styles[review.tier]}`}>{review.tierLabel}</div>

        <p className={styles.reviewText}>{review.text}</p>
      </main>

      <SiteFooter />
    </>
  );
}
