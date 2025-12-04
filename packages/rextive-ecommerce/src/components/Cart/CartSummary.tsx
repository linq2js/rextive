import { cartLogic } from "@/logic/cartLogic";
import { checkoutLogic } from "@/logic/checkout";

interface CartSummaryProps {
  subtotal: number;
  discount: number;
  onClear: () => void;
}

export function CartSummary({ subtotal, discount, onClear }: CartSummaryProps) {
  const handleCheckout = () => {
    cartLogic().closeDrawer();
    checkoutLogic().open();
  };

  return (
    <div className="border-t border-warm-200 px-6 py-4 space-y-4 bg-warm-50">
      {/* Summary */}
      <div className="space-y-2 text-sm">
        {discount > 0 && (
          <div className="flex justify-between text-sage-600">
            <span>Discount</span>
            <span>-${discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-warm-500">
          <span>Shipping</span>
          <span>Calculated at checkout</span>
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-between items-center py-3 border-t border-warm-200">
        <span className="text-lg font-semibold text-warm-900">Subtotal</span>
        <span className="text-2xl font-bold text-warm-900">
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
        <button onClick={onClear} className="btn-ghost w-full text-warm-500">
          Clear Cart
        </button>
      </div>
    </div>
  );
}
