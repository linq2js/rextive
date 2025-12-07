import { memo } from "react";
import { rx, useScope } from "rextive/react";
import { searchBarLogic } from "@/logic/searchBarLogic";

export const SearchBar = memo(function SearchBar() {
  const $searchBar = useScope("searchBar", searchBarLogic);

  return rx(() => {
    const value = $searchBar.input();

    return (
      <div className="relative">
        <input
          type="text"
          placeholder="Search products..."
          value={value}
          onChange={(e) => $searchBar.search(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50 text-stone-900 dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 dark:text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {value && (
          <button
            onClick={$searchBar.clear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    );
  });
});
