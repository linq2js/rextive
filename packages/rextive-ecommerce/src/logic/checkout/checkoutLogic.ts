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
  const isOpen = signal(false, { name: "checkout.isOpen" });
  const currentStep = signal<CheckoutStep>("shipping", {
    name: "checkout.currentStep",
  });

  // Actions
  const open = () => {
    $shipping.prefillFromUser();
    isOpen.set(true);
    currentStep.set("shipping");
    $order.reset();
  };

  const close = () => {
    isOpen.set(false);
  };

  const goToStep = (step: CheckoutStep) => {
    currentStep.set(step);
  };

  const nextStep = () => {
    const step = currentStep();
    if (step === "shipping" && $shipping.isValid()) {
      currentStep.set("payment");
    } else if (step === "payment") {
      currentStep.set("review");
    }
  };

  const prevStep = () => {
    const step = currentStep();
    if (step === "payment") {
      currentStep.set("shipping");
    } else if (step === "review") {
      currentStep.set("payment");
    }
  };

  const placeOrder = async () => {
    await $order.placeOrder();
    currentStep.set("complete");
  };

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

    /** Whether the checkout modal is open */
    isOpen,
    /** Current step in checkout flow: "shipping" | "payment" | "review" | "complete" */
    currentStep,

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Open checkout modal and prefill shipping from logged-in user */
    open,
    /** Close checkout modal */
    close,
    /** Navigate to a specific step */
    goToStep,
    /** Move to the next step (validates current step first) */
    nextStep,
    /** Move to the previous step */
    prevStep,
    /** Submit the order and move to completion step */
    placeOrder,
    /** Reset all checkout state (shipping, payment, order) */
    reset,
  };
});
