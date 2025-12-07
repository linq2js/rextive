import { memo } from "react";
import { rx } from "rextive/react";
import { checkoutLogic, type CheckoutStep } from "@/logic/checkout";

const steps: { id: CheckoutStep; label: string }[] = [
  { id: "shipping", label: "Shipping" },
  { id: "payment", label: "Payment" },
  { id: "review", label: "Review" },
];

export const CheckoutSteps = memo(function CheckoutSteps() {
  const { currentStep } = checkoutLogic();

  return rx(() => {
    const current = currentStep();
    const currentIndex = steps.findIndex((s) => s.id === current);

    if (current === "complete") return null;

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  index < currentIndex
                    ? "bg-green-500 text-white"
                    : index === currentIndex
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-500/30"
                    : "bg-stone-200 dark:bg-slate-700 text-stone-500 dark:text-slate-400"
                }`}
              >
                {index < currentIndex ? (
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
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  index <= currentIndex ? "text-stone-900 dark:text-white" : "text-stone-400 dark:text-slate-500"
                }`}
              >
                {step.label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div
                className={`w-16 sm:w-24 h-1 mx-2 rounded transition-all ${
                  index < currentIndex ? "bg-green-500" : "bg-stone-200 dark:bg-slate-700"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  });
});
