import { Hero } from "@/components/Hero";
import { PopularLists } from "@/components/PopularLists";
import { PopularPodcasts } from "@/components/PopularPodcasts";
import { PopularReviews } from "@/components/PopularReviews";
import { RatingsExplained } from "@/components/RatingsExplained";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { WhatIsPodtracker } from "@/components/WhatIsPodtracker";
import {
  POPULAR_LISTS,
  POPULAR_PODCASTS,
  POPULAR_REVIEWS,
} from "@/lib/placeholder-data";

/**
 * The signed-out landing page, assembled in the order of the Figma frames:
 * nav (2), hero + popular podcasts (1), what is Podtracker (3),
 * ratings + popular reviews (4), popular lists + footer (5).
 */
export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <PopularPodcasts podcasts={POPULAR_PODCASTS} />
        <WhatIsPodtracker />
        <RatingsExplained />
        <PopularReviews reviews={POPULAR_REVIEWS} />
        <PopularLists lists={POPULAR_LISTS} />
      </main>
      <SiteFooter />
    </>
  );
}
