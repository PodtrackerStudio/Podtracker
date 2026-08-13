"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../app/user/[username]/profileSub.module.css";

export function FavoriteCard({ podcastId, title, cover, canRemove }: { podcastId: string; title: string; cover: string | null; canRemove: boolean }) {
  const router = useRouter();

  async function remove(e: React.MouseEvent) {
    e.preventDefault();
    await fetch("/api/favorites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ podcastId }),
    });
    router.refresh();
  }

  return (
    <Link className={styles.card} href={`/podcast/${podcastId}`}>
      <div style={{ position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.cover} src={cover ?? "https://picsum.photos/seed/favdefault/300/300"} alt={title} />
        {canRemove && (
          <button
            onClick={remove}
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              border: "none",
              borderRadius: "50%",
              width: 24,
              height: 24,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            ✕
          </button>
        )}
      </div>
      <div className={styles.cardTitle}>{title}</div>
    </Link>
  );
}
