import { signal, logic } from "rextive";
import { shippingLogic } from "./shippingLogic";
import { paymentLogic } from "./paymentLogic";
import { orderLogic } from "./orderLogic";
import type { CheckoutStep } from "./types";

/**
 * Checkout coordinator - manages checkout flow and step navigation.
 *
 * Each step has its own logic:
 * - shippingLogic - shipping address form
 * - paymentLogic - payment method selection
 * - orderLogic - order totals and placement
 */
export const checkoutLogic = logic("checkoutLogic", () => {
  // Get child logics
  const $shipping = shippingLogic();
  const $payment = paymentLogic();
  const $order = orderLogic();

  // Flow state
  /** Whether the checkout modal is open */
  const isOpen = signal(false, { name: "checkout.isOpen" });
  /** Current step in checkout flow: "shipping" | "payment" | "review" | "complete" */
  const currentStep = signal<CheckoutStep>("shipping", {
    name: "checkout.currentStep",
  });

  // Actions
  /** Open checkout modal and prefill shipping from logged-in user */
  const open = () => {
    $shipping.prefillFromUser();
    isOpen.set(true);
    currentStep.set("shipping");
    $order.reset();
  };

  /** Close checkout modal */
  const close = () => {
    isOpen.set(false);
  };

  /** Navigate to a specific step */
  const goToStep = (step: CheckoutStep) => {
    currentStep.set(step);
  };

  /** Move to the next step (validates current step first) */
  const nextStep = () => {
    const step = currentStep();
    if (step === "shipping" && $shipping.isValid()) {
      currentStep.set("payment");
    } else if (step === "payment") {
      currentStep.set("review");
    }
  };

  /** Move to the previous step */
  const prevStep = () => {
    const step = currentStep();
    if (step === "payment") {
      currentStep.set("shipping");
    } else if (step === "review") {
      currentStep.set("payment");
    }
  };

  /** Submit the order - navigates to complete, Suspense handles loading */
  const placeOrder = () => {
    $order.placeOrder();
    currentStep.set("complete"); // Navigate immediately, Suspense shows loading
  };

  /** Reset all checkout state (shipping, payment, order) */
  const reset = () => {
    currentStep.set("shipping");
    $shipping.reset();
    $payment.reset();
    $order.reset();
  };

  return {
    // ═══════════════════════════════════════════════════════════════════════════
    // SIGNALS (for UI reactivity and computed signals)
    // ═══════════════════════════════════════════════════════════════════════════

    isOpen,
    currentStep,

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    open,
    close,
    goToStep,
    nextStep,
    prevStep,
    placeOrder,
    reset,
  };
});
