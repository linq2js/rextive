import { memo } from "react";
import { rx, useScope } from "rextive/react";
import { logic, signal } from "rextive";
import { productsLogic } from "@/logic/productsLogic";

const INITIAL_VISIBLE_COUNT = 6;

export const categoryFilterLogic = logic("categoryFilterLogic", () => {
  const isExpanded = signal(false, { name: "categoryFilter.isExpanded" });

  return {
    isExpanded,
    toggleExpanded: () => isExpanded.set((v) => !v),
  };
});

export const CategoryFilterItem = memo(function CategoryFilterItem(props: {
  slug: string;
  name: string;
  selected: boolean;
}) {
  const { setCategory } = productsLogic();

  return (
    <button
      key={props.slug}
      onClick={() => setCategory(props.slug)}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${
        props.selected
          ? "bg-brand-600 text-white shadow-lg shadow-brand-500/30"
          : "bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700"
      }`}
    >
      {props.name}
    </button>
  );
});

export const CategoryFilter = memo(function CategoryFilter() {
  // Get singleton products logic
  const { category, categoriesTask, setCategory } = productsLogic();

  // Local state for expanded view
  const { isExpanded, toggleExpanded } = useScope(
    "categoryFilter",
    categoryFilterLogic
  );

  return (
    <div className="flex flex-wrap gap-2">
      {/* All button */}
      {rx(() => {
        const selected = category();
        return (
          <button
            onClick={() => setCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selected === null
                ? "bg-brand-600 text-white shadow-lg shadow-brand-500/30"
                : "bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700"
            }`}
          >
            All
          </button>
        );
      })}

      {/* Category buttons */}
      {rx(() => {
        const { loading, value } = categoriesTask();
        const selected = category();
        const expanded = isExpanded();

        if (loading && value.length === 0) {
          return (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-9 w-20 skeleton rounded-full" />
              ))}
            </>
          );
        }

        // Show all categories when expanded, otherwise show first 6
        const displayCategories = expanded
          ? value
          : value.slice(0, INITIAL_VISIBLE_COUNT);
        const hiddenCount = value.length - INITIAL_VISIBLE_COUNT;

        return (
          <>
            {displayCategories.map((cat) => (
              <CategoryFilterItem
                key={cat.slug}
                slug={cat.slug}
                name={cat.name}
                selected={selected === cat.slug}
              />
            ))}

            {/* Show more / Show less button */}
            {hiddenCount > 0 && (
              <button
                onClick={toggleExpanded}
                className="px-4 py-2 rounded-full text-sm font-medium bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700 transition-all"
              >
                {expanded ? "Show less" : `+${hiddenCount} more`}
              </button>
            )}
          </>
        );
      })}
    </div>
  );
});
