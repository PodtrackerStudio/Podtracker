"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddPodcastsBar } from "@/components/AddPodcastsBar";
import { LogReviewPopup } from "@/components/LogReviewPopup";
import type { SearchItem } from "@/lib/search";
import styles from "./log.module.css";

/**
 * "+ Log podcast": search, pick, then the review popup.
 *
 * Both halves are existing components rather than lookalikes.
 *
 * **The search is the Next listening bar**, not the nav's — Sasha's call, and
 * the reason is the scope control. The nav search only surfaces episodes once a
 * query reaches past a show's name, so "joe rogan" gives you the show and no
 * way to reach its episodes. This bar carries All media / Shows only /
 * Episodes only, so both are always reachable. Here it runs in pick mode: it
 * hands the chosen item back instead of adding it to anything.
 *
 * `LogReviewPopup` is the same screen "Add Log / Review" opens on a podcast
 * page. Picking an episode logs the episode; picking a show logs the show.
 */
export function LogClient({ username }: { username: string }) {
  const router = useRouter();
  const [picked, setPicked] = useState<SearchItem | null>(null);

  return (
    <>
      <div className={styles.searchRow}>
        <AddPodcastsBar onSelect={setPicked} placeholder="Search a show or episode…" />
      </div>
      <p className={styles.hint}>Pick what you listened to.</p>

      {/* Picking opens the popup straight away — there is no in-between
          confirmation step. Closing it without saving returns to the search. */}
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
