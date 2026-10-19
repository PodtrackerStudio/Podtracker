import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: true },
};

/**
 * Codes `/auth/callback` can redirect with, and what to tell someone about
 * each. Kept here rather than passed as prose in the URL: a message in a query
 * string is a message an attacker can choose.
 */
const LINK_ERRORS: Record<string, string> = {
  "link-expired":
    "That link has expired or was already used. Reset links work once and last an hour — request a new one below.",
  "missing-code":
    "That link was missing the part that proves it came from us. Request a new one below.",
  "bad-link":
    "That link could not be read. It may have been broken across two lines by your email app — request a new one below.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ confirm?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/home");

  // Set when signup sends someone here after showing the confirmation screen.
  // Read on the server and passed down, rather than `useSearchParams` in the
  // client component, which would need its own Suspense boundary.
  const { confirm, error } = await searchParams;

  // `/auth/callback` sends people here when an emailed link cannot be used.
  // Until now the code was read by nothing, so a dead reset link looked like
  // the site quietly returning you to the login page for no reason.
  const linkError = LINK_ERRORS[error ?? ""] ?? null;

  return <LoginForm awaitingConfirmation={confirm === "pending"} linkError={linkError} />;
}
