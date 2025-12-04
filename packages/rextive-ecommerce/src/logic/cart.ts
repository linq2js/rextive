import { signal, logic } from "rextive";
import { persistor } from "rextive/plugins";
import type { Product, LocalCartItem } from "@/api/types";

// Persistor for cart items
const persist = persistor<{ items: LocalCartItem[] }>({
  load: () => {
    try {
      const saved = localStorage.getItem("cart_items");
      return { items: saved ? JSON.parse(saved) : [] };
    } catch {
      return { items: [] };
    }
  },
  save: ({ values }) => {
    if (values.items !== undefined) {
      localStorage.setItem("cart_items", JSON.stringify(values.items));
    }
  },
});

/**
 * Cart logic - manages shopping cart state with persistence.
 *
 * Uses `logic()` for:
 * - Automatic signal disposal
 * - Singleton management
 * - Testability via logic.provide() and logic.clear()
 */
export const cartLogic = logic("cart", () => {
  // Core state (signals)
  const items = signal<LocalCartItem[]>([], {
    name: "cart.items",
    use: [persist("items")],
    equals: "shallow",
  });
  const drawerOpen = signal(false, { name: "cart.drawerOpen" });

  // Computed values
  const itemCount = items.to(
    (items) => items.reduce((sum, item) => sum + item.quantity, 0),
    { name: "cart.itemCount" }
  );

  const subtotal = items.to(
    (items) =>
      items.reduce((sum, item) => {
        const price =
          item.product.price * (1 - item.product.discountPercentage / 100);
        return sum + price * item.quantity;
      }, 0),
    { name: "cart.subtotal" }
  );

  const totalDiscount = items.to(
    (items) =>
      items.reduce((sum, item) => {
        const discount =
          item.product.price * (item.product.discountPercentage / 100);
        return sum + discount * item.quantity;
      }, 0),
    { name: "cart.totalDiscount" }
  );

  // Actions
  const addItem = (product: Product, quantity = 1) => {
    items.set((current) => {
      const existing = current.find((item) => item.productId === product.id);

      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [...current, { productId: product.id, product, quantity }];
    });
  };

  const removeItem = (productId: number) => {
    items.set((current) =>
      current.filter((item) => item.productId !== productId)
    );
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    items.set((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    items.set([]);
  };

  const openDrawer = () => {
    drawerOpen.set(true);
  };

  const closeDrawer = () => {
    drawerOpen.set(false);
  };

  return {
    // Signals
    items,
    drawerOpen,
    itemCount,
    subtotal,
    totalDiscount,

    // Actions
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    openDrawer,
    closeDrawer,
  };
});
