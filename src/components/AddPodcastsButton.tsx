"use client";

import { useState } from "react";
import { PlusIcon } from "./icons";
import { AddPodcastsPopup } from "./AddPodcastsPopup";

/**
 * Renders one of the site's "+" controls and opens the Add podcasts picker.
 *
 * Exists because the pages carrying these buttons are server components and the
 * popup needs client state. `className` and `iconSize` are passed in so each
 * call site keeps the styling it already had.
 */
export function AddPodcastsButton({
  label,
  className,
  iconSize,
  popupTitle,
  iconAfter = false,
}: {
  label: string;
  className?: string;
  iconSize?: number;
  popupTitle?: string;
  /** Following's empty state puts the + after the label; the others before. */
  iconAfter?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {!iconAfter && <PlusIcon size={iconSize} />}
        {label}
        {iconAfter && <PlusIcon size={iconSize} />}
      </button>
      {open && <AddPodcastsPopup title={popupTitle} onClose={() => setOpen(false)} />}
    </>
  );
}
