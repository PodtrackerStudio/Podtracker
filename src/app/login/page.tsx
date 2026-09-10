import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: true },
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/home");

  return <LoginForm />;
}
