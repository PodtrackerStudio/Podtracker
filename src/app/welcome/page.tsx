import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { WelcomeForm } from "./WelcomeForm";

export const metadata: Metadata = {
  title: "Choose a username",
  // Nobody should ever arrive here from a search result — it only means
  // anything to someone mid-signup, holding a session.
  robots: { index: false, follow: false },
};

/**
 * The second half of signing in with Google.
 *
 * Google returns a verified email and a display name. It cannot return a
 * username, and `User.username` is required and unique, so the profile row
 * cannot be written until the person picks one. `/auth/callback` sends anyone
 * holding a session with no profile row here.
 *
 * Unreachable by anyone else: no session goes to `/login`, and a session that
 * already has a profile goes straight on. It is not a page you can browse to.
 */
async function suggestUsername(seed: string): Promise<string> {
  const base =
    seed
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20) || "listener";

  const taken = async (name: string) =>
    Boolean(await db.user.findUnique({ where: { username: name }, select: { id: true } }));

  if (!(await taken(base))) return base;
  // A handful of tries, then give up and let them type their own rather than
  // hammer the database for a convenience.
  for (let i = 2; i <= 6; i++) {
    const candidate = `${base}${i}`;
    if (!(await taken(candidate))) return candidate;
  }
  return "";
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!isSupabaseConfigured) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const existing = await db.user.findUnique({ where: { id: authUser.id }, select: { username: true } });
  const { next } = await searchParams;
  // Only a relative path, never "//evil.com" — same rule as /auth/callback.
  const onward = next?.startsWith("/") && !next.startsWith("//") ? next : "/home";

  // Already finished — someone revisiting the URL, or a second tab.
  if (existing) redirect(onward);

  const emailLocalPart = (authUser.email ?? "").split("@")[0];
  const googleName = (authUser.user_metadata?.full_name as string | undefined) ?? "";
  const suggestion = await suggestUsername(emailLocalPart || googleName);

  return (
    <WelcomeForm
      suggestion={suggestion}
      email={authUser.email ?? ""}
      displayName={googleName}
      next={onward}
    />
  );
}
