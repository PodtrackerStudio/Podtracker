import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { getCurrentUser } from "@/lib/auth";
import { CreateListClient } from "./CreateListClient";
import styles from "./createList.module.css";

export const metadata: Metadata = {
  title: "Create a list",
  robots: { index: false, follow: false },
};

export default async function CreateListPage() {
  // A list belongs to a user, so there is nothing to submit while logged out.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

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
