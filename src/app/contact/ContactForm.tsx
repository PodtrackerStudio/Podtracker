"use client";

import { useState } from "react";
import styles from "./contact.module.css";

type Props = {
  /** Prefilled for a signed-in sender so they aren't retyping what we know. */
  defaultName?: string;
  defaultEmail?: string;
};

/**
 * The feedback form.
 *
 * Only the message is required. Name and email are optional on purpose:
 * demanding contact details costs you exactly the feedback from people who
 * couldn't be bothered to give them, which is most of it.
 */
export function ContactForm({ defaultName = "", defaultEmail = "" }: Props) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [message, setMessage] = useState("");
  // The honeypot. Never shown, never filled in by a person.
  const [website, setWebsite] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, website }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSent(true);
      setMessage("");
    } catch {
      setError("Couldn't reach the site. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <p className={styles.sent} role="status">
        Thanks — we&apos;ve got it.
        <br />
        <button type="button" className={styles.againLink} onClick={() => setSent(false)}>
          Send another
        </button>
      </p>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <label className={styles.label} htmlFor="feedback-name">
        Name
      </label>
      <input
        id="feedback-name"
        className={styles.input}
        type="text"
        autoComplete="name"
        maxLength={100}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label className={styles.label} htmlFor="feedback-email">
        Email
      </label>
      <input
        id="feedback-email"
        className={styles.input}
        type="email"
        autoComplete="email"
        maxLength={200}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <label className={styles.label} htmlFor="feedback-message">
        Message
      </label>
      <textarea
        id="feedback-message"
        className={styles.textarea}
        required
        maxLength={5000}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      {/* Honeypot. Hidden from people and from screen readers, left in the DOM
          for bots that fill everything they find. `tabIndex={-1}` keeps it out
          of keyboard order so nobody can land on it by tabbing. */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="feedback-website">Website</label>
        <input
          id="feedback-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.submitRow}>
        <button className={styles.submit} type="submit" disabled={submitting || !message.trim()}>
          {submitting ? "Sending…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
