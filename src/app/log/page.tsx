import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { getCurrentUser } from "@/lib/auth";
import { MicIcon } from "@/components/icons";
import { LogClient } from "./LogClient";
import styles from "./log.module.css";

export const metadata: Metadata = {
  title: "Log a podcast",
  robots: { index: false, follow: false },
};

/**
 * The "+ Log podcast" flow.
 *
 * The nav button used to link to `/explore` — you had to find a show, open its
 * page and log from there. It lands here now: a search bar, then the review
 * popup.
 */
export default async function LogPage() {
  // A log belongs to a user, so there is nothing to write while logged out.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <SiteNav />
      <main className={styles.main}>
        {/* One card, centred in the space between nav and footer. The page is
            short, so it used to sit high with the footer floating mid-screen. */}
        <section className={styles.card}>
          <span className={styles.badge} aria-hidden="true">
            <MicIcon />
          </span>
          <h1 className={styles.heading}>Log podcast</h1>
          <p className={styles.lead}>Find a show or episode you listened to, then rate and review it.</p>
          <LogClient username={user.username} />
          <ol className={styles.steps}>
            <li>
              <span>1</span> Find it
            </li>
            <li>
              <span>2</span> Rate it
            </li>
            <li>
              <span>3</span> Review it <em>(optional)</em>
            </li>
          </ol>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
