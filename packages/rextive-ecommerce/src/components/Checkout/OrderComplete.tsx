import { memo } from "react";
import { rx, task } from "rextive/react";
import { checkoutLogic, orderLogic } from "@/logic/checkout";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

export const OrderComplete = memo(function OrderComplete() {
  const $checkout = checkoutLogic();
  const $order = orderLogic();

  return rx(() => {
    // Use task.from() for mutations - show errors clearly, no stale data
    const state = task.from($order.orderResult());

    // Show loading state
    if (state.loading) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-6 border-4 border-brand-200 dark:border-brand-800 border-t-brand-600 rounded-full animate-spin" />
          <h3 className="text-xl font-semibold text-stone-900 dark:text-white mb-2">
            Processing Your Order...
          </h3>
          <p className="text-stone-600 dark:text-slate-400">
            Please wait while we confirm your payment.
          </p>
        </div>
      );
    }

    // Show error state
    if (state.error) {
      return (
        <div className="text-center py-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-stone-900 dark:text-white mb-2">
            Order Failed
          </h3>
          <p className="text-stone-600 dark:text-slate-400 mb-6">
            {state.error instanceof Error
              ? state.error.message
              : "Something went wrong. Please try again."}
          </p>
          <button
            onClick={() => $checkout.goToStep("review")}
            className="btn-secondary py-3 px-8"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Review
          </button>
        </div>
      );
    }

    const summary = state.value;
    if (!summary) return null;

    return (
      <div className="text-center py-8">
        {/* Success Icon */}
        <div className="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h3 className="text-2xl font-bold text-stone-900 dark:text-white mb-2">
          Order Confirmed!
        </h3>
        <p className="text-stone-600 dark:text-slate-400 mb-6">
          Thank you for your purchase. Your order has been placed successfully.
        </p>

        {/* Order ID */}
        <div className="bg-stone-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6 inline-block border border-stone-200 dark:border-slate-700">
          <p className="text-sm text-stone-500 dark:text-slate-400">Order ID</p>
          <p className="text-lg font-mono font-bold text-brand-600 dark:text-brand-400">
            {summary.orderId}
          </p>
        </div>

        {/* Order Details */}
        <div className="bg-stone-50 dark:bg-slate-800/50 rounded-xl p-4 text-left mb-6 border border-stone-200 dark:border-slate-700">
          <h4 className="font-medium text-stone-900 dark:text-white mb-3">Order Summary</h4>
          <div className="space-y-2 text-sm">
            {summary.items.map((item, index) => (
              <div key={index} className="flex justify-between">
                <span className="text-stone-600 dark:text-slate-400">
                  {item.name} × {item.quantity}
                </span>
                <span className="text-stone-900 dark:text-white">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
            <div className="border-t border-stone-200 dark:border-slate-700 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-slate-400">Subtotal</span>
                <span className="text-stone-900 dark:text-white">{formatCurrency(summary.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-slate-400">Shipping</span>
                <span className="text-stone-900 dark:text-white">{formatCurrency(summary.shipping)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-slate-400">Tax</span>
                <span className="text-stone-900 dark:text-white">{formatCurrency(summary.tax)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base pt-2 border-t border-stone-200 dark:border-slate-700 mt-2">
                <span className="text-stone-900 dark:text-white">Total</span>
                <span className="text-brand-600 dark:text-brand-400">
                  {formatCurrency(summary.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Info */}
        <div className="bg-stone-50 dark:bg-slate-800/50 rounded-xl p-4 text-left mb-6 border border-stone-200 dark:border-slate-700">
          <h4 className="font-medium text-stone-900 dark:text-white mb-2">Shipping to</h4>
          <div className="text-sm text-stone-600 dark:text-slate-300">
            <p>
              {summary.shippingInfo.firstName} {summary.shippingInfo.lastName}
            </p>
            <p>{summary.shippingInfo.address}</p>
            <p>
              {summary.shippingInfo.city}, {summary.shippingInfo.postalCode}
            </p>
            <p>{summary.shippingInfo.country}</p>
          </div>
        </div>

        {/* Confirmation Message */}
        <p className="text-sm text-stone-500 dark:text-slate-400 mb-6">
          A confirmation email has been sent to{" "}
          <span className="font-medium text-stone-700 dark:text-slate-200">
            {summary.shippingInfo.email}
          </span>
        </p>

        {/* Continue Shopping */}
        <button
          onClick={() => {
            $checkout.reset();
            $checkout.close();
          }}
          className="btn-primary py-3 px-8"
        >
          Continue Shopping
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </button>
      </div>
    );
  });
});
