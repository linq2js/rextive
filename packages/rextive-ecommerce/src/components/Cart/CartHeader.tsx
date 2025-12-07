import { memo } from "react";
import { rx } from "rextive/react";
import { cartLogic } from "@/logic/cartLogic";

export const CartHeader = memo(function CartHeader() {
  const { itemCount, closeDrawer } = cartLogic();

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950">
      <div className="flex items-center gap-3">
        <svg
          className="w-6 h-6 text-brand-600 dark:text-brand-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-white">
          Your Cart
          {rx(() => {
            const count = itemCount();
            if (count === 0) return null;
            return (
              <span className="ml-2 text-sm font-normal text-stone-500 dark:text-slate-400">
                ({count} {count === 1 ? "item" : "items"})
              </span>
            );
          })}
        </h2>
      </div>

      <button
        onClick={() => closeDrawer()}
        className="p-2 rounded-xl hover:bg-stone-200 dark:hover:bg-slate-800 transition-colors"
        aria-label="Close cart"
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
    </div>
  );
});
