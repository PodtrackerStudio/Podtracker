"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./donate.module.css";

const PRESET_AMOUNTS = [1, 5, 10, 25, 50, 100];

/** Guards a typo like 100000 from being presented back as a real total. */
const MAX_AMOUNT = 10_000;

/**
 * What Stripe sends people back to after Checkout.
 *
 * "Success" here means Stripe reported the payment as complete on the redirect.
 * It is a message, not a receipt — the authoritative record is the Stripe
 * dashboard, and Stripe emails the donor separately.
 */
const RETURN_MESSAGES: Record<string, string> = {
  success: "Thank you — your donation went through. A receipt is on its way to your email.",
  cancelled: "No payment was taken. You can pick an amount again whenever you like.",
};

function formatAmount(value: number): string {
  // Whole pounds/dollars read better without trailing zeros; a custom 7.50
  // should keep them.
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

export function DonateForm() {
  const searchParams = useSearchParams();
  const donation = searchParams.get("donation");

  const [selected, setSelected] = useState<number | "custom">(10);
  const [custom, setCustom] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Seeded from the URL rather than set by an effect. Stripe returns the donor
  // with a full page load, so this runs exactly when there is a result to show,
  // and every existing path that clears the status still works — picking a new
  // amount wipes the thank-you, as it should.
  const [status, setStatus] = useState<string | null>(
    () => (donation && RETURN_MESSAGES[donation]) || null,
  );

  const customAmount = Number.parseFloat(custom);
  const customIsValid =
    custom.trim() !== "" &&
    Number.isFinite(customAmount) &&
    customAmount > 0 &&
    customAmount <= MAX_AMOUNT;

  const amount = selected === "custom" ? (customIsValid ? customAmount : null) : selected;

  function choose(value: number | "custom") {
    setSelected(value);
    setStatus(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (amount === null || submitting) return;

    setSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.url) {
        // Every failure path on the route already ends "Nothing has been
        // charged", which is the sentence that matters to someone who just
        // pressed a donate button.
        setStatus(data?.error ?? "Something went wrong. Nothing has been charged.");
        setSubmitting(false);
        return;
      }

      // Leaving for Stripe. Deliberately not clearing `submitting`: the button
      // should stay disabled for the moment the browser takes to navigate,
      // rather than inviting a second click that starts a second checkout.
      window.location.assign(data.url);
    } catch {
      setStatus("Couldn't reach the payment provider. Nothing has been charged.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <fieldset className={styles.fieldsetReset}>
        <legend className={styles.legend}>Choose an amount</legend>

        <div className={styles.amountGrid}>
          {PRESET_AMOUNTS.map((value) => (
            <label className={styles.amountOption} key={value}>
              <input
                type="radio"
                name="amount"
                className={styles.srOnly}
                value={value}
                checked={selected === value}
                onChange={() => choose(value)}
              />
              <span className={styles.amountBox}>${value}</span>
            </label>
          ))}

          <label className={`${styles.amountOption} ${styles.customOption}`}>
            <input
              type="radio"
              name="amount"
              className={styles.srOnly}
              value="custom"
              checked={selected === "custom"}
              onChange={() => choose("custom")}
            />
            <span className={styles.amountBox}>Custom amount</span>
          </label>
        </div>
      </fieldset>

      {selected === "custom" && (
        <div className={styles.customRow}>
          <label className={styles.customLabel} htmlFor="custom-amount">
            Enter an amount
          </label>
          <div className={styles.customInputWrap}>
            <span className={styles.currency} aria-hidden="true">
              $
            </span>
            <input
              id="custom-amount"
              className={styles.customInput}
              type="number"
              inputMode="decimal"
              min="1"
              max={MAX_AMOUNT}
              step="0.01"
              placeholder="0.00"
              autoFocus
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                setStatus(null);
              }}
            />
          </div>
        </div>
      )}

      <div className={styles.submitRow}>
        <button
          className={styles.donateButton}
          type="submit"
          disabled={amount === null || submitting}
        >
          {submitting
            ? "Taking you to checkout…"
            : amount === null
              ? "Donate"
              : `Donate ${formatAmount(amount)}`}
        </button>
      </div>

      {status && (
        <p className={styles.statusMsg} role="status">
          {status}
        </p>
      )}
    </form>
  );
}
