import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { getCurrentUser } from "@/lib/auth";
import { ContactForm } from "./ContactForm";
import styles from "./contact.module.css";

export const metadata: Metadata = {
  title: "Contact Podtracker",
  description: "Send feedback, report a problem, or get in touch with the people who build Podtracker.",
  alternates: { canonical: "/contact" },
};

/**
 * The feedback form, replacing the footer's `mailto:` link.
 *
 * **Why a page rather than a section on the landing or home page.** A `mailto:`
 * does nothing at all for anyone without a desktop mail client configured, and
 * publishes the address to every scraper that reads the page. A form on the
 * landing page would compete with "Create account" for attention from people
 * who have not used the site yet and so have nothing to say about it. And a
 * form on every page is a larger surface to keep free of spam than one page is.
 *
 * It also has a job the footer link could not do: the privacy policy tells
 * people to contact us to exercise their rights, and that promise should not
 * rest on someone remembering to check a Gmail inbox.
 */
export default async function ContactPage() {
  // Prefill for a signed-in sender. Deliberately only a convenience — the API
  // route reads the session itself and never trusts these fields for identity.
  const user = await getCurrentUser().catch(() => null);

  return (
    <>
      <SiteNav />

      <main className={styles.main}>
        <h1 className={styles.heading}>Give us Feedback!</h1>
        <p className={styles.intro}>
          Tell us what&apos;s broken, what&apos;s missing, or what you&apos;d like to see next.
          Podtracker is early and we read everything.
        </p>

        <ContactForm defaultName={user?.displayName ?? ""} defaultEmail={user?.email ?? ""} />
      </main>

      <SiteFooter />
    </>
  );
}
