import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Join Podtracker to track the podcasts you listen to, rate episodes and write reviews. Free.",
  alternates: { canonical: "/signup" },
};

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/home");

  return <SignupForm />;
}
