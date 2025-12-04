import { CategoryFilter } from "./CategoryFilter";
import { SortSelect } from "./SortSelect";

export function ProductFilters() {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <CategoryFilter />
      <SortSelect />
    </div>
  );
}

