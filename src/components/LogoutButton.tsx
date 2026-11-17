"use client";

import { useRouter } from "next/navigation";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  // Styled by the caller when it passes a class — the profile menu does.
  // The inline fallback is what it looked like as a bare nav item.
  return (
    <button
      type="button"
      onClick={handleLogout}
      className={className}
      style={className ? undefined : { background: "none", border: "none", font: "inherit", fontSize: 15, fontWeight: 500, cursor: "pointer", color: "var(--text)" }}
    >
      Logout
    </button>
  );
}
