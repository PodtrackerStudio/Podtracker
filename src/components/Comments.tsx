"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./comments.module.css";

export type CommentView = {
  id: string;
  text: string;
  authorName: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
};

/**
 * Comment section for a review or a list.
 *
 * Existing comments are rendered server-side and passed in; only posting is
 * client-side. After a successful post it calls `router.refresh()` so the new
 * comment comes back from the server rather than being optimistically faked —
 * a comment that appears and then vanishes on reload would be worse than a
 * moment's wait.
 */
export function Comments({
  comments,
  logEntryId,
  listId,
  canComment,
}: {
  comments: CommentView[];
  logEntryId?: string;
  listId?: string;
  /** False when nobody is signed in — the box is replaced with a prompt. */
  canComment: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const body = text.trim();
    if (!body || saving) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logEntryId, listId, text: body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Could not post that comment.");
        return;
      }
      setText("");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.wrap}>
      <h2 className={styles.heading}>Comments</h2>

      {comments.length === 0 ? (
        <p className={styles.empty}>No comments yet.</p>
      ) : (
        <div className={styles.list}>
          {comments.map((c) => (
            <div className={styles.comment} key={c.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.avatar} src={c.authorAvatarUrl ?? "/default-avatar.webp"} alt="" />
              <span className={styles.author}>{c.authorName}</span>
              <p className={styles.text}>{c.text}</p>
            </div>
          ))}
        </div>
      )}

      <h3 className={styles.addHeading}>Add comment</h3>

      {canComment ? (
        <>
          <textarea
            className={styles.input}
            placeholder="Enter comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
          />
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.submitRow}>
            <button className={styles.submit} onClick={submit} disabled={saving || !text.trim()}>
              {saving ? "Posting…" : "Submit"}
            </button>
          </div>
        </>
      ) : (
        <p className={styles.empty}>Log in to leave a comment.</p>
      )}
    </section>
  );
}
