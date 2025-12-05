import { Suspense } from "react";
import { rx } from "rextive/react";
import { checkoutLogic } from "@/logic/checkout";
import { CheckoutSteps } from "./CheckoutSteps";
import { ShippingForm } from "./ShippingForm";
import { PaymentForm } from "./PaymentForm";
import { OrderReview } from "./OrderReview";
import { OrderComplete } from "./OrderComplete";
import { OrderLoading } from "./OrderLoading";
import { OrderErrorBoundary } from "./OrderErrorBoundary";

export function CheckoutModal() {
  const $checkout = checkoutLogic();

  return rx(() => {
    const open = $checkout.isOpen();
    const step = $checkout.currentStep();
    const isComplete = step === "complete";

    return (
      <>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-warm-900/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => !isComplete && $checkout.close()}
          aria-hidden="true"
        />

        {/* Modal */}
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div
            className={`bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden transform transition-all duration-300 ${
              open ? "scale-100" : "scale-95"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-warm-200">
              <h2 className="text-xl font-semibold text-warm-900">
                {isComplete ? "Order Confirmed" : "Checkout"}
              </h2>
              {!isComplete && (
                <button
                  onClick={() => $checkout.close()}
                  className="btn-ghost p-2"
                  aria-label="Close"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <CheckoutSteps />

              {step === "shipping" && <ShippingForm />}
              {step === "payment" && <PaymentForm />}
              {step === "review" && <OrderReview />}
              {step === "complete" && (
                <ErrorBoundary>
                  <Suspense fallback={<OrderLoading />}>
                    <OrderComplete />
                  </Suspense>
                </ErrorBoundary>
              )}
            </div>
          </div>
        </div>
      </>
    );
  });
}

// Use OrderErrorBoundary as ErrorBoundary
const ErrorBoundary = OrderErrorBoundary;
