import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: true },
};

/**
 * What a dead emailed link lands on.
 *
 * `/auth/callback` has always redirected a failed code exchange here with
 * `?error=…`, but this page ignored the parameter, so clicking an expired or
 * already-used confirmation link dropped you on a bare login form with no
 * explanation — indistinguishable from the link doing nothing at all. The
 * message below is that explanation; the form underneath it is the way out,
 * since the common case is a link that was already used successfully and an
 * account that is confirmed and can just log in.
 *
 * Unrecognised values fall back to the same wording: the only thing that ever
 * sets this parameter is the callback above, and both of its cases mean the
 * same thing to whoever is reading the page.
 */
const LINK_ERRORS: Record<string, string> = {
  // Expired, or already used — Supabase's links are one-time either way.
  "link-expired": "Sorry something went wrong.. we are working to fix it",
  // No code on the URL at all. Also where Supabase lands when it rejects the
  // link at its own end and appends its error to the redirect instead of a code.
  "missing-code": "Sorry something went wrong.. we are working to fix it",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/home");

  const { error } = await searchParams;
  const notice = error ? (LINK_ERRORS[error] ?? LINK_ERRORS["link-expired"]) : null;

  return <LoginForm notice={notice} />;
}
