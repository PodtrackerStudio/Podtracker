import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/siteUrl";

/**
 * Spends the token from an emailed link — and only ever on a POST.
 *
 * The matching GET page renders a button and verifies nothing, so the link in
 * somebody's inbox survives being fetched by Outlook Safe Links, antivirus,
 * and chat-app link previewers. Those issue GETs; none of them submit a form.
 * See `src/app/auth/confirm/page.tsx` for the full reasoning.
 *
 * A POST is also the honest verb here: this changes server state, by consuming
 * a one-time token and creating a session.
 */

const ALLOWED_TYPES = new Set<EmailOtpType>([
  "recovery",
  "signup",
  "invite",
  "magiclink",
  "email",
  "email_change",
]);

/** Where each kind of link should land once the token has been spent. */
function destinationFor(type: EmailOtpType, requested: string | null): string {
  // A recovery link proves control of an inbox, not knowledge of the password,
  // so it goes to the form that sets a new one — never to the signed-in site,
  // and never anywhere the link itself asked for.
  if (type === "recovery") return "/reset-password";

  // Must be a relative path, and not "//evil.com", which a browser reads as a
  // protocol-relative URL to another host.
  if (requested && requested.startsWith("/") && !requested.startsWith("//")) return requested;
  return "/home";
}

export async function POST(request: Request) {
  const origin = siteOrigin(request);
  const form = await request.formData().catch(() => null);

  const tokenHash = form?.get("token_hash");
  const type = form?.get("type");
  const next = form?.get("next");

  if (typeof tokenHash !== "string" || typeof type !== "string" || !ALLOWED_TYPES.has(type as EmailOtpType)) {
    return NextResponse.redirect(`${origin}/login?error=bad-link`, { status: 303 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    type: type as EmailOtpType,
    token_hash: tokenHash,
  });

  if (error) {
    console.error("[auth/confirm] verifyOtp failed:", type, error.status, error.message);
    return NextResponse.redirect(`${origin}/login?error=link-expired`, { status: 303 });
  }

  // 303 so the browser follows with a GET rather than re-POSTing to the
  // destination, which is what a plain redirect after a form submit would do.
  return NextResponse.redirect(
    `${origin}${destinationFor(type as EmailOtpType, typeof next === "string" ? next : null)}`,
    { status: 303 },
  );
}
