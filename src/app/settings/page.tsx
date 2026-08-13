import { redirect } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { getCurrentUser } from "@/lib/auth";
import { SettingsForm } from "./SettingsForm";
import styles from "./settings.module.css";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <SiteNav />
      <main className={styles.main}>
        <h1 className={styles.heading}>Account Settings</h1>
        <SettingsForm
          user={{
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            externalLink: user.externalLink,
            bio: user.bio,
            avatarUrl: user.avatarUrl,
          }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
