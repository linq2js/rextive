import { cartLogic } from "@/logic/cartLogic";
import { routerLogic } from "@/logic/routerLogic";
import type { Product } from "@/api/types";

interface ProductCardProps {
  product: Product;
  index: number;
}

export function ProductCard({ product, index }: ProductCardProps) {
  // Get singleton cart logic
  const cart = cartLogic();
  const router = routerLogic();

  const discountedPrice =
    product.price * (1 - product.discountPercentage / 100);
  const hasDiscount = product.discountPercentage > 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only open drawer if addItem succeeds
    // If not authenticated or stock exceeded, drawer won't open
    if (cart.addItem(product)) {
      cart.openDrawer();
    }
  };

  const handleClick = () => {
    router.goToProduct(product.id);
  };

  return (
    <article
      className="card group overflow-hidden animate-slide-up cursor-pointer"
      style={{ animationDelay: `${index * 0.05}s`, animationFillMode: "both" }}
      onClick={handleClick}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-white dark:bg-slate-800">
        <img
          src={product.thumbnail}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />

        {/* Discount badge */}
        {hasDiscount && (
          <span className="absolute top-3 left-3 badge-brand">
            -{Math.round(product.discountPercentage)}%
          </span>
        )}

        {/* Stock badge */}
        {product.stock < 10 && (
          <span className="absolute top-3 right-3 badge bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
            Only {product.stock} left
          </span>
        )}

        {/* Quick add overlay */}
        <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/40 dark:group-hover:bg-slate-950/60 transition-colors duration-300 flex items-center justify-center gap-3">
          <button
            onClick={handleAddToCart}
            className="btn-primary opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
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
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Add to Cart
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category */}
        <p className="text-xs text-stone-500 dark:text-slate-400 uppercase tracking-wider mb-1">
          {product.category}
        </p>

        {/* Title */}
        <h3 className="font-medium text-stone-900 dark:text-white line-clamp-2 mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
          {product.title}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-3">
          <div className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg
                key={i}
                className={`w-4 h-4 ${
                  i < Math.round(product.rating)
                    ? "text-amber-400"
                    : "text-stone-200 dark:text-slate-700"
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-xs text-stone-500 dark:text-slate-400">
            ({product.rating.toFixed(1)})
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-stone-900 dark:text-white">
              ${discountedPrice.toFixed(2)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-stone-400 dark:text-slate-500 line-through">
                ${product.price.toFixed(2)}
              </span>
            )}
          </div>

          {/* Mobile add button */}
          <button
            onClick={handleAddToCart}
            className="btn-ghost p-2 md:hidden"
            aria-label="Add to cart"
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
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}
