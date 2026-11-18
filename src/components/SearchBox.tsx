"use client";

import { useEffect, useId, useState, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { hrefForSearchItem, subtitleForSearchItem, type SearchScope } from "@/lib/searchItem";
import { useSearchResultsState } from "./useSearchResults";
import { SearchIcon } from "./icons";
import { artworkAt } from "@/lib/artwork";

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

/** True when a keypress is going into something the person is typing in. */
function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

export function SearchBox() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<SearchScope>("all");
  // Which result the arrow keys are on; -1 is none, so Enter means "all results".
  const [highlight, setHighlight] = useState(-1);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  // Members included here, unlike the add bars: this search navigates rather
  // than adding something to a collection, so a person is a valid destination.
  const { results: matches, loading } = useSearchResultsState(value, 5, scope, { includeUsers: true });
  const q = value.trim();

  // "/" from anywhere on the page jumps to search, as on most sites with one.
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function go(href: string) {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    setOpen(false);
    setHighlight(-1);
    inputRef.current?.blur();
    router.push(href);
  }

  function goToResultsPage() {
    if (!q) return;
    go(`/search?q=${encodeURIComponent(q)}`);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (matches.length ? (h + 1) % matches.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (matches.length ? (h <= 0 ? matches.length - 1 : h - 1) : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const picked = matches[highlight];
      if (open && picked) go(hrefForSearchItem(picked));
      else goToResultsPage();
    } else if (e.key === "Escape") {
      if (open) setOpen(false);
      else inputRef.current?.blur();
    }
  }

  const showDropdown = open && q;
  const activeId = showDropdown && highlight >= 0 && matches[highlight] ? `${listId}-${highlight}` : undefined;

  return (
    <div className="nav-search-wrap">
      <div className="nav-search" onClick={() => inputRef.current?.focus()}>
        <SearchIcon />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search podcasts, people…"
          aria-label="Search podcasts, episodes and people"
          role="combobox"
          aria-expanded={Boolean(showDropdown)}
          aria-controls={listId}
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
            setHighlight(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimeout.current = setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={handleKeyDown}
        />
        {value ? (
          <button
            type="button"
            className="nav-search-clear"
            aria-label="Clear search"
            // onMouseDown so the input keeps focus and the dropdown stays put.
            onMouseDown={(e) => {
              e.preventDefault();
              setValue("");
              setHighlight(-1);
              inputRef.current?.focus();
            }}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        ) : (
          <kbd className="nav-search-kbd" aria-hidden="true">
            /
          </kbd>
        )}
      </div>

      {/* Stays open with no results too, so the filter is still reachable when
          a filter is what emptied the list — same as the add bars. */}
      {showDropdown && (
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
                  setHighlight(-1);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div id={listId} role="listbox" aria-label="Search results" className="search-dropdown-list">
            {matches.length === 0 && (
              <div className="search-dropdown-empty">{loading ? "Searching…" : "No matches."}</div>
            )}

            {matches.map((item, i) => (
              <a
                key={item.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === highlight}
                className={i === highlight ? "search-dropdown-item search-dropdown-item-active" : "search-dropdown-item"}
                href={hrefForSearchItem(item)}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  // onMouseDown fires before the input's onBlur, so the click isn't lost.
                  e.preventDefault();
                  go(hrefForSearchItem(item));
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async"
                  className={
                    item.type === "user"
                      ? "search-dropdown-thumb search-dropdown-thumb-user"
                      : "search-dropdown-thumb"
                  }
                  src={artworkAt(item.cover, 44)}
                  alt=""
                />
                <div className="search-dropdown-text">
                  <div className="search-dropdown-title">{item.title}</div>
                  <div className="search-dropdown-subtitle">{subtitleForSearchItem(item)}</div>
                </div>
              </a>
            ))}
          </div>

          {/* The results page was reachable only by pressing Enter, which
              nothing on screen said. */}
          <a
            className="search-dropdown-all"
            href={`/search?q=${encodeURIComponent(q)}`}
            onMouseDown={(e) => {
              e.preventDefault();
              goToResultsPage();
            }}
          >
            See all results for <strong>&ldquo;{q}&rdquo;</strong>
            <span aria-hidden="true">→</span>
          </a>
        </div>
      )}
    </div>
  );
}
