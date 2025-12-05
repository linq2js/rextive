import { signal, logic } from "rextive";
import { rx } from "rextive/react";
import { debounce, to } from "rextive/op";
import { productsLogic } from "@/logic/productsLogic";

/**
 * Local logic for SearchBar - manages input debouncing.
 * Not exported, only used by this component.
 */
export const searchBarLogic = logic("searchBarLogic", () => {
  const $products = productsLogic();

  const input = signal("", { name: "searchBar.input" });
  // Update products search when debounced value changes
  input.pipe(debounce(300), to($products.setSearch));

  const clear = () => {
    input.set("");
  };

  return {
    input,
    clear,
  };
});

export function SearchBar() {
  const $search = searchBarLogic();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    $search.input.set(e.target.value);
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg
          className="w-5 h-5 text-warm-400"
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
      </div>

      {rx(() => (
        <input
          type="text"
          placeholder="Search products..."
          value={$search.input()}
          onChange={handleChange}
          className="input pl-10 pr-10 py-2"
        />
      ))}

      {/* Clear button */}
      {rx(() => {
        if (!$search.input()) return null;

        return (
          <button
            onClick={() => $search.clear()}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-warm-400 hover:text-warm-600 transition-colors"
          >
            <svg
              className="w-5 h-5"
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
        );
      })}
    </div>
  );
}
