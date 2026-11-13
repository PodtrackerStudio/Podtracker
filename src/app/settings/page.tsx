import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { getCurrentUser } from "@/lib/auth";
import { SettingsForm } from "./SettingsForm";
import styles from "./settings.module.css";
import { db } from "@/lib/db";
import { cleanTheme } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // The editable profile fields, which `getCurrentUser` no longer carries (see
  // there). This is the one page that needs the avatar's actual data, as the
  // preview in the form.
  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: { avatarUrl: true, bio: true, externalLink: true },
  });

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
            externalLink: profile?.externalLink ?? null,
            bio: profile?.bio ?? null,
            avatarUrl: profile?.avatarUrl ?? null,
          }}
          theme={cleanTheme({ main: user.themeMain, accent: user.themeAccent, font: user.themeFont })}
        />
      </main>
      <SiteFooter />
    </>
  );
}
