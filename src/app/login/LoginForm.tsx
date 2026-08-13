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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!email.trim() || !password) {
      setErrorMsg("Please enter both an email and a password.");
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password, remember }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setErrorMsg(data?.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    router.push("/home");
    router.refresh();
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
          <div className={styles.rememberRow}>
            <input type="checkbox" id="remember" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <label htmlFor="remember">Remember me?</label>
          </div>
          {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}
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
