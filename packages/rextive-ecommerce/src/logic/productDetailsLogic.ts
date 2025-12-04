import { signal, logic, task } from "rextive";
import { productsApi } from "@/api/client";
import type { Product } from "@/api/types";

/**
 * Product details logic - manages fetching and displaying a single product.
 */
export const productDetailsLogic = logic("productDetailsLogic", () => {
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

  // Selected image index for gallery
  const selectedImageIndex = signal(0, {
    name: "productDetails.selectedImageIndex",
  });

  // Quantity selector
  const quantity = signal(1, { name: "productDetails.quantity" });

  // Actions
  const loadProduct = (id: number) => {
    signal.batch(() => {
      productId.set(id);
      selectedImageIndex.set(0);
      quantity.set(1);
    });
  };

  const selectImage = (index: number) => {
    selectedImageIndex.set(index);
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
      selectedImageIndex.set(0);
      quantity.set(1);
    });
  };

  return {
    // Signals
    productId,
    productTask,
    selectedImageIndex,
    quantity,

    // Actions
    loadProduct,
    selectImage,
    setQuantity,
    incrementQuantity,
    decrementQuantity,
    reset,
  };
});

