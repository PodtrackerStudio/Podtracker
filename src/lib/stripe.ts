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
const RAW_KEY = process.env.STRIPE_SECRET_KEY ?? "";

/**
 * What a Stripe key is made of: ASCII letters, digits and underscores. Nothing
 * else, ever.
 *
 * **A whitelist, after a blacklist failed twice.** First `.trim()`, which only
 * reaches the ends. Then a list of the characters known to break an HTTP
 * header, which still missed — any character above U+00FF is rejected by Node
 * too, and no blacklist of invisible characters is ever complete. Keeping only
 * what is valid cannot miss anything, and a real key passes through untouched.
 */
const NOT_IN_A_KEY = /[^A-Za-z0-9_]/g;

/**
 * **Stripped, and that is load-bearing.** The SDK puts this straight into an
 * `Authorization` header, and a header value containing a newline or control
 * character is invalid — Node refuses to send the request at all, throwing
 * `ERR_INVALID_CHAR`. The Stripe SDK wraps that as "An error occurred with our
 * connection to Stripe", which reads like a network problem and sends you
 * looking at regions and firewalls. It cost an evening on 2026-11-21.
 *
 * Pasting a key into a dashboard's value box picks up a stray character very
 * easily — a wrapped line, a zero-width space — so the defence belongs here
 * rather than in whoever does the pasting.
 */
const SECRET_KEY = RAW_KEY.replace(NOT_IN_A_KEY, "");

if (RAW_KEY && RAW_KEY !== SECRET_KEY) {
  // The count and the shape, never the characters: this goes to a log, and the
  // surrounding material is the key itself.
  console.warn(
    `[stripe] STRIPE_SECRET_KEY contained ${RAW_KEY.length - SECRET_KEY.length} ` +
      `character(s) that cannot appear in a key; removed, leaving ${SECRET_KEY.length}. ` +
      "Re-paste it where it is set — a stray character makes the request unsendable.",
  );
}

// Says plainly whether what arrived even looks like a key. Without this, a
// truncated or wrong-field paste reaches Stripe and comes back as a generic
// auth failure, which is a long way from "you pasted the wrong thing".
if (SECRET_KEY && !/^(sk|rk)_(test|live)_[A-Za-z0-9_]+$/.test(SECRET_KEY)) {
  console.warn(
    `[stripe] STRIPE_SECRET_KEY does not look like a Stripe secret key ` +
      `(${SECRET_KEY.length} characters, starts "${SECRET_KEY.slice(0, 8)}"). ` +
      "Expected sk_live_… — check it is the secret key itself and not a key ID " +
      "or the publishable key.",
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
