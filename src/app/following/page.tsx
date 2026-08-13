import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { FollowingGrid } from "./FollowingGrid";
import styles from "./following.module.css";

export default function FollowingPage() {
  return (
    <>
      <SiteNav />
      <main className={styles.main}>
        <h1 className={styles.sectionTitle}>Your shows!</h1>
        <FollowingGrid />
      </main>
      <SiteFooter />
    </>
  );
}
