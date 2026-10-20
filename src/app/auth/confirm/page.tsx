import type { Metadata } from "next";
import Link from "next/link";
import styles from "../../signup/auth.module.css";

export const metadata: Metadata = {
  title: "Confirm",
  robots: { index: false, follow: false },
};

/**
 * The page every emailed link should land on.
 *
 * **Why this exists, and why the obvious design was broken.** Supabase's
 * default templates link to its own `/auth/v1/verify`, which spends the
 * one-time token on the GET and then redirects. So does any link that verifies
 * on arrival, including the `/auth/callback` route this replaces for new mail.
 *
 * Mail does not reach a person untouched. Outlook Safe Links, Gmail, corporate
 * antivirus, and the link previewers in chat apps all fetch URLs before a human
 * sees them. Whichever fetches first spends the token, and the person who
 * actually clicks is told the link expired. That produced reset emails working
 * "about 10% of the time" — reported 2026-10-20, and the cause of two earlier
 * rounds of chasing the wrong thing.
 *
 * So this page **verifies nothing**. A GET renders a button. The token is only
 * spent by the POST behind that button, which a scanner does not send. The
 * cost is one extra click; the benefit is a link that works every time.
 *
 * The token travels in a hidden field rather than staying in the URL, so it
 * stays out of the browser history and out of any `Referer` header sent to a
 * third party from the next page.
 */

const COPY: Record<string, { heading: string; body: string; action: string }> = {
  recovery: {
    heading: "Reset your password",
    body: "Click below and you can choose a new password.",
    action: "Continue to reset",
  },
  signup: {
    heading: "Confirm your email",
    body: "One click and your account is ready.",
    action: "Confirm my email",
  },
  email_change: {
    heading: "Confirm your new address",
    body: "Click below to finish changing the email on your account.",
    action: "Confirm the change",
  },
  invite: {
    heading: "Accept your invitation",
    body: "Click below to set up your account.",
    action: "Accept",
  },
  magiclink: {
    heading: "Sign in to Podtracker",
    body: "Click below to finish signing in.",
    action: "Sign in",
  },
};

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash: tokenHash, type, next } = await searchParams;

  const copy = type ? COPY[type] : undefined;

  if (!tokenHash || !copy) {
    return (
      <div className={styles.authWrap}>
        <h1>That link didn&apos;t work</h1>
        <p className={styles.authNote}>
          Some email apps break long links across two lines. If you can, copy the whole link and
          paste it into your browser&apos;s address bar.
        </p>
        <div className={styles.authSwitch}>
          <Link href="/forgot-password">Request a new link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.authWrap}>
      <h1>{copy.heading}</h1>
      <p className={styles.authNote}>{copy.body}</p>

      <form method="POST" action="/api/auth/confirm">
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        {next && <input type="hidden" name="next" value={next} />}
        <button type="submit" className={styles.btnPrimary}>
          {copy.action}
        </button>
      </form>

      <p className={styles.authNote}>
        This link works once and lasts an hour.
      </p>
    </div>
  );
}
