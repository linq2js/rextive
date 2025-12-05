import { signal, logic, wait } from "rextive";
import { cartLogic } from "../cartLogic";
import { shippingLogic } from "./shippingLogic";
import { paymentLogic } from "./paymentLogic";
import { SHIPPING_COST, TAX_RATE, type OrderSummary } from "./types";

/** Order request - triggers order processing when set */
type OrderRequest = {
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
 * Uses reactive pattern: setting orderRequest triggers async processing.
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
  // REACTIVE ORDER PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════

  /** Order request - set this to trigger order processing */
  const orderRequest = signal<OrderRequest | null>(null, {
    name: "order.request",
  });

  /**
   * Async order processing - reactive signal that returns Promise<OrderSummary | null>.
   * Use with wait() in components for Suspense integration.
   */
  const orderAsync = signal(
    { orderRequest },
    async ({ deps, safe }): Promise<OrderSummary | null> => {
      const request = deps.orderRequest;
      if (!request) return null;

      // Simulate API call (2 second delay)
      await safe(wait.delay(2000));

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
    { name: "order.async" }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Submit order - triggers reactive processing pipeline.
   * Returns the promise so caller can await completion.
   */
  const placeOrder = () => {
    orderRequest.set({
      cartItems: $cart.items(),
      subtotal: $cart.subtotal(),
      shipping: shippingCost(),
      tax: tax(),
      total: total(),
      shippingInfo: $shipping.info(),
      paymentMethod: $payment.method(),
    });
    // Return the promise for caller to await
    return orderAsync();
  };

  /** Reset order state */
  const reset = () => {
    orderRequest.set(null);
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
    // ORDER ASYNC (Use with wait() for Suspense)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Async order signal - returns Promise<OrderSummary | null>.
     * Use wait(orderAsync()) in components for Suspense integration.
     */
    orderAsync,

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Submit order - returns promise for completion */
    placeOrder,
    /** Reset order state */
    reset,
  };
});
