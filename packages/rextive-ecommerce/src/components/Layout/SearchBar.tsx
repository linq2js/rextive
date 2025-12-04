import { signal } from "rextive";
import { rx, useScope } from "rextive/react";
import { debounce } from "rextive/op";
import { productsLogic } from "@/logic/productsLogic";

export function SearchBar() {
  // Get singleton products logic
  const products = productsLogic();

  // Local scope for input debouncing
  const scope = useScope(() => {
    const inputValue = signal("");
    const debouncedValue = inputValue.pipe(debounce(300));

    // Update products search when debounced value changes
    debouncedValue.on(() => {
      products.setSearch(debouncedValue());
    });

    return { inputValue };
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    scope.inputValue.set(e.target.value);
  };

  const handleClear = () => {
    scope.inputValue.set("");
    products.setSearch("");
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
          value={scope.inputValue()}
          onChange={handleChange}
          className="input pl-10 pr-10 py-2"
        />
      ))}

      {/* Clear button */}
      {rx(() => {
        if (!scope.inputValue()) return null;

        return (
          <button
            onClick={handleClear}
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
