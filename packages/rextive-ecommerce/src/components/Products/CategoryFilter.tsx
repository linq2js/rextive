import { rx } from "rextive/react";
import { productsLogic } from "@/logic/productsLogic";

export function CategoryFilter() {
  // Get singleton products logic
  const { category, categoriesTask, setCategory } = productsLogic();

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

        if (loading && value.length === 0) {
          return (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-9 w-20 skeleton rounded-full" />
              ))}
            </>
          );
        }

        // Show first 6 categories
        const displayCategories = value.slice(0, 6);

        return (
          <>
            {displayCategories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setCategory(cat.slug)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                  selected === cat.slug
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-500/30"
                    : "bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700"
                }`}
              >
                {cat.name}
              </button>
            ))}

            {value.length > 6 && (
              <button className="px-4 py-2 rounded-full text-sm font-medium bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700 transition-all">
                +{value.length - 6} more
              </button>
            )}
          </>
        );
      })}
    </div>
  );
}
