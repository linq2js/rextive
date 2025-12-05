import { rx } from "rextive/react";
import { shippingLogic, paymentLogic, orderLogic } from "@/logic/checkout";
import { checkoutLogic } from "@/logic/checkout";
import { cartLogic } from "@/logic/cartLogic";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

export function OrderReview() {
  const $shipping = shippingLogic();
  const $payment = paymentLogic();
  const $order = orderLogic();
  const $checkout = checkoutLogic();
  const $cart = cartLogic();

  return rx(() => {
    const items = $cart.items();
    const info = $shipping.info();
    const paymentMethod = $payment.method();
    const subtotal = $cart.subtotal();
    const shippingCost = $order.shippingCost();
    const taxAmount = $order.tax();
    const totalAmount = $order.total();

    const paymentLabel =
      paymentMethod === "card"
        ? "Credit Card"
        : paymentMethod === "paypal"
        ? "PayPal"
        : "Cash on Delivery";

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-warm-900">
          Review Your Order
        </h3>

        {/* Items */}
        <div className="bg-warm-50 rounded-xl p-4">
          <h4 className="font-medium text-warm-900 mb-3">Order Items</h4>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3">
                <img
                  src={item.product.thumbnail}
                  alt={item.product.title}
                  className="w-12 h-12 object-cover rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-warm-900 truncate">
                    {item.product.title}
                  </p>
                  <p className="text-xs text-warm-500">Qty: {item.quantity}</p>
                </div>
                <p className="text-sm font-medium text-warm-900">
                  {formatCurrency(
                    item.product.price *
                      (1 - item.product.discountPercentage / 100) *
                      item.quantity
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping */}
        <div className="bg-warm-50 rounded-xl p-4">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-medium text-warm-900">Shipping Address</h4>
            <button
              onClick={() => $checkout.goToStep("shipping")}
              className="text-sm text-brand-600 hover:text-brand-700"
            >
              Edit
            </button>
          </div>
          <div className="text-sm text-warm-600">
            <p>
              {info.firstName} {info.lastName}
            </p>
            <p>{info.address}</p>
            <p>
              {info.city}, {info.postalCode}
            </p>
            <p>{info.country}</p>
            <p className="mt-1 text-warm-500">{info.email}</p>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-warm-50 rounded-xl p-4">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-medium text-warm-900">Payment Method</h4>
            <button
              onClick={() => $checkout.goToStep("payment")}
              className="text-sm text-brand-600 hover:text-brand-700"
            >
              Edit
            </button>
          </div>
          <p className="text-sm text-warm-600">{paymentLabel}</p>
        </div>

        {/* Summary */}
        <div className="border-t border-warm-200 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-warm-600">Subtotal</span>
            <span className="text-warm-900">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-warm-600">Shipping</span>
            <span className="text-warm-900">
              {formatCurrency(shippingCost)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-warm-600">Tax (8%)</span>
            <span className="text-warm-900">{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold pt-2 border-t border-warm-200">
            <span className="text-warm-900">Total</span>
            <span className="text-brand-600">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => $checkout.prevStep()}
            className="btn-secondary flex-1 py-3"
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
            Back
          </button>
          <button
            onClick={() => $checkout.placeOrder()}
            className="btn-primary flex-1 py-3"
          >
            Place Order
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
                d="M5 13l4 4L19 7"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  });
}
