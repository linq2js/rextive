import { memo } from "react";
import { cartLogic } from "@/logic/cartLogic";
import { checkoutLogic } from "@/logic/checkout";

interface CartSummaryProps {
  subtotal: number;
  discount: number;
  onClear: () => void;
}

export const CartSummary = memo(function CartSummary({ subtotal, discount, onClear }: CartSummaryProps) {
  const handleCheckout = () => {
    cartLogic().closeDrawer();
    checkoutLogic().open();
  };

  return (
    <div className="border-t border-stone-200 dark:border-slate-800 px-6 py-4 space-y-4 bg-stone-50 dark:bg-slate-950">
      {/* Summary */}
      <div className="space-y-2 text-sm">
        {discount > 0 && (
          <div className="flex justify-between text-sage-600 dark:text-sage-400">
            <span>Discount</span>
            <span>-${discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-stone-500 dark:text-slate-400">
          <span>Shipping</span>
          <span>Calculated at checkout</span>
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-between items-center py-3 border-t border-stone-200 dark:border-slate-800">
        <span className="text-lg font-semibold text-stone-900 dark:text-white">Subtotal</span>
        <span className="text-2xl font-bold text-stone-900 dark:text-white">
          ${subtotal.toFixed(2)}
        </span>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={handleCheckout}
          className="btn-primary w-full py-3 text-lg"
        >
          Checkout
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
        <button onClick={onClear} className="btn-ghost w-full text-stone-500 dark:text-slate-400">
          Clear Cart
        </button>
      </div>
    </div>
  );
});
