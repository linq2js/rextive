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
    <div className="text-center text-stone-500 dark:text-slate-400 text-sm animate-pulse-soft">
      Updating results...
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
