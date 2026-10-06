"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../signup/auth.module.css";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Set when the password was right but the address was never confirmed. The
  // only way out of that is another email, and until now this page was a dead
  // end: signing up again fails because the address is taken, so the account
  // was unreachable without someone deleting it by hand. The signup form has
  // offered a resend all along — but only to whoever stayed on that tab.
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!email.trim() || !password) {
      setErrorMsg("Please enter both an email and a password.");
      return;
    }
    setErrorMsg(null);
    setNeedsConfirmation(false);
    setResendState("idle");
    setSubmitting(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password, remember }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setErrorMsg(data?.error ?? "Something went wrong. Please try again.");
      setNeedsConfirmation(data?.code === "email-not-confirmed");
      setSubmitting(false);
      return;
    }

    router.push("/home");
    router.refresh();
  }

  async function handleResend() {
    if (resendState === "sending") return;
    setResendState("sending");

    await fetch("/api/auth/resend-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    }).catch(() => null);

    // Always reports as sent, matching the signup form. The endpoint answers
    // identically whether or not the address exists, and contradicting that
    // here would leak exactly what it is protecting.
    setResendState("sent");
  }

  return (
    <>
      <div className={styles.authWrap}>
        <h1>Login</h1>
        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="email">Email address</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className={styles.forgotRow}>
            <Link href="/forgot-password">Forgot password?</Link>
          </div>
          <div className={styles.rememberRow}>
            <input type="checkbox" id="remember" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <label htmlFor="remember">Remember me?</label>
          </div>
          {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}
          {/* Styled from the classes already in auth.module.css — `.authNote`
              and `.linkButton` are what /forgot-password and /reset-password
              use for exactly this shape of inline action. No new design. */}
          {needsConfirmation && (
            <div className={styles.authNote}>
              {resendState === "sent" ? (
                <>Sent. Check your inbox — and your spam folder.</>
              ) : (
                <>
                  Didn&apos;t get it?{" "}
                  <button
                    type="button"
                    className={styles.linkButton}
                    onClick={handleResend}
                    disabled={resendState === "sending"}
                  >
                    {resendState === "sending" ? "Sending…" : "Send the link again"}
                  </button>
                </>
              )}
            </div>
          )}
          <button type="submit" className={styles.btnPrimary} disabled={submitting}>
            {submitting ? "Logging in…" : "Login"}
          </button>
        </form>
        <div className={styles.authSwitch}>
          Don&apos;t have an account? <Link href="/signup">Create one</Link>
        </div>
      </div>
    </>
  );
}
