import { memo } from "react";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/api/types";

interface ProductsListProps {
  loading: boolean;
  value: {
    products: Product[];
    skip: number;
    limit: number;
    total: number;
  };
}

export const ProductsList = memo(function ProductsList({ loading, value }: ProductsListProps) {
  return (
    <>
      {loading && <StaleIndicator />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {value.products.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </div>

      <ResultsInfo skip={value.skip} limit={value.limit} total={value.total} />
    </>
  );
});

function StaleIndicator() {
  return (
    <div className="flex items-center justify-center gap-2 text-stone-500 dark:text-slate-400 text-sm py-2">
      <svg
        className="w-4 h-4 animate-spin"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span>Updating results...</span>
    </div>
  );
}

function ResultsInfo({
  skip,
  limit,
  total,
}: {
  skip: number;
  limit: number;
  total: number;
}) {
  return (
    <div className="text-center text-stone-500 dark:text-slate-400 text-sm">
      Showing {skip + 1}-{Math.min(skip + limit, total)} of {total} products
    </div>
  );
}
