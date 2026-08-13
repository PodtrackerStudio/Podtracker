"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@/components/icons";
import styles from "./settings.module.css";

type User = {
  username: string;
  email: string;
  displayName: string;
  externalLink: string | null;
  bio: string | null;
  avatarUrl: string | null;
};

export function SettingsForm({ user }: { user: User }) {
  const router = useRouter();
  const [tab, setTab] = useState<"display" | "auth">("display");

  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [externalLink, setExternalLink] = useState(user.externalLink ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [avatarChanged, setAvatarChanged] = useState(false);

  const [status, setStatus] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(reader.result as string);
      setAvatarChanged(true);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setStatus(null);
    setSaving(true);

    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        email,
        displayName,
        externalLink,
        bio,
        ...(avatarChanged ? { avatarUrl } : {}),
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setStatus({ type: "error", text: data.error ?? "Something went wrong." });
      return;
    }

    setStatus({ type: "success", text: "Saved." });
    if (data.username !== user.username) {
      router.push(`/user/${data.username}`);
    } else {
      router.refresh();
    }
  }

  return (
    <>
      <div className={styles.tabs}>
        <button className={tab === "display" ? styles.active : undefined} onClick={() => setTab("display")}>
          Display
        </button>
        <button className={tab === "auth" ? styles.active : undefined} onClick={() => setTab("auth")}>
          Authentication
        </button>
      </div>

      {tab === "display" ? (
        <>
          <div className={styles.avatarWrap}>
            <button className={styles.avatarButton} onClick={() => fileInputRef.current?.click()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.avatarImg} src={avatarUrl ?? "/default-avatar.webp"} alt="Profile picture" />
              <div className={styles.avatarOverlay}>
                <PlusIcon size={28} />
              </div>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
            <div className={styles.avatarLabel}>Add profile picture</div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="username">Username</label>
              <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="displayName">Display name</label>
              <input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="links">Links</label>
              <input id="links" value={externalLink} onChange={(e) => setExternalLink(e.target.value)} placeholder="e.g. Youtube.com" />
            </div>
          </div>

          <div className={styles.bioField}>
            <label htmlFor="bio">Bio (Write here)</label>
            <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>

          {status && <div className={`${styles.statusMsg} ${styles[status.type]}`}>{status.text}</div>}

          <div className={styles.saveRow}>
            <button className={styles.saveButton} onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </>
      ) : (
        <p className={styles.placeholder}>Authentication settings (password change, etc.) haven&apos;t been designed yet — check back soon.</p>
      )}
    </>
  );
}
