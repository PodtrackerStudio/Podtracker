"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";
import styles from "../signup/auth.module.css";

export function ResetPasswordForm() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setErrorMsg("The passwords don't match.");
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword, confirmPassword }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setErrorMsg(data?.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    setDone(true);
    setSubmitting(false);
    // The reset link already signed them in, so there is nowhere to log in
    // again — send them into the site.
    router.refresh();
  }

  if (done) {
    return (
      <div className={styles.authWrap}>
        <h1>Password changed</h1>
        <p className={styles.authNote}>You&apos;re signed in with your new password.</p>
        <div className={styles.authSwitch}>
          <Link href="/home">Go to your feed</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.authWrap}>
      <h1>Set a new password</h1>
      <form onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="new-password">New password</label>
          <input
            type="password"
            id="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoFocus
          />
          <div className={styles.fieldHint}>At least {MIN_PASSWORD_LENGTH} characters.</div>
        </div>
        <div className={styles.field}>
          <label htmlFor="confirm-password">Confirm new password</label>
          <input
            type="password"
            id="confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
          />
        </div>
        {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}
        <button type="submit" className={styles.btnPrimary} disabled={submitting}>
          {submitting ? "Saving…" : "Save new password"}
        </button>
      </form>
    </div>
  );
}
