import { signal, logic, task } from "rextive";
import { productsApi } from "@/api/client";
import type { Product } from "@/api/types";
import { routerLogic } from "./routerLogic";

/**
 * Product details logic - manages fetching and displaying a single product.
 */
export const productDetailsLogic = logic("productDetailsLogic", () => {
  // Dependencies
  const $router = routerLogic();

  // Current product ID being viewed
  const productId = signal<number | null>(null, {
    name: "productDetails.productId",
  });

  // Fetch product data when productId changes
  const productAsync = signal(
    { productId },
    async ({ deps, abortSignal }) => {
      const id = deps.productId;
      if (id === null) return null;
      return productsApi.getById(id, abortSignal);
    },
    { name: "productDetails.productAsync" }
  );

  // Task wrapper for loading states
  const productTask = productAsync.pipe(task(null as Product | null));

  // Quantity selector
  const quantity = signal(1, { name: "productDetails.quantity" });

  // Actions
  const loadProduct = (id: number) => {
    signal.batch(() => {
      productId.set(id);
      quantity.set(1);
    });
  };

  const setQuantity = (value: number) => {
    const product = productTask().value;
    const max = product?.stock ?? 99;
    quantity.set(Math.max(1, Math.min(value, max)));
  };

  const incrementQuantity = () => setQuantity(quantity() + 1);
  const decrementQuantity = () => setQuantity(quantity() - 1);

  const reset = () => {
    signal.batch(() => {
      productId.set(null);
      quantity.set(1);
    });
  };

  // Effect: Load product when route changes to product page
  signal(
    { route: $router.route },
    ({ deps }) => {
      if (deps.route.page === "product") {
        loadProduct(deps.route.id);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    { name: "productDetails.routeChangeEffect", lazy: false }
  );

  return {
    // Signals
    productId,
    productAsync,
    quantity,

    // Actions
    loadProduct,
    setQuantity,
    incrementQuantity,
    decrementQuantity,
    reset,
  };
});
