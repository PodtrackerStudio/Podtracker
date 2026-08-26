"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchBox } from "@/components/SearchBox";
import { LogReviewPopup } from "@/components/LogReviewPopup";
import type { SearchItem } from "@/lib/search";
import styles from "./log.module.css";

/**
 * "+ Log podcast": search, pick, then the review popup.
 *
 * Both halves are the existing components rather than lookalikes — `SearchBox`
 * is the nav's search with a select handler instead of navigation, and
 * `LogReviewPopup` is the same screen "Add Log / Review" opens on a podcast
 * page. That was Sasha's instruction: copy the nav search, then show the review
 * screen.
 *
 * Episodes come through as well as shows, because the nav search returns both
 * once a query reaches past a show's name. Picking an episode logs the episode;
 * picking a show logs the show. `/api/log` already accepted either.
 */
export function LogClient({ username }: { username: string }) {
  const router = useRouter();
  const [picked, setPicked] = useState<SearchItem | null>(null);

  return (
    <>
      <div className={styles.searchRow}>
        <SearchBox onSelect={setPicked} placeholder="Search a show or episode…" />
      </div>
      <p className={styles.hint}>Pick what you listened to.</p>

      {/* Picking opens the popup straight away — there is no in-between
          confirmation step, so `picked` being set and the popup being open are
          the same thing. Closing it without saving returns to the search. */}
      {picked && (
        <LogReviewPopup
          externalId={picked.type === "episode" ? picked.showExternalId : picked.id}
          episodeKey={picked.type === "episode" ? picked.episodeKey : undefined}
          onClose={() => setPicked(null)}
          onSaved={() => {
            setPicked(null);
            // Land on the diary so the entry just written is visible; closing
            // onto an empty search box reads as though nothing was saved.
            router.push(`/user/${username}/diary`);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
