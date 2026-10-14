import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: true },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ confirm?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/home");

  // Set when signup sends someone here after showing the confirmation screen.
  // Read on the server and passed down, rather than `useSearchParams` in the
  // client component, which would need its own Suspense boundary.
  const { confirm } = await searchParams;

  return <LoginForm awaitingConfirmation={confirm === "pending"} />;
}
