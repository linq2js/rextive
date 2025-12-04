import { cartLogic } from "@/logic/cart";
import type { LocalCartItem } from "@/api/types";

interface CartItemProps {
  item: LocalCartItem;
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = cartLogic();
  const { product, quantity } = item;

  const discountedPrice =
    product.price * (1 - product.discountPercentage / 100);
  const lineTotal = discountedPrice * quantity;

  return (
    <div className="flex gap-4 p-3 bg-white rounded-xl border border-warm-100">
      {/* Image */}
      <div className="w-20 h-20 rounded-lg overflow-hidden bg-warm-100 flex-shrink-0">
        <img
          src={product.thumbnail}
          alt={product.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-warm-900 line-clamp-1 mb-1">
          {product.title}
        </h4>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-sm font-semibold text-warm-900">
            ${discountedPrice.toFixed(2)}
          </span>
          {product.discountPercentage > 0 && (
            <span className="text-xs text-warm-400 line-through">
              ${product.price.toFixed(2)}
            </span>
          )}
        </div>

        {/* Quantity controls */}
        <div className="flex items-center justify-between">
          <QuantityControls
            quantity={quantity}
            maxStock={product.stock}
            onDecrease={() => updateQuantity(product.id, quantity - 1)}
            onIncrease={() => updateQuantity(product.id, quantity + 1)}
          />

          <span className="font-semibold text-warm-900">
            ${lineTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={() => removeItem(product.id)}
        className="self-start p-1 text-warm-400 hover:text-red-500 transition-colors"
        aria-label="Remove item"
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
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  );
}

interface QuantityControlsProps {
  quantity: number;
  maxStock: number;
  onDecrease: () => void;
  onIncrease: () => void;
}

function QuantityControls({
  quantity,
  maxStock,
  onDecrease,
  onIncrease,
}: QuantityControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onDecrease}
        className="w-7 h-7 rounded-full bg-warm-100 flex items-center justify-center text-warm-600 hover:bg-warm-200 transition-colors"
        aria-label="Decrease quantity"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 12H4"
          />
        </svg>
      </button>

      <span className="w-8 text-center font-medium text-warm-900">
        {quantity}
      </span>

      <button
        onClick={onIncrease}
        disabled={quantity >= maxStock}
        className="w-7 h-7 rounded-full bg-warm-100 flex items-center justify-center text-warm-600 hover:bg-warm-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Increase quantity"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </button>
    </div>
  );
}
