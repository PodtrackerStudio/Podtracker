import { NextResponse } from "next/server";
import { rateLimit, clientKey, RATE_LIMITED_MESSAGE } from "@/lib/rateLimit";
import { siteOrigin } from "@/lib/siteUrl";
import {
  DONATION_CURRENCY,
  getStripe,
  isStripeConfigured,
  toDonationCents,
} from "@/lib/stripe";

/**
 * Creates a Stripe Checkout session and hands back the URL to send the donor to.
 *
 * Checkout is hosted by Stripe, so no card details ever reach this server and
 * the account keeps Apple Pay, Google Pay, 3-D Secure and receipts without any
 * of it being built here.
 *
 * Nothing is recorded in our database on purpose: Stripe's dashboard is the
 * record of who gave what. Adding a `Donation` table later means a webhook on
 * `checkout.session.completed` — the redirect back to the site is **not** proof
 * of payment, because anyone can open that URL directly.
 */

/** Unauthenticated and it talks to a paid API, so it gets its own limit. */
const DONATE_LIMIT = { limit: 10, windowMs: 10 * 60 * 1000, blockMs: 10 * 60 * 1000 };

export async function POST(request: Request) {
  if (!isStripeConfigured) {
    // 503, not 500: the code is fine, the account key is simply not set here.
    return NextResponse.json(
      { error: "Donations aren't switched on yet. Nothing has been charged." },
      { status: 503 },
    );
  }

  const limited = rateLimit(clientKey(request, "donate"), DONATE_LIMIT);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: RATE_LIMITED_MESSAGE },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => ({}));

  // Revalidated here rather than trusted: the client's own check is a courtesy
  // to the person typing, not a control.
  const cents = toDonationCents(body?.amount);
  if (cents === null) {
    return NextResponse.json({ error: "Please choose a valid amount." }, { status: 400 });
  }

  const origin = siteOrigin(request);

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      // Returning to /donate rather than a new page keeps this inside a screen
      // that already exists in the Figma. The form reads these parameters and
      // shows the outcome in its own status line.
      success_url: `${origin}/donate?donation=success`,
      cancel_url: `${origin}/donate?donation=cancelled`,
      submit_type: "donate",
      // Managed Payments is Stripe's merchant-of-record product, on by default
      // for this account. It requires a tax code on every line item, because it
      // calculates and remits sales tax on what it treats as a sale. A donation
      // is not a sale of goods, and Podtracker is not a registered charity (the
      // page says so), so there is no product being taxed here — the session
      // opts out and Podtracker remains the merchant of record.
      //
      // Turning this back on means choosing a real product tax code and
      // accepting Stripe's tax handling; that is a decision for whoever handles
      // Podtracker's tax affairs, not a code change to make casually.
      managed_payments: { enabled: false },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: DONATION_CURRENCY,
            unit_amount: cents,
            product_data: {
              name: "Podtracker donation",
              description: "Supports hosting and keeps Podtracker free to use.",
            },
          },
        },
      ],
    });

    if (!session.url) {
      // Documented as optional in the API, so it is checked rather than assumed.
      return NextResponse.json(
        { error: "Stripe didn't return a checkout page. Nothing has been charged." },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    // The donor gets a plain sentence; the detail goes to the server log, where
    // it is useful and not a disclosure.
    console.error("[donate] Stripe checkout session failed:", error);
    return NextResponse.json(
      { error: "Couldn't reach the payment provider. Nothing has been charged." },
      { status: 502 },
    );
  }
}
