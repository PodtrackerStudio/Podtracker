"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@/components/icons";
import { PASSWORD_HINT } from "@/lib/passwordPolicy";
import { usernameToPath } from "@/lib/routeParams";
import styles from "./settings.module.css";
import { ThemeEditor } from "./ThemeEditor";
import type { Theme } from "@/lib/theme";

const AVATAR_MAX_SIDE = 400;

type User = {
  username: string;
  email: string;
  displayName: string;
  externalLink: string | null;
  bio: string | null;
  avatarUrl: string | null;
};

export function SettingsForm({ user, theme }: { user: User; theme: Theme }) {
  const router = useRouter();
  const [tab, setTab] = useState<"display" | "theme" | "auth">("display");

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

  // Authentication tab
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwStatus, setPwStatus] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [changingPw, setChangingPw] = useState(false);

  async function handleChangePassword() {
    setPwStatus(null);
    setChangingPw(true);

    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });

    const data = await res.json().catch(() => null);
    setChangingPw(false);

    if (!res.ok) {
      setPwStatus({ type: "error", text: data?.error ?? "Something went wrong." });
      return;
    }

    // Clear the fields so the new password isn't left sitting in the form.
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPwStatus({ type: "success", text: "Password changed. Any other devices have been signed out." });
  }

  /**
   * Shrinks the chosen picture before it is saved.
   *
   * Avatars are stored as data URIs and sent inside every page that shows one,
   * so a phone photo saved as-is cost megabytes on every one of those pages:
   * the largest on 2026-11-06 was 3.9 MB. Nothing displays an avatar wider
   * than about 200px, so 400px on the longest side stays sharp on a retina
   * screen at a few tens of KB. WebP keeps transparency; browsers that cannot
   * encode it fall back to JPEG on white.
   */
  function shrinkImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, AVATAR_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let data = canvas.toDataURL("image/webp", 0.85);
        if (!data.startsWith("data:image/webp")) {
          ctx.globalCompositeOperation = "destination-over";
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          data = canvas.toDataURL("image/jpeg", 0.85);
        }
        resolve(data);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("unreadable image"));
      };
      img.src = url;
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setAvatarUrl(await shrinkImage(file));
      setAvatarChanged(true);
    } catch {
      setStatus({ type: "error", text: "That picture couldn't be read. Try a PNG, JPEG or WebP." });
    }
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

    const data = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok || !data) {
      setStatus({ type: "error", text: data?.error ?? "Something went wrong." });
      return;
    }

    // A new email only takes effect once its confirmation link is clicked, so
    // put the field back to the address that still works for logging in.
    if (data.emailPending) {
      setEmail(user.email);
      setStatus({
        type: "success",
        text: `Saved. We've sent a link to ${data.emailPending}. Your email changes once you click it, so keep logging in with ${user.email} until then.`,
      });
    } else {
      setStatus({ type: "success", text: "Saved." });
    }
    if (data.username !== user.username) {
      router.push(`/user/${usernameToPath(data.username)}`);
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
        <button className={tab === "theme" ? styles.active : undefined} onClick={() => setTab("theme")}>
          Theme
        </button>
        <button className={tab === "auth" ? styles.active : undefined} onClick={() => setTab("auth")}>
          Authentication
        </button>
      </div>

      {tab === "theme" ? (
        <ThemeEditor initial={theme} />
      ) : tab === "display" ? (
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
        <>
          <h2 className={styles.subheading}>Change password</h2>

          <div className={styles.authField}>
            <label htmlFor="currentPassword">Current Password</label>
            <input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>

          <div className={styles.authField}>
            <label htmlFor="newPassword">New Password</label>
            <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            {/* This form had no hint at all, so changing a password was the one
                place the rules were entirely invisible until you broke one. */}
            <div className={styles.fieldHint}>{PASSWORD_HINT}</div>
          </div>

          <div className={styles.authField}>
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>

          {pwStatus && <div className={`${styles.statusMsg} ${styles[pwStatus.type]}`}>{pwStatus.text}</div>}

          <div className={styles.saveRow}>
            <button className={styles.saveButton} onClick={handleChangePassword} disabled={changingPw}>
              {changingPw ? "Saving…" : "Change password"}
            </button>
          </div>
        </>
      )}
    </>
  );
}
