"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { hrefForSearchItem, subtitleForSearchItem } from "@/lib/search";
import { useSearchResults } from "./useSearchResults";
import { SearchIcon } from "./icons";

export function SearchBox() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches = useSearchResults(value);

  function goToResultsPage() {
    if (!value.trim()) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(value.trim())}`);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      goToResultsPage();
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
          placeholder="Search…"
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
                setOpen(false);
                router.push(hrefForSearchItem(item));
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
