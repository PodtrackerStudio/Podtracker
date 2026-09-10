import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const metadata: Metadata = {
  // Cut from the MVP and unlinked from the nav, but the route still resolves.
  // Indexing it would put a page in results that the site itself does not
  // consider part of the site.
  title: "Genres",
  robots: { index: false, follow: false },
};

export default function GenresPage() {
  return <ComingSoonPage title="Genres" />;
}
