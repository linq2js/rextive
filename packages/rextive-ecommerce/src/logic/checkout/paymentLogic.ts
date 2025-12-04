import { signal, logic } from "rextive";
import type { PaymentMethod } from "./types";

/**
 * Payment step logic - manages payment method selection.
 */
export const paymentLogic = logic("checkout.paymentLogic", () => {
  const method = signal<PaymentMethod>("card", {
    name: "payment.method",
  });

  const setMethod = (value: PaymentMethod) => {
    method.set(value);
  };

  const reset = () => {
    method.set("card");
  };

  return {
    // ═══════════════════════════════════════════════════════════════════════════
    // SIGNALS (for UI reactivity and computed signals)
    // ═══════════════════════════════════════════════════════════════════════════

    /** Selected payment method: "card" | "paypal" | "cod" */
    method,

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Set the payment method */
    setMethod,
    /** Reset payment to default (card) */
    reset,
  };
});

