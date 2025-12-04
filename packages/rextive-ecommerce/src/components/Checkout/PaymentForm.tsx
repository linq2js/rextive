import { rx } from "rextive/react";
import { checkoutLogic, type PaymentMethod } from "@/logic/checkout";

const paymentOptions: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: "card", label: "Credit / Debit Card", icon: "💳" },
  { id: "paypal", label: "PayPal", icon: "🅿️" },
  { id: "cod", label: "Cash on Delivery", icon: "💵" },
];

export function PaymentForm() {
  const { paymentMethod, setPaymentMethod, nextStep, prevStep } =
    checkoutLogic();

  return rx(() => {
    const selected = paymentMethod();

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-warm-900 mb-4">
          Payment Method
        </h3>

        <div className="space-y-3">
          {paymentOptions.map((option) => (
            <label
              key={option.id}
              className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selected === option.id
                  ? "border-brand-500 bg-brand-50"
                  : "border-warm-200 hover:border-warm-300"
              }`}
            >
              <input
                type="radio"
                name="payment"
                value={option.id}
                checked={selected === option.id}
                onChange={() => setPaymentMethod(option.id)}
                className="sr-only"
              />
              <span className="text-2xl mr-3">{option.icon}</span>
              <span
                className={`font-medium ${
                  selected === option.id ? "text-brand-700" : "text-warm-700"
                }`}
              >
                {option.label}
              </span>
              {selected === option.id && (
                <svg
                  className="w-5 h-5 ml-auto text-brand-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </label>
          ))}
        </div>

        {selected === "card" && (
          <div className="mt-6 p-4 bg-warm-50 rounded-xl space-y-4">
            <p className="text-sm text-warm-500 mb-2">
              Demo mode - no real payment will be processed
            </p>
            <div>
              <label className="block text-sm font-medium text-warm-700 mb-1">
                Card Number
              </label>
              <input
                type="text"
                placeholder="4242 4242 4242 4242"
                className="input w-full"
                maxLength={19}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">
                  Expiry
                </label>
                <input
                  type="text"
                  placeholder="MM/YY"
                  className="input w-full"
                  maxLength={5}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">
                  CVC
                </label>
                <input
                  type="text"
                  placeholder="123"
                  className="input w-full"
                  maxLength={3}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={() => prevStep()} className="btn-secondary flex-1 py-3">
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
          <button onClick={() => nextStep()} className="btn-primary flex-1 py-3">
            Review Order
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  });
}

