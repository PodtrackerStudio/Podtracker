"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button onClick={handleLogout} style={{ background: "none", border: "none", font: "inherit", fontSize: 15, fontWeight: 500, cursor: "pointer", color: "var(--text)" }}>
      Logout
    </button>
  );
}
