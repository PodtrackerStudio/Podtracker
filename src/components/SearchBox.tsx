"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { hrefForSearchItem, subtitleForSearchItem, type SearchScope } from "@/lib/searchItem";
import { useSearchResults } from "./useSearchResults";
import { SearchIcon } from "./icons";

/**
 * The same filter the add bars carry, plus Users.
 *
 * "All" rather than the add bars' "All media", because here it also returns
 * people and calling a person media would be wrong.
 */
const SCOPES: { value: SearchScope; label: string }[] = [
  { value: "all", label: "All" },
  { value: "shows", label: "Shows only" },
  { value: "episodes", label: "Episodes only" },
  { value: "users", label: "Users" },
];

export function SearchBox() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<SearchScope>("all");
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Members included here, unlike the add bars: this search navigates rather
  // than adding something to a collection, so a person is a valid destination.
  const matches = useSearchResults(value, 5, scope, { includeUsers: true });

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

      {/* Stays open with no results too, so the filter is still reachable when
          a filter is what emptied the list — same as the add bars. */}
      {open && value.trim() && (
        <div className="search-dropdown">
          <div className="search-scope-row" role="group" aria-label="Filter results">
            {SCOPES.map((s) => (
              <button
                key={s.value}
                type="button"
                className={
                  s.value === scope ? "search-scope-button search-scope-active" : "search-scope-button"
                }
                aria-pressed={s.value === scope}
                // onMouseDown, not onClick: the input's onBlur would close the
                // dropdown before a click landed, so the filter would never change.
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (blurTimeout.current) clearTimeout(blurTimeout.current);
                  setScope(s.value);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {matches.length === 0 && <div className="search-dropdown-empty">No matches.</div>}

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
              <img
                className={
                  item.type === "user"
                    ? "search-dropdown-thumb search-dropdown-thumb-user"
                    : "search-dropdown-thumb"
                }
                src={item.cover}
                alt=""
              />
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
