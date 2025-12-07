import { memo } from "react";

interface CartEmptyProps {
  onClose: () => void;
}

export const CartEmpty = memo(function CartEmpty({ onClose }: CartEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <div className="w-20 h-20 rounded-full bg-stone-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <svg
          className="w-10 h-10 text-stone-400 dark:text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-stone-900 dark:text-white mb-2">
        Your cart is empty
      </h3>
      <p className="text-stone-500 dark:text-slate-400 mb-6">
        Looks like you haven't added anything yet
      </p>
      <button onClick={onClose} className="btn-primary">
        Continue Shopping
      </button>
    </div>
  );
});
