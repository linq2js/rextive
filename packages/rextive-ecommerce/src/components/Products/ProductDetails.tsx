import { memo } from "react";
import { provider, rx, task, useScope } from "rextive/react";
import { productDetailsLogic } from "@/logic/productDetailsLogic";
import { productImageGalleryLogic } from "@/logic/productImageGalleryLogic";
import { routerLogic } from "@/logic/routerLogic";
import { cartLogic } from "@/logic/cartLogic";
import type { Product } from "@/api/types";
import type { InferLogic } from "rextive";

// ============================================================================
// Product Details Provider
// ============================================================================

type ProductDetailsInstance = InferLogic<typeof productDetailsLogic>;

/**
 * Provider for productDetailsLogic instance.
 * Allows child components to access the scoped logic via useProductDetails().
 *
 * Usage:
 * ```tsx
 * const $details = useScope(productDetailsLogic);
 *
 * <ProductDetailsProvider value={$details}>
 *   <ChildComponent />
 * </ProductDetailsProvider>
 *
 * // In child component:
 * const $details = useProductDetails();
 * $details.quantity(); // Access signals directly
 * ```
 */
const [useProductDetails, ProductDetailsProvider] =
  provider<ProductDetailsInstance>({
    name: "ProductDetails",
    raw: true,
  });

// ============================================================================
// Shared Components
// ============================================================================

const StarRating = memo(function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-1">
      {[...Array(fullStars)].map((_, i) => (
        <svg
          key={`full-${i}`}
          className="w-5 h-5 text-amber-400 fill-current"
          viewBox="0 0 20 20"
        >
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      ))}
      {hasHalfStar && (
        <svg className="w-5 h-5 text-amber-400" viewBox="0 0 20 20">
          <defs>
            <linearGradient id="half">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="#e7e5e4" />
            </linearGradient>
          </defs>
          <path
            fill="url(#half)"
            d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"
          />
        </svg>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <svg
          key={`empty-${i}`}
          className="w-5 h-5 text-stone-200 dark:text-slate-700 fill-current"
          viewBox="0 0 20 20"
        >
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      ))}
      <span className="text-sm text-stone-600 dark:text-slate-400 ml-2">
        ({rating.toFixed(1)})
      </span>
    </div>
  );
});

// ============================================================================
// Loading / Error States
// ============================================================================

const ProductLoading = memo(function ProductLoading() {
  return (
    <div className="relative">
      {/* Spinner overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10 bg-stone-50/80 dark:bg-slate-950/80 backdrop-blur-sm">
        <div className="flex flex-col items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-stone-200 dark:border-slate-800">
          <div className="w-12 h-12 relative mb-3">
            <div className="absolute inset-0 border-4 border-stone-200 dark:border-slate-700 rounded-full" />
            <div className="absolute inset-0 border-4 border-brand-600 rounded-full border-t-transparent animate-spin" />
          </div>
          <p className="text-stone-700 dark:text-slate-300 font-medium">
            Loading product...
          </p>
        </div>
      </div>

      {/* Skeleton underneath */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image gallery skeleton */}
        <div className="space-y-4">
          <div className="aspect-square skeleton-shimmer rounded-2xl border border-stone-200 dark:border-slate-800" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-20 h-20 skeleton rounded-xl" />
            ))}
          </div>
        </div>

        {/* Info skeleton */}
        <div className="space-y-4">
          <div className="h-8 skeleton rounded-lg w-3/4" />
          <div className="h-6 skeleton rounded-lg w-1/2" />
          <div className="h-4 skeleton rounded-lg" />
          <div className="h-4 skeleton rounded-lg w-2/3" />
          <div className="h-12 skeleton rounded-xl w-full mt-6" />
        </div>
      </div>
    </div>
  );
});

const ProductError = memo(function ProductError({ error }: { error: unknown }) {
  const $router = routerLogic();
  const message =
    error instanceof Error ? error.message : "Failed to load product";

  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
        <svg
          className="w-10 h-10 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-stone-900 dark:text-white mb-2">
        Oops! Something went wrong
      </h3>
      <p className="text-stone-600 dark:text-slate-400 mb-6">{message}</p>
      <button
        onClick={() => $router.goHome()}
        className="btn-primary py-3 px-8"
      >
        Back to Products
      </button>
    </div>
  );
});

// ============================================================================
// Product Section Components (receive product as prop)
// ============================================================================

const ProductImageGallery = memo(function ProductImageGallery({
  product,
}: {
  product: Product;
}) {
  const $imageGallery = useScope(productImageGalleryLogic);

  return rx(() => {
    const selectedIndex = $imageGallery.selectedImageIndex();
    const images =
      product.images.length > 0 ? product.images : [product.thumbnail];
    const currentImage = images[selectedIndex] || product.thumbnail;

    return (
      <div className="space-y-4">
        {/* Main image */}
        <div className="aspect-square bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-stone-200 dark:border-slate-800 shadow-sm">
          <img
            src={currentImage}
            alt={product.title}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Thumbnail gallery */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => $imageGallery.selectImage(idx)}
                className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                  idx === selectedIndex
                    ? "border-brand-500 ring-2 ring-brand-200 dark:ring-brand-700"
                    : "border-transparent hover:border-stone-300 dark:hover:border-slate-600"
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  });
});

const ProductInfo = memo(function ProductInfo({
  product,
}: {
  product: Product;
}) {
  const $details = useProductDetails();
  const $cart = cartLogic();

  return rx(() => {
    const quantity = $details.quantity();
    const discountedPrice =
      product.price * (1 - product.discountPercentage / 100);
    const hasDiscount = product.discountPercentage > 0;

    return (
      <div className="space-y-6">
        {/* Category & Brand */}
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1.5 bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 rounded-full capitalize font-medium">
            {product.category}
          </span>
          {product.brand && (
            <span className="text-stone-500 dark:text-slate-400">
              {product.brand}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-stone-900 dark:text-white">
          {product.title}
        </h1>

        {/* Rating */}
        <StarRating rating={product.rating} />

        {/* Price */}
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-stone-900 dark:text-white">
            ${discountedPrice.toFixed(2)}
          </span>
          {hasDiscount && (
            <>
              <span className="text-xl text-stone-400 dark:text-slate-500 line-through">
                ${product.price.toFixed(2)}
              </span>
              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg">
                -{Math.round(product.discountPercentage)}%
              </span>
            </>
          )}
        </div>

        {/* Description */}
        <p className="text-stone-600 dark:text-slate-300 leading-relaxed">
          {product.description}
        </p>

        {/* Stock status */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              product.stock > 10
                ? "bg-green-500"
                : product.stock > 0
                ? "bg-yellow-500"
                : "bg-red-500"
            }`}
          />
          <span className="text-sm text-stone-600 dark:text-slate-400">
            {product.availabilityStatus} ({product.stock} in stock)
          </span>
        </div>

        {/* Quantity selector */}
        <div className="flex items-center gap-4">
          <span className="text-stone-800 dark:text-slate-200 font-medium">
            Quantity:
          </span>
          <div className="flex items-center border border-stone-300 dark:border-slate-700 rounded-xl bg-stone-50 dark:bg-slate-800 overflow-hidden">
            <button
              onClick={() => $details.decrementQuantity()}
              disabled={quantity <= 1}
              className="px-4 py-2 text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              −
            </button>
            <span className="px-4 py-2 font-medium text-stone-900 dark:text-white bg-white dark:bg-slate-900 border-x border-stone-300 dark:border-slate-700">
              {quantity}
            </span>
            <button
              onClick={() => $details.incrementQuantity()}
              disabled={quantity >= product.stock}
              className="px-4 py-2 text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Add to cart button */}
        <button
          onClick={() => {
            // Only open drawer if addItem succeeds (returns true)
            // If not authenticated or stock exceeded, addItem returns false
            if ($cart.addItem(product, quantity)) {
              $cart.openDrawer();
            }
          }}
          disabled={product.stock === 0}
          className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
        </button>

        {/* Product details */}
        <div className="border-t border-stone-200 dark:border-slate-800 pt-6 space-y-4">
          <h3 className="font-semibold text-stone-900 dark:text-white">
            Product Details
          </h3>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-stone-500 dark:text-slate-500">SKU</dt>
              <dd className="text-stone-900 dark:text-slate-200">
                {product.sku}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500 dark:text-slate-500">Weight</dt>
              <dd className="text-stone-900 dark:text-slate-200">
                {product.weight} kg
              </dd>
            </div>
            <div>
              <dt className="text-stone-500 dark:text-slate-500">Dimensions</dt>
              <dd className="text-stone-900 dark:text-slate-200">
                {product.dimensions.width} × {product.dimensions.height} ×{" "}
                {product.dimensions.depth} cm
              </dd>
            </div>
            <div>
              <dt className="text-stone-500 dark:text-slate-500">Min. Order</dt>
              <dd className="text-stone-900 dark:text-slate-200">
                {product.minimumOrderQuantity} units
              </dd>
            </div>
          </dl>
        </div>

        {/* Shipping & Warranty */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-stone-50 dark:bg-slate-800/50 rounded-xl border border-stone-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-5 h-5 text-brand-600 dark:text-brand-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
              <span className="font-medium text-stone-800 dark:text-white">
                Shipping
              </span>
            </div>
            <p className="text-stone-600 dark:text-slate-400">
              {product.shippingInformation}
            </p>
          </div>
          <div className="p-4 bg-stone-50 dark:bg-slate-800/50 rounded-xl border border-stone-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-5 h-5 text-brand-600 dark:text-brand-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span className="font-medium text-stone-800 dark:text-white">
                Warranty
              </span>
            </div>
            <p className="text-stone-600 dark:text-slate-400">
              {product.warrantyInformation}
            </p>
          </div>
        </div>

        {/* Return policy */}
        <div className="p-4 bg-sage-50 dark:bg-sage-900/20 rounded-xl border border-sage-200 dark:border-sage-800 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-sage-600 dark:text-sage-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="font-medium text-stone-800 dark:text-white">
              Return Policy
            </span>
          </div>
          <p className="text-stone-600 dark:text-slate-400">
            {product.returnPolicy}
          </p>
        </div>
      </div>
    );
  });
});

const ProductReviews = memo(function ProductReviews({
  product,
}: {
  product: Product;
}) {
  if (!product.reviews?.length) {
    return null;
  }

  return (
    <div className="mt-12 border-t border-stone-200 dark:border-slate-800 pt-8">
      <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-6">
        Customer Reviews ({product.reviews.length})
      </h2>
      <div className="space-y-6">
        {product.reviews.map((review, idx) => (
          <div
            key={idx}
            className="p-6 bg-stone-50 dark:bg-slate-900/50 rounded-2xl border border-stone-200 dark:border-slate-800"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/40 rounded-full flex items-center justify-center">
                  <span className="text-brand-600 dark:text-brand-400 font-medium">
                    {review.reviewerName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-stone-900 dark:text-white">
                    {review.reviewerName}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-slate-500">
                    {new Date(review.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <StarRating rating={review.rating} />
            </div>
            <p className="text-stone-700 dark:text-slate-300">
              {review.comment}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
});

// ============================================================================
// Product Content (renders when product is loaded)
// ============================================================================

const ProductContent = memo(function ProductContent({
  product,
}: {
  product: Product;
}) {
  return (
    <>
      {/* Product content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <ProductImageGallery product={product} />
        <ProductInfo product={product} />
      </div>

      {/* Reviews section */}
      <ProductReviews product={product} />
    </>
  );
});

// ============================================================================
// Main Export
// ============================================================================

/**
 * Product details page with provider pattern.
 *
 * Uses ProductDetailsProvider to pass the scoped logic instance
 * to all child components via context, avoiding prop drilling
 * and singleton pattern issues.
 */
export const ProductDetails = memo(function ProductDetails() {
  const $router = routerLogic();
  const $details = useScope(productDetailsLogic);

  return (
    <ProductDetailsProvider value={$details}>
      {rx(() => {
        // Call productAsync() to get the Promise, then use task.from to track its state
        const state = task.from($details.productAsync);

        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Back button */}
            <button
              onClick={() => $router.goHome()}
              className="flex items-center gap-2 text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white mb-8 transition-colors"
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
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>Back to Products</span>
            </button>

            {/* Loading state */}
            {state.status === "loading" ? <ProductLoading /> : null}

            {/* Error state */}
            {state.status === "error" && state.error ? (
              <ProductError error={state.error} />
            ) : null}

            {/* Product loaded - render content */}
            {state.status === "success" && state.value ? (
              <ProductContent product={state.value} />
            ) : null}
          </div>
        );
      })}
    </ProductDetailsProvider>
  );
});
