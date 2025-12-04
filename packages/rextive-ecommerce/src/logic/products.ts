import { signal, logic, task } from "rextive";
import { productsApi } from "@/api/client";
import type { Product, Category } from "@/api/types";

const PRODUCTS_PER_PAGE = 12;

// Type for products response
type ProductsResponse = {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
};

/**
 * Products logic - manages product listing, search, filtering, and pagination.
 *
 * Uses `logic()` for:
 * - Automatic signal disposal
 * - Singleton management
 * - Testability via logic.provide() and logic.clear()
 */
export const productsLogic = logic("products", () => {
  // Filter state (signals)
  const search = signal("", { name: "products.search" });
  const category = signal<string | null>(null, { name: "products.category" });
  const sortBy = signal<"title" | "price" | "rating">("title", {
    name: "products.sortBy",
  });
  const sortOrder = signal<"asc" | "desc">("asc", {
    name: "products.sortOrder",
  });
  const page = signal(1, { name: "products.page" });

  // Categories list (fetched once)
  const categoriesAsync = signal(
    async ({ abortSignal }) => {
      return productsApi.getCategories(abortSignal);
    },
    { name: "products.categoriesAsync" }
  );

  // Products list (reactive to filters)
  const productsAsync = signal(
    { search, category, sortBy, sortOrder, page },
    async ({ deps, abortSignal }) => {
      const params = {
        limit: PRODUCTS_PER_PAGE,
        skip: (deps.page - 1) * PRODUCTS_PER_PAGE,
      };

      // Search takes priority
      if (deps.search.trim()) {
        return productsApi.search(deps.search, params, abortSignal);
      }

      // Then category filter
      if (deps.category) {
        return productsApi.getByCategory(deps.category, params, abortSignal);
      }

      // Default: sorted products
      return productsApi.getSorted(
        { ...params, sortBy: deps.sortBy, order: deps.sortOrder },
        abortSignal
      );
    },
    { name: "products.productsAsync" }
  );

  // Task wrappers for loading states
  const productsTask = productsAsync.pipe(
    task({
      products: [] as Product[],
      total: 0,
      skip: 0,
      limit: PRODUCTS_PER_PAGE,
    })
  );

  const categoriesTask = categoriesAsync.pipe(task([]));

  // Computed: total pages
  const totalPages = productsTask.to(
    ({ value }) => Math.ceil(value.total / PRODUCTS_PER_PAGE),
    { name: "products.totalPages" }
  );

  // Helper to scroll to products section
  const scrollToProducts = () => {
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  };

  // Actions
  const setSearch = (value: string) => {
    signal.batch(() => {
      search.set(value);
      page.set(1); // Reset to first page
    });
    // Scroll to products when searching
    if (value.trim()) {
      scrollToProducts();
    }
  };

  const setCategory = (value: string | null) => {
    signal.batch(() => {
      category.set(value);
      search.set(""); // Clear search when selecting category
      page.set(1);
    });
    scrollToProducts();
  };

  const setSort = (by: "title" | "price" | "rating", order: "asc" | "desc") => {
    signal.batch(() => {
      sortBy.set(by);
      sortOrder.set(order);
    });
  };

  const setPage = (value: number) => {
    page.set(value);
    scrollToProducts();
  };

  const nextPage = () => {
    const total = totalPages();
    if (page() < total) {
      setPage(page() + 1);
    }
  };

  const prevPage = () => {
    if (page() > 1) {
      setPage(page() - 1);
    }
  };

  const refresh = () => {
    productsAsync.refresh();
  };

  return {
    // Signals (for UI reactivity and computed signals)
    search,
    category,
    sortBy,
    sortOrder,
    page,
    totalPages,
    productsTask,
    categoriesTask,

    // Actions
    setSearch,
    setCategory,
    setSort,
    setPage,
    nextPage,
    prevPage,
    refresh,
  };
});
