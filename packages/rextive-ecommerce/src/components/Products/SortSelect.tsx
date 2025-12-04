import { rx } from "rextive/react";
import { productsLogic } from "@/logic/productsLogic";

const sortOptions = [
  {
    value: "title-asc",
    label: "Name: A-Z",
    sortBy: "title" as const,
    order: "asc" as const,
  },
  {
    value: "title-desc",
    label: "Name: Z-A",
    sortBy: "title" as const,
    order: "desc" as const,
  },
  {
    value: "price-asc",
    label: "Price: Low to High",
    sortBy: "price" as const,
    order: "asc" as const,
  },
  {
    value: "price-desc",
    label: "Price: High to Low",
    sortBy: "price" as const,
    order: "desc" as const,
  },
  {
    value: "rating-desc",
    label: "Top Rated",
    sortBy: "rating" as const,
    order: "desc" as const,
  },
];

export function SortSelect() {
  // Get singleton products logic
  const { sortBy, sortOrder, category, search, setSort } = productsLogic();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const option = sortOptions.find((o) => o.value === e.target.value);
    if (option) {
      setSort(option.sortBy, option.order);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {rx(() => {
        // Sort only works when showing all products (no category or search)
        const isDisabled = category() !== null || search().trim() !== "";

        return (
          <>
            <label
              className={`text-sm ${isDisabled ? "text-warm-300" : "text-warm-500"}`}
            >
              Sort by:
            </label>
            <select
              onChange={handleChange}
              value={`${sortBy()}-${sortOrder()}`}
              disabled={isDisabled}
              title={
                isDisabled
                  ? "Sorting is only available when viewing all products"
                  : undefined
              }
              className={`input py-2 pl-3 pr-8 w-auto text-sm ${
                isDisabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </>
        );
      })}
    </div>
  );
}
