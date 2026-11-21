import type { NextResponse } from "next/server";

/**
 * Remembers, in this browser, which address it started a signup or email
 * change for, so `POST /api/auth/confirm` can tell a link this browser asked
 * for from one somebody else sent it.
 *
 * **Why.** A confirm link signs in whoever clicks it, as the account the token
 * belongs to. An attacker can sign up with their own address and mail the
 * victim *their* confirmation link: "Confirm your email", one click, and the
 * victim is in the attacker's account, where everything they log or review
 * lands. Moving the token spend behind a button (`/auth/confirm`) only removed
 * the silent version of this.
 *
 * With this cookie, a link whose account matches is handled exactly as before.
 * One that does not still confirms the address — the token was valid — but the
 * browser is left signed out and sent to log in. Opening the email on another
 * device is the honest case that lands there, and costs one login.
 *
 * Scoped to the confirm route, httpOnly, and holds only addresses this browser
 * typed in itself.
 */
export const PENDING_CONFIRMATION_COOKIE = "pt_confirming";

/** Confirmation links last up to a day; this outlives them comfortably. */
const MAX_AGE_SECONDS = 2 * 24 * 60 * 60;

/** A browser can have a signup and an email change pending at once. */
const MAX_ADDRESSES = 3;

export function parsePendingConfirmations(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(decodeURIComponent(raw));
    return Array.isArray(list) ? list.filter((e): e is string => typeof e === "string") : [];
  } catch {
    return [];
  }
}

export function rememberPendingConfirmation(response: NextResponse, existing: string | undefined, email: string) {
  const address = email.trim().toLowerCase();
  const list = [address, ...parsePendingConfirmations(existing).filter((e) => e !== address)].slice(0, MAX_ADDRESSES);
  response.cookies.set(PENDING_CONFIRMATION_COOKIE, encodeURIComponent(JSON.stringify(list)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/confirm",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function forgetPendingConfirmations(response: NextResponse) {
  response.cookies.set(PENDING_CONFIRMATION_COOKIE, "", { path: "/api/auth/confirm", maxAge: 0 });
}
