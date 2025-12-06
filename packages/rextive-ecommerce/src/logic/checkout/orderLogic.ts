import { signal, logic, type ActionContext } from "rextive";
import { cartLogic } from "../cartLogic";
import { shippingLogic } from "./shippingLogic";
import { paymentLogic } from "./paymentLogic";
import { SHIPPING_COST, TAX_RATE, type OrderSummary } from "./types";

/** Order request payload for placeOrder action */
type OrderPayload = {
  cartItems: Array<{
    product: {
      id: number;
      title: string;
      price: number;
      discountPercentage: number;
    };
    quantity: number;
  }>;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingInfo: ReturnType<ReturnType<typeof shippingLogic>["info"]>;
  paymentMethod: ReturnType<ReturnType<typeof paymentLogic>["method"]>;
};

/**
 * Order logic - manages order totals and order placement.
 * Uses signal.action for the mutation pattern.
 */
export const orderLogic = logic("checkout.orderLogic", () => {
  // Get dependencies at factory level (not inside actions!)
  const $cart = cartLogic();
  const $shipping = shippingLogic();
  const $payment = paymentLogic();

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED TOTALS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Fixed shipping cost */
  const shippingCost = signal(SHIPPING_COST, { name: "order.shippingCost" });

  /** Calculated tax amount (8% of subtotal) */
  const tax = $cart.subtotal.to((subtotal) => subtotal * TAX_RATE, {
    name: "order.tax",
  });

  /** Total order amount (subtotal + shipping + tax) */
  const total = signal(
    { subtotal: $cart.subtotal, shippingCost, tax },
    ({ deps }) => deps.subtotal + deps.shippingCost + deps.tax,
    { name: "order.total" }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ORDER ACTION - mutation pattern with signal.action
  // ═══════════════════════════════════════════════════════════════════════════

  const orderAction = signal.action(
    async (ctx: ActionContext<OrderPayload>) => {
      const request = ctx.payload;

      // Simulate API call (2 second delay)
      await ctx.safe(new Promise((r) => setTimeout(r, 2000)));

      // Simulate random API error (30% chance)
      if (Math.random() < 0.3) {
        throw new Error("Payment processing failed. Please try again.");
      }

      // Build order summary
      const orderSummary: OrderSummary = {
        orderId: `ORD-${Date.now().toString(36).toUpperCase()}`,
        items: request.cartItems.map((item) => ({
          name: item.product.title,
          quantity: item.quantity,
          price:
            item.product.price * (1 - item.product.discountPercentage / 100),
        })),
        subtotal: request.subtotal,
        shipping: request.shipping,
        tax: request.tax,
        total: request.total,
        shippingInfo: request.shippingInfo,
        paymentMethod: request.paymentMethod,
      };

      // Clear cart after successful order
      $cart._clearAfterOrder();

      return orderSummary;
    },
    { name: "order.action" }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // NOTE: When to use task() operator vs task.from() in UI:
  //
  // Use task() pipe operator when:
  //   1. You need a non-null/undefined initial value to display
  //   2. You want stale-while-revalidate: keep showing prev/initial value
  //      during loading/error states (e.g., data refresh, polling)
  //
  // Otherwise, use task.from() in UI:
  //   - Access loading/error/value states directly from promise
  //   - Show loading spinner, error messages, or success content appropriately
  //   - Best for mutations where you want to show errors clearly
  //
  // For order placement: We DON'T use task() because:
  //   - No meaningful initial value to display
  //   - On error, we want to show error message, not "previous order"
  // ─────────────────────────────────────────────────────────────────────────────

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Submit order - dispatches the action with current cart/shipping/payment data.
   * Returns the promise so caller can await completion.
   */
  const placeOrder = () => {
    return orderAction.dispatch({
      cartItems: $cart.items(),
      subtotal: $cart.subtotal(),
      shipping: shippingCost(),
      tax: tax(),
      total: total(),
      shippingInfo: $shipping.info(),
      paymentMethod: $payment.method(),
    });
  };

  /** Reset order state by refreshing the action result */
  const reset = () => {
    // Reset is handled by starting fresh - the task will show initial state
    // when no order has been placed yet
  };

  return {
    // ═══════════════════════════════════════════════════════════════════════════
    // COMPUTED SIGNALS (Totals)
    // ═══════════════════════════════════════════════════════════════════════════

    /** Fixed shipping cost */
    shippingCost,
    /** Calculated tax amount (8% of subtotal) */
    tax,
    /** Total order amount (subtotal + shipping + tax) */
    total,

    // ═══════════════════════════════════════════════════════════════════════════
    // ORDER RESULT (for UI state)
    // ═══════════════════════════════════════════════════════════════════════════

    /** Order result signal - use task.from(orderResult()) in UI for loading/error/value */
    orderResult: orderAction.result,

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Submit order - returns promise for completion */
    placeOrder,
    /** Reset order state */
    reset,
  };
});
