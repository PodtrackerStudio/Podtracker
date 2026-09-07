import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  // Already signed in? Then this page is the wrong tool — Account Settings has
  // a change-password form that asks for the current one.
  const user = await getCurrentUser();
  if (user) redirect("/settings");

  return <ForgotPasswordForm />;
}
