"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import styles from "../signup/auth.module.css";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      setErrorMsg("Please enter your email address.");
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setErrorMsg(data?.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    // Shown whether or not the address has an account — see the route.
    setSent(true);
    setSubmitting(false);
  }

  if (sent) {
    return (
      <div className={styles.authWrap}>
        <h1>Check your email</h1>
        <p className={styles.authNote}>
          If there&apos;s an account for <strong>{email.trim()}</strong>, we&apos;ve sent a link to
          reset your password. It expires in an hour.
        </p>
        <p className={styles.authNote}>
          Nothing arrived? Check your spam folder, or{" "}
          <button type="button" className={styles.linkButton} onClick={() => setSent(false)}>
            try a different address
          </button>
          .
        </p>
        <div className={styles.authSwitch}>
          <Link href="/login">Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.authWrap}>
      <h1>Reset password</h1>
      <p className={styles.authNote}>
        Enter the email address you signed up with and we&apos;ll send you a link to set a new
        password.
      </p>
      <form onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="email">Email address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}
        <button type="submit" className={styles.btnPrimary} disabled={submitting}>
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <div className={styles.authSwitch}>
        Remembered it? <Link href="/login">Login</Link>
      </div>
    </div>
  );
}
