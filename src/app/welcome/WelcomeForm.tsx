"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../signup/auth.module.css";

/**
 * Username and the age/terms confirmation, for an account created with Google.
 *
 * **The checkbox is not duplicated decoration.** Google sign-in never touches
 * `/signup`, so without it these accounts would be the only ones on the site
 * created without the confirmation added on 2026-11-04. The wording is
 * deliberately identical, and the server checks it with the same strict
 * `!== true` as `/api/auth/signup`.
 */
export function WelcomeForm({
  suggestion,
  email,
  displayName,
  next,
}: {
  suggestion: string;
  email: string;
  displayName: string;
  next: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState(suggestion);
  const [agreed, setAgreed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Set when this address already belongs to a password account, which is the
  // one error with a specific way out rather than a thing to retype.
  const [needsPasswordLogin, setNeedsPasswordLogin] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!username.trim()) {
      setErrorMsg("Please choose a username.");
      return;
    }
    // Checked here as well as disabling the button, because a disabled submit
    // button does not stop Enter submitting the form from a text input.
    if (!agreed) {
      setErrorMsg("Please confirm your age and that you've read the terms.");
      return;
    }
    setErrorMsg(null);
    setNeedsPasswordLogin(false);
    setSubmitting(true);

    const res = await fetch("/api/auth/complete-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), agreedToTerms: agreed }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setErrorMsg(data?.error ?? "Something went wrong. Please try again.");
      setNeedsPasswordLogin(data?.code === "email-has-password-account");
      setSubmitting(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className={styles.authWrap}>
      <h1>Choose a username</h1>
      <p className={styles.authNote}>
        {displayName ? `Signed in as ${displayName}` : "Signed in"}
        {email ? ` (${email})` : ""}. One more thing and you&apos;re in — this is the name other
        people see on your reviews.
      </p>

      <form onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
          />
        </div>

        <div className={styles.consentRow}>
          <input
            type="checkbox"
            id="consent"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          {/* Same wording as the signup form, and still not a link: `/terms` is
              offline pending review. Link both at the same time. */}
          <label htmlFor="consent">
            I&apos;m at least 16 years old and I have read the terms and conditions.
          </label>
        </div>

        {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}

        <button type="submit" className={styles.btnPrimary} disabled={submitting || !agreed}>
          {submitting ? "Setting up…" : "Finish"}
        </button>
      </form>

      {needsPasswordLogin && (
        <div className={styles.authSwitch}>
          <Link href="/login">Go to login</Link>
        </div>
      )}
    </div>
  );
}
