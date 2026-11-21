import Stripe from "stripe";

/**
 * Stripe configuration, read in one place so every caller agrees on whether
 * Stripe is set up at all — the same shape as `lib/supabase/env.ts`, and for the
 * same reason.
 *
 * **The secret key must never carry a `NEXT_PUBLIC_` prefix.** Anything with
 * that prefix is inlined into the JavaScript sent to browsers, and this key can
 * move money and read every customer record on the account. Checkout needs no
 * public key at all: the browser is redirected to a URL the server creates, so
 * nothing Stripe-related reaches the client bundle.
 */
/**
 * **Trimmed, and that is load-bearing.** The SDK puts this straight into an
 * `Authorization` header, and a header value containing a newline is invalid —
 * Node refuses to send the request at all. The Stripe SDK reports that as
 * "An error occurred with our connection to Stripe", which reads like a network
 * problem and sends you looking at regions and firewalls. It cost an hour on
 * 2026-11-21. Pasting a key into a dashboard's value box picks up a trailing
 * newline very easily, so the fix belongs here rather than in whoever pastes it.
 */
const SECRET_KEY = (process.env.STRIPE_SECRET_KEY ?? "").trim();

// Worth knowing about, because the symptom is otherwise baffling: everything
// still works after the trim, so this never becomes an error — but if the key
// is re-pasted and the problem comes back, the log says what happened.
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== SECRET_KEY) {
  console.warn(
    "[stripe] STRIPE_SECRET_KEY had surrounding whitespace, which was trimmed. " +
      "Worth fixing where it is set — untrimmed it makes an invalid HTTP header.",
  );
}

/**
 * False until a Stripe account's key is in `.env`.
 *
 * The donate page must keep rendering without it. A missing key taking the whole
 * site down is not hypothetical here — that is exactly what happened on
 * 2026-09-08 when `getCurrentUser()` called Supabase with empty credentials, so
 * every Stripe path is gated on this instead of constructing a client eagerly.
 */
export const isStripeConfigured = SECRET_KEY !== "";

/**
 * Both ends of what this page will accept, in whole currency units.
 *
 * Shared with the client so the button and the server agree, but the server
 * check is the one that counts: the amount arrives in a request body and a
 * request body can say anything. The floor is Stripe's own minimum charge —
 * below roughly $0.50 it rejects the payment outright — and the ceiling guards a
 * typo like 100000 rather than any real limit.
 */
export const MIN_DONATION = 1;
export const MAX_DONATION = 10_000;

export const DONATION_CURRENCY = "usd";

let client: Stripe | null = null;

/**
 * The Stripe client, created once and only when actually needed.
 *
 * No `apiVersion` is pinned: the installed SDK already targets the version it
 * was built against, and naming a different one here is how you get a library
 * and an account disagreeing about response shapes.
 */
export function getStripe(): Stripe {
  if (!isStripeConfigured) {
    throw new Error(
      "getStripe() called without STRIPE_SECRET_KEY. Guard the call with isStripeConfigured.",
    );
  }
  client ??= new Stripe(SECRET_KEY);
  return client;
}

/**
 * Turns whatever arrived in a request body into cents, or null if it is not an
 * amount this page accepts.
 *
 * Stripe charges in the smallest currency unit, so $7.50 is 750. The rounding
 * is not cosmetic: `19.99 * 100` is 1998.9999999999998 in floating point, and
 * Stripe rejects a non-integer amount.
 */
export function toDonationCents(value: unknown): number | null {
  const amount = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));

  if (!Number.isFinite(amount)) return null;
  if (amount < MIN_DONATION || amount > MAX_DONATION) return null;

  const cents = Math.round(amount * 100);
  return cents > 0 ? cents : null;
}
