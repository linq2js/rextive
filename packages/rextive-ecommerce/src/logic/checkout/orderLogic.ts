import { signal, logic } from "rextive";
import { cartLogic } from "../cartLogic";
import { shippingLogic } from "./shippingLogic";
import { paymentLogic } from "./paymentLogic";
import { SHIPPING_COST, TAX_RATE, type OrderSummary } from "./types";

/**
 * Order logic - manages order totals and order placement.
 */
export const orderLogic = logic("checkout.orderLogic", () => {
  const $cart = cartLogic();

  // Processing state
  const isProcessing = signal(false, { name: "order.isProcessing" });

  // Order result
  const summary = signal<OrderSummary | null>(null, {
    name: "order.summary",
  });

  // Computed totals
  const shippingCost = signal(SHIPPING_COST, { name: "order.shippingCost" });

  const tax = $cart.subtotal.to((subtotal) => subtotal * TAX_RATE, {
    name: "order.tax",
  });

  const total = signal(
    { subtotal: $cart.subtotal, shippingCost, tax },
    ({ deps }) => deps.subtotal + deps.shippingCost + deps.tax,
    { name: "order.total" }
  );

  // Actions
  const placeOrder = async () => {
    const $shipping = shippingLogic();
    const $payment = paymentLogic();

    isProcessing.set(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const cartItems = $cart.items();
    const orderSummary: OrderSummary = {
      orderId: `ORD-${Date.now().toString(36).toUpperCase()}`,
      items: cartItems.map((item) => ({
        name: item.product.title,
        quantity: item.quantity,
        price:
          item.product.price * (1 - item.product.discountPercentage / 100),
      })),
      subtotal: $cart.subtotal(),
      shipping: shippingCost(),
      tax: tax(),
      total: total(),
      shippingInfo: $shipping.info(),
      paymentMethod: $payment.method(),
    };

    summary.set(orderSummary);
    $cart.clearCart();
    isProcessing.set(false);

    return orderSummary;
  };

  const reset = () => {
    summary.set(null);
    isProcessing.set(false);
  };

  return {
    // ═══════════════════════════════════════════════════════════════════════════
    // SIGNALS (for UI reactivity and computed signals)
    // ═══════════════════════════════════════════════════════════════════════════

    /** Whether an order is currently being processed */
    isProcessing,
    /** Order summary after successful placement (null before order) */
    summary,

    // ═══════════════════════════════════════════════════════════════════════════
    // COMPUTED SIGNALS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Fixed shipping cost */
    shippingCost,
    /** Calculated tax amount (8% of subtotal) */
    tax,
    /** Total order amount (subtotal + shipping + tax) */
    total,

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Submit order to API and clear cart on success */
    placeOrder,
    /** Reset order state (summary and processing flag) */
    reset,
  };
});
