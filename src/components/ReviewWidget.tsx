"use client";

import { useState } from "react";
import { LogReviewPopup } from "./LogReviewPopup";

/**
 * "Add Log / Review" on a podcast or episode page.
 *
 * The popup itself lives in `LogReviewPopup`, shared with the "+ Log podcast"
 * flow so both open the same screen rather than two that resemble each other.
 * This is just the button that opens it.
 */
export function ReviewWidget({
  buttonClassName,
  externalId,
  episodeKey,
}: {
  buttonClassName: string;
  externalId: string;
  /** Present on episode pages; absent logs the show itself. */
  episodeKey?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={buttonClassName} onClick={() => setOpen(true)}>
        Add Log / Review
      </button>

      {/* Keyed on `open` so each opening starts from today's date and an empty
          review, which is what remounting gives for free. */}
      {open && <LogReviewPopup externalId={externalId} episodeKey={episodeKey} onClose={() => setOpen(false)} />}
    </>
  );
}
