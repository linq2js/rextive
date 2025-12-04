import { rx } from "rextive/react";
import { productsLogic } from "@/logic/products";

export function Pagination() {
  // Get singleton products logic
  const { page, totalPages, setPage, prevPage, nextPage } = productsLogic();

  return rx(() => {
    const current = page();
    const total = totalPages();

    if (total <= 1) return null;

    // Generate page numbers to show
    const pages: (number | "ellipsis")[] = [];
    const showEllipsis = total > 7;

    if (showEllipsis) {
      if (current <= 3) {
        pages.push(1, 2, 3, 4, "ellipsis", total);
      } else if (current >= total - 2) {
        pages.push(1, "ellipsis", total - 3, total - 2, total - 1, total);
      } else {
        pages.push(
          1,
          "ellipsis",
          current - 1,
          current,
          current + 1,
          "ellipsis",
          total
        );
      }
    } else {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    }

    return (
      <nav
        className="flex items-center justify-center gap-1"
        aria-label="Pagination"
      >
        {/* Previous */}
        <button
          onClick={() => prevPage()}
          disabled={current === 1}
          className="btn-ghost p-2 disabled:opacity-50"
          aria-label="Previous page"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pages.map((page, index) => {
            if (page === "ellipsis") {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-warm-400">
                  ...
                </span>
              );
            }

            return (
              <button
                key={page}
                onClick={() => setPage(page)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                  page === current
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-500/30"
                    : "text-warm-600 hover:bg-warm-100"
                }`}
                aria-label={`Page ${page}`}
                aria-current={page === current ? "page" : undefined}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Next */}
        <button
          onClick={() => nextPage()}
          disabled={current === total}
          className="btn-ghost p-2 disabled:opacity-50"
          aria-label="Next page"
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </nav>
    );
  });
}
