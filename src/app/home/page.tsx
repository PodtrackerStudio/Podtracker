import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { getCurrentUser } from "@/lib/auth";
import { HomeFeed } from "./HomeFeed";

export const metadata: Metadata = {
  title: "Home",
  robots: { index: false, follow: false },
};

/**
 * **This page is per-viewer, so it must never be cached as one page.**
 *
 * It already renders dynamically in production, because `getCurrentUser()`
 * reaches `cookies()`. But only when Supabase is configured — without those
 * keys it returns null before touching a cookie, which is why this page builds
 * as static here. That is a build-machine artifact today, and a feed of the
 * shows *you* follow is not something to leave resting on an environment
 * variable: if it were ever served static, the first visitor's feed would be
 * handed to everyone.
 */
export const dynamic = "force-dynamic";

/**
 * The home page, with its feed back (Sasha, 2026-10-03).
 *
 * It was stripped to popular podcasts on 2026-08-18 because every section below
 * needed a user base that did not exist, and all of them rendered mock data.
 * People are using the site now, so two of them return reading the real thing:
 * new uploads from the shows this viewer follows, and reviews ranked by likes.
 * Both are driven by their own data, not by `HAS_COMMUNITY_DATA` — a section
 * with nothing in it simply doesn't render, so nothing here can be empty or
 * fake.
 *
 * Still absent, and still waiting on the design and the data: Recent activity
 * from friends, New lists, Popular lists.
 *
 * **Popular podcasts stays last.** It is the fallback that keeps the page worth
 * looking at for somebody who follows nothing and whose feed is therefore
 * empty — which is every new account.
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <SiteNav active="home" />
      <HomeFeed user={user} />
      <SiteFooter />
    </>
  );
}
