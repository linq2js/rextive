import { rx } from "rextive/react";
import { productDetailsLogic } from "@/logic/productDetailsLogic";
import { routerLogic } from "@/logic/routerLogic";
import { cartLogic } from "@/logic/cartLogic";

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-1">
      {[...Array(fullStars)].map((_, i) => (
        <svg key={`full-${i}`} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      ))}
      {hasHalfStar && (
        <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 20 20">
          <defs>
            <linearGradient id="half">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="#d1d5db" />
            </linearGradient>
          </defs>
          <path fill="url(#half)" d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <svg key={`empty-${i}`} className="w-5 h-5 text-gray-300 fill-current" viewBox="0 0 20 20">
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      ))}
      <span className="text-sm text-warm-600 ml-2">({rating.toFixed(1)})</span>
    </div>
  );
}

function ProductImageGallery() {
  const $details = productDetailsLogic();

  return rx(() => {
    const { value: product, loading } = $details.productTask();
    const selectedIndex = $details.selectedImageIndex();

    if (loading || !product) {
      return (
        <div className="space-y-4">
          <div className="aspect-square bg-warm-100 rounded-2xl animate-pulse" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-20 h-20 bg-warm-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      );
    }

    const images = product.images.length > 0 ? product.images : [product.thumbnail];
    const currentImage = images[selectedIndex] || product.thumbnail;

    return (
      <div className="space-y-4">
        {/* Main image */}
        <div className="aspect-square bg-warm-50 rounded-2xl overflow-hidden">
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
                onClick={() => $details.selectImage(idx)}
                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === selectedIndex
                    ? "border-brand-500 ring-2 ring-brand-200"
                    : "border-transparent hover:border-warm-300"
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
}

function ProductInfo() {
  const $details = productDetailsLogic();
  const $cart = cartLogic();

  return rx(() => {
    const { value: product, loading, error } = $details.productTask();
    const quantity = $details.quantity();

    if (loading) {
      return (
        <div className="space-y-4">
          <div className="h-8 bg-warm-100 rounded animate-pulse w-3/4" />
          <div className="h-6 bg-warm-100 rounded animate-pulse w-1/2" />
          <div className="h-4 bg-warm-100 rounded animate-pulse" />
          <div className="h-4 bg-warm-100 rounded animate-pulse w-2/3" />
        </div>
      );
    }

    if (error || !product) {
      return (
        <div className="text-center py-8">
          <p className="text-red-500">Failed to load product</p>
        </div>
      );
    }

    const discountedPrice = product.price * (1 - product.discountPercentage / 100);
    const hasDiscount = product.discountPercentage > 0;

    return (
      <div className="space-y-6">
        {/* Category & Brand */}
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1 bg-warm-100 text-warm-700 rounded-full capitalize">
            {product.category}
          </span>
          {product.brand && (
            <span className="text-warm-500">{product.brand}</span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-warm-900">{product.title}</h1>

        {/* Rating */}
        <StarRating rating={product.rating} />

        {/* Price */}
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-warm-900">
            ${discountedPrice.toFixed(2)}
          </span>
          {hasDiscount && (
            <>
              <span className="text-xl text-warm-400 line-through">
                ${product.price.toFixed(2)}
              </span>
              <span className="px-2 py-1 bg-red-100 text-red-600 text-sm font-medium rounded">
                -{Math.round(product.discountPercentage)}%
              </span>
            </>
          )}
        </div>

        {/* Description */}
        <p className="text-warm-600 leading-relaxed">{product.description}</p>

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
          <span className="text-sm text-warm-600">
            {product.availabilityStatus} ({product.stock} in stock)
          </span>
        </div>

        {/* Quantity selector */}
        <div className="flex items-center gap-4">
          <span className="text-warm-700 font-medium">Quantity:</span>
          <div className="flex items-center border border-warm-200 rounded-lg">
            <button
              onClick={() => $details.decrementQuantity()}
              disabled={quantity <= 1}
              className="px-4 py-2 text-warm-600 hover:bg-warm-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              −
            </button>
            <span className="px-4 py-2 font-medium">{quantity}</span>
            <button
              onClick={() => $details.incrementQuantity()}
              disabled={quantity >= product.stock}
              className="px-4 py-2 text-warm-600 hover:bg-warm-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>
        </div>

        {/* Add to cart button */}
        <button
          onClick={() => {
            $cart.addItem(product, quantity);
            $cart.openDrawer();
          }}
          disabled={product.stock === 0}
          className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
        </button>

        {/* Product details */}
        <div className="border-t border-warm-200 pt-6 space-y-4">
          <h3 className="font-semibold text-warm-900">Product Details</h3>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-warm-500">SKU</dt>
              <dd className="text-warm-900">{product.sku}</dd>
            </div>
            <div>
              <dt className="text-warm-500">Weight</dt>
              <dd className="text-warm-900">{product.weight} kg</dd>
            </div>
            <div>
              <dt className="text-warm-500">Dimensions</dt>
              <dd className="text-warm-900">
                {product.dimensions.width} × {product.dimensions.height} × {product.dimensions.depth} cm
              </dd>
            </div>
            <div>
              <dt className="text-warm-500">Min. Order</dt>
              <dd className="text-warm-900">{product.minimumOrderQuantity} units</dd>
            </div>
          </dl>
        </div>

        {/* Shipping & Warranty */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-warm-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <span className="font-medium text-warm-900">Shipping</span>
            </div>
            <p className="text-warm-600">{product.shippingInformation}</p>
          </div>
          <div className="p-4 bg-warm-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="font-medium text-warm-900">Warranty</span>
            </div>
            <p className="text-warm-600">{product.warrantyInformation}</p>
          </div>
        </div>

        {/* Return policy */}
        <div className="p-4 bg-sage-50 rounded-lg text-sm">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="font-medium text-warm-900">Return Policy</span>
          </div>
          <p className="text-warm-600">{product.returnPolicy}</p>
        </div>
      </div>
    );
  });
}

function ProductReviews() {
  const $details = productDetailsLogic();

  return rx(() => {
    const { value: product, loading } = $details.productTask();

    if (loading || !product?.reviews?.length) {
      return null;
    }

    return (
      <div className="mt-12 border-t border-warm-200 pt-8">
        <h2 className="text-2xl font-bold text-warm-900 mb-6">
          Customer Reviews ({product.reviews.length})
        </h2>
        <div className="space-y-6">
          {product.reviews.map((review, idx) => (
            <div key={idx} className="p-6 bg-warm-50 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
                    <span className="text-brand-600 font-medium">
                      {review.reviewerName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-warm-900">{review.reviewerName}</p>
                    <p className="text-xs text-warm-500">
                      {new Date(review.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <StarRating rating={review.rating} />
              </div>
              <p className="text-warm-700">{review.comment}</p>
            </div>
          ))}
        </div>
      </div>
    );
  });
}

export function ProductDetails() {
  const $router = routerLogic();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <button
        onClick={() => $router.goHome()}
        className="flex items-center gap-2 text-warm-600 hover:text-warm-900 mb-8 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Back to Products</span>
      </button>

      {/* Product content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <ProductImageGallery />
        <ProductInfo />
      </div>

      {/* Reviews section */}
      <ProductReviews />
    </div>
  );
}

