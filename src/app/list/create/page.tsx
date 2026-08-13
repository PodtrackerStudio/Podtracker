import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { CreateListClient } from "./CreateListClient";
import styles from "./createList.module.css";

export default function CreateListPage() {
  return (
    <>
      <SiteNav />
      <main className={styles.main}>
        <h1 className={styles.heading}>Create List</h1>
        <CreateListClient />
      </main>
      <SiteFooter />
    </>
  );
}
