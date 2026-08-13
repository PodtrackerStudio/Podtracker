"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { quickSearch, subtitleForSearchItem } from "@/lib/search";
import type { SearchItem } from "@/lib/searchData";
import { PlusIcon } from "@/components/icons";
import styles from "../app/user/[username]/profileSub.module.css";

export function AddFavoriteButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches: SearchItem[] = query.trim() ? quickSearch(query).filter((i) => i.type === "podcast") : [];

  async function addFavorite(item: SearchItem) {
    if (item.type !== "podcast") return;
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ podcastId: item.id }),
    });
    setOpen(false);
    setQuery("");
    router.refresh();
  }

  if (!open) {
    return (
      <button className={styles.emptyAction} onClick={() => setOpen(true)}>
        Add favorites
        <PlusIcon size={26} />
      </button>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        autoFocus
        placeholder="Search for a podcast…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => {
          blurTimeout.current = setTimeout(() => setOpen(false), 150);
        }}
        style={{
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: "8px 20px",
          fontSize: 14,
          fontFamily: "inherit",
          width: 280,
          textAlign: "center",
          outline: "none",
        }}
      />
      {matches.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: 320,
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.13)",
            overflow: "hidden",
            zIndex: 50,
          }}
        >
          {matches.map((item) => (
            <button
              key={item.id}
              onMouseDown={(e) => {
                e.preventDefault();
                if (blurTimeout.current) clearTimeout(blurTimeout.current);
                addFavorite(item);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderBottom: "1px solid var(--border)",
                width: "100%",
                background: "none",
                border: "none",
                textAlign: "left",
                fontFamily: "inherit",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.cover} alt="" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4, background: "#ccc", flexShrink: 0 }} />
              <div>
                <div>{item.title}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{subtitleForSearchItem(item)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
