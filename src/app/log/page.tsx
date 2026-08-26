import { redirect } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { getCurrentUser } from "@/lib/auth";
import { LogClient } from "./LogClient";
import styles from "./log.module.css";

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
        <h1 className={styles.heading}>Log podcast</h1>
        <LogClient username={user.username} />
      </main>
      <SiteFooter />
    </>
  );
}
