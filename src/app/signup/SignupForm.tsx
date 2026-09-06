"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { checkPassword, MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";
import styles from "./auth.module.css";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!email.trim() || !username.trim() || !password) {
      setErrorMsg("Please fill in every field.");
      return;
    }
    // The password rules themselves are checked server-side by `checkPassword`
    // and its message is what gets shown. Duplicating them here would mean two
    // copies to keep in step, and the client copy can be bypassed anyway — the
    // only check that counts is the one on the server.
    const local = checkPassword(password, [email, username]);
    if (!local.ok) {
      setErrorMsg(local.error);
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), username: username.trim(), password }),
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
        <h1>Create account</h1>
        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="email">Email address</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className={styles.field}>
            <label htmlFor="username">Username</label>
            <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Create password</label>
            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={MIN_PASSWORD_LENGTH} />
            <div className={styles.fieldHint}>At least {MIN_PASSWORD_LENGTH} characters.</div>
          </div>
          {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}
          <button type="submit" className={styles.btnPrimary} disabled={submitting}>
            {submitting ? "Creating…" : "Create account"}
          </button>
        </form>
        <div className={styles.authSwitch}>
          Already have an account? <Link href="/login">Login</Link>
        </div>
      </div>
    </>
  );
}
