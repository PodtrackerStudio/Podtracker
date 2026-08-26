"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { hrefForSearchItem, subtitleForSearchItem, type SearchItem } from "@/lib/search";
import { useSearchResults } from "./useSearchResults";
import { SearchIcon } from "./icons";

/**
 * The nav search.
 *
 * `onSelect` is what the "+ Log podcast" page uses: same markup, same classes,
 * same live results, but picking one hands the item back instead of navigating.
 * Left off, it behaves exactly as the nav always has.
 */
export function SearchBox({ onSelect, placeholder = "Search…" }: { onSelect?: (item: SearchItem) => void; placeholder?: string } = {}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches = useSearchResults(value);

  function choose(item: SearchItem) {
    setOpen(false);
    if (onSelect) {
      setValue("");
      onSelect(item);
      return;
    }
    router.push(hrefForSearchItem(item));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      // With a select handler there is no results page to fall through to, so
      // Enter takes the top match instead.
      if (onSelect) {
        if (matches.length > 0) choose(matches[0]);
        return;
      }
      if (!value.trim()) return;
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(value.trim())}`);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="nav-search-wrap">
      <div className="nav-search">
        <SearchIcon />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimeout.current = setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={handleKeyDown}
        />
      </div>

      {open && matches.length > 0 && (
        <div className="search-dropdown">
          {matches.map((item) => (
            <a
              key={item.id}
              className="search-dropdown-item"
              href={hrefForSearchItem(item)}
              onMouseDown={(e) => {
                // onMouseDown fires before the input's onBlur, so the click isn't lost.
                e.preventDefault();
                if (blurTimeout.current) clearTimeout(blurTimeout.current);
                choose(item);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="search-dropdown-thumb" src={item.cover} alt="" />
              <div>
                <div className="search-dropdown-title">{item.title}</div>
                <div className="search-dropdown-subtitle">{subtitleForSearchItem(item)}</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
