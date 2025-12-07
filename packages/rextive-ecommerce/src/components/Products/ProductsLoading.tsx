import { memo } from "react";
import { ProductSkeleton } from "./ProductSkeleton";

export const ProductsLoading = memo(function ProductsLoading() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <ProductSkeleton key={i} index={i} />
      ))}
    </div>
  );
});

