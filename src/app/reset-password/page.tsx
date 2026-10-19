import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ResetPasswordForm } from "./ResetPasswordForm";
import styles from "../signup/auth.module.css";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

/**
 * Reached from the emailed link, after `/auth/callback` has turned it into a
 * session.
 *
 * **This checks the Supabase session directly, not `getCurrentUser()`.** That
 * distinction caused a real bug: `getCurrentUser` requires a session *and* a
 * matching `User` row in our own database, so anyone whose profile row was
 * missing — every account created before the move off Neon, whose profile was
 * left behind there — saw "Link expired" on a link that was perfectly valid.
 * Meanwhile `/api/auth/reset-password`, which this page submits to, asks only
 * for the session and would have accepted them.
 *
 * Setting a new password needs proof you control the inbox and nothing else.
 * The profile row is irrelevant to it, so requiring one was both wrong and
 * misleading about why it failed.
 */
export default async function ResetPasswordPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className={styles.authWrap}>
        <h1>Not available</h1>
        <p className={styles.authNote}>Password resets aren&apos;t switched on for this site yet.</p>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className={styles.authWrap}>
        <h1>Link expired</h1>
        <p className={styles.authNote}>
          Reset links can only be used once, and they expire after an hour.
        </p>
        <p className={styles.authNote}>
          If you opened this link on a different device from the one you requested it on, request a
          fresh one and open it on the same device.
        </p>
        <div className={styles.authSwitch}>
          <Link href="/forgot-password">Request a new one</Link>
        </div>
      </div>
    );
  }

  return <ResetPasswordForm />;
}
