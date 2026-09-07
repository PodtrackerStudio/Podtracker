import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  // Clears the session cookies through the same adapter that set them. There is
  // no session row to delete any more — Supabase owns that side.
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
