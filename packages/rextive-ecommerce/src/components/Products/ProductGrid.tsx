import { ProductFilters } from "./ProductFilters";
import { ProductsContent } from "./ProductsContent";
import { Pagination } from "./Pagination";

export function ProductGrid() {
  return (
    <div className="space-y-8">
      <ProductFilters />
      <ProductsContent />
      <Pagination />
    </div>
  );
}
