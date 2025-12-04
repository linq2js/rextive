import { rx } from "rextive/react";
import { cartLogic } from "@/logic/cart";

export function CartButton() {
  const { openDrawer, itemCount } = cartLogic();

  return (
    <button
      onClick={() => openDrawer()}
      className="btn-ghost p-2 relative"
      aria-label="Shopping cart"
    >
      <svg
        className="w-6 h-6"
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

      {/* Cart count badge */}
      {rx(() => {
        const count = itemCount();
        if (count === 0) return null;

        return (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-600 text-white text-xs font-bold rounded-full flex items-center justify-center animate-fade-in">
            {count > 99 ? "99+" : count}
          </span>
        );
      })}
    </button>
  );
}
