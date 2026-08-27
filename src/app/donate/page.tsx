import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { DonateForm } from "./DonateForm";
import styles from "./donate.module.css";

export default function DonatePage() {
  return (
    <>
      <SiteNav />

      <main className={styles.main}>
        <h1 className={styles.heading}>Support Podtracker</h1>
        <p className={styles.intro}>
          Podtracker is built and run by a small team. If the site is useful to you, a
          contribution helps cover hosting and keeps it free for everyone else.
        </p>

        <DonateForm />

        <p className={styles.note}>
          Podtracker is not a registered charity, so contributions are not tax deductible.
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
