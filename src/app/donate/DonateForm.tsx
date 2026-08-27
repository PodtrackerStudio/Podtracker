"use client";

import { useState } from "react";
import styles from "./donate.module.css";

const PRESET_AMOUNTS = [1, 5, 10, 25, 50, 100];

/** Guards a typo like 100000 from being presented back as a real total. */
const MAX_AMOUNT = 10_000;

function formatAmount(value: number): string {
  // Whole pounds/dollars read better without trailing zeros; a custom 7.50
  // should keep them.
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

export function DonateForm() {
  const [selected, setSelected] = useState<number | "custom">(10);
  const [custom, setCustom] = useState("");
  const [status, setStatus] = useState<string | null>(null);

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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (amount === null) return;
    // There is no payment provider wired up, so this deliberately does not
    // pretend to take money. Saying so plainly is the whole point — a button
    // that silently does nothing reads as a broken checkout.
    setStatus(
      `Payments aren't connected yet, so nothing has been charged. ${formatAmount(amount)} is the amount this page would send once a payment provider is set up.`,
    );
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
        <button className={styles.donateButton} type="submit" disabled={amount === null}>
          {amount === null ? "Donate" : `Donate ${formatAmount(amount)}`}
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
