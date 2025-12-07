import { memo } from "react";
import { rx } from "rextive/react";
import { checkoutLogic } from "@/logic/checkout";
import { CheckoutSteps } from "./CheckoutSteps";
import { ShippingForm } from "./ShippingForm";
import { PaymentForm } from "./PaymentForm";
import { OrderReview } from "./OrderReview";
import { OrderComplete } from "./OrderComplete";

export const CheckoutModal = memo(function CheckoutModal() {
  const $checkout = checkoutLogic();

  return rx(() => {
    const open = $checkout.isOpen();
    const step = $checkout.currentStep();
    const isComplete = step === "complete";

    return (
      <>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${
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
            className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden transform transition-all duration-300 border border-stone-200 dark:border-slate-800 ${
              open ? "scale-100" : "scale-95"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950">
              <h2 className="text-xl font-semibold text-stone-900 dark:text-white">
                {isComplete ? "Order Confirmed" : "Checkout"}
              </h2>
              {!isComplete && (
                <button
                  onClick={() => $checkout.close()}
                  className="p-2 rounded-xl hover:bg-stone-200 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Close"
                >
                  <svg
                    className="w-5 h-5 text-stone-600 dark:text-slate-400"
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
              {step === "complete" && <OrderComplete />}
            </div>
          </div>
        </div>
      </>
    );
  });
});
