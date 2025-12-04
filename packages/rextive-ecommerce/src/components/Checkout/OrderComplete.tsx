import { rx } from "rextive/react";
import { checkoutLogic } from "@/logic/checkout";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

export function OrderComplete() {
  const checkout = checkoutLogic();

  return rx(() => {
    const order = checkout.orderSummary();

    if (!order) return null;

    return (
      <div className="text-center py-8">
        {/* Success Icon */}
        <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
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

        <h3 className="text-2xl font-bold text-warm-900 mb-2">
          Order Confirmed!
        </h3>
        <p className="text-warm-600 mb-6">
          Thank you for your purchase. Your order has been placed successfully.
        </p>

        {/* Order ID */}
        <div className="bg-warm-50 rounded-xl p-4 mb-6 inline-block">
          <p className="text-sm text-warm-500">Order ID</p>
          <p className="text-lg font-mono font-bold text-brand-600">
            {order.orderId}
          </p>
        </div>

        {/* Order Details */}
        <div className="bg-warm-50 rounded-xl p-4 text-left mb-6">
          <h4 className="font-medium text-warm-900 mb-3">Order Summary</h4>
          <div className="space-y-2 text-sm">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between">
                <span className="text-warm-600">
                  {item.name} × {item.quantity}
                </span>
                <span className="text-warm-900">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
            <div className="border-t border-warm-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-warm-600">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-warm-600">Shipping</span>
                <span>{formatCurrency(order.shipping)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-warm-600">Tax</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base pt-2 border-t border-warm-200 mt-2">
                <span>Total</span>
                <span className="text-brand-600">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Info */}
        <div className="bg-warm-50 rounded-xl p-4 text-left mb-6">
          <h4 className="font-medium text-warm-900 mb-2">Shipping to</h4>
          <div className="text-sm text-warm-600">
            <p>
              {order.shippingInfo.firstName} {order.shippingInfo.lastName}
            </p>
            <p>{order.shippingInfo.address}</p>
            <p>
              {order.shippingInfo.city}, {order.shippingInfo.postalCode}
            </p>
            <p>{order.shippingInfo.country}</p>
          </div>
        </div>

        {/* Confirmation Message */}
        <p className="text-sm text-warm-500 mb-6">
          A confirmation email has been sent to{" "}
          <span className="font-medium text-warm-700">
            {order.shippingInfo.email}
          </span>
        </p>

        {/* Continue Shopping */}
        <button
          onClick={() => {
            checkout.reset();
            checkout.close();
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
}

