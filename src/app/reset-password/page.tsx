import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { ResetPasswordForm } from "./ResetPasswordForm";
import styles from "../signup/auth.module.css";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

/**
 * Reached from the emailed link, after `/auth/callback` has exchanged the code
 * for a session. Landing here without one means the link expired, was already
 * used, or someone typed the URL directly.
 */
export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className={styles.authWrap}>
        <h1>Link expired</h1>
        <p className={styles.authNote}>
          Reset links can only be used once, and they expire after an hour.
        </p>
        <div className={styles.authSwitch}>
          <Link href="/forgot-password">Request a new one</Link>
        </div>
      </div>
    );
  }

  return <ResetPasswordForm />;
}
