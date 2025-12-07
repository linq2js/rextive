import { memo } from "react";
import { ProductFilters } from "./ProductFilters";
import { ProductsContent } from "./ProductsContent";
import { Pagination } from "./Pagination";

export const ProductGrid = memo(function ProductGrid() {
  return (
    <div className="space-y-8">
      <ProductFilters />
      <ProductsContent />
      <Pagination />
    </div>
  );
});
