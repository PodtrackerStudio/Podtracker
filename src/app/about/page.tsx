import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { WhatIsPodtracker } from "../WhatIsPodtracker";
import styles from "./about.module.css";

export const metadata = {
  title: "About Podtracker",
};

/**
 * About Us — the "What is Podtracker?" section on its own page.
 *
 * It exists because the footer link used to anchor into the landing page, and
 * the landing page redirects signed-in users to `/home`, so About Us was dead
 * for anyone with an account. A fragment never reaches the server, so that
 * redirect could not be taught to make an exception; a route that everyone can
 * open was the only fix that works for both.
 *
 * Nav and footer like every other page — the landing page is the one that
 * doesn't have a nav, and this isn't the landing page.
 */
export default function AboutPage() {
  return (
    <>
      <SiteNav />
      <main className={styles.main}>
        <WhatIsPodtracker headingAs="h1" />
      </main>
      <SiteFooter />
    </>
  );
}
