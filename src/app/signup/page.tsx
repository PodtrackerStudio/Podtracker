import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignupForm } from "./SignupForm";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/home");

  return <SignupForm />;
}
