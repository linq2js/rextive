import { signal, logic } from "rextive";
import { persistor } from "rextive/plugins";
import type { Product, LocalCartItem } from "@/api/types";
import { authLogic } from "./authLogic";

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
 * Requires authentication for cart operations.
 *
 * Uses `logic()` for:
 * - Automatic signal disposal
 * - Singleton management
 * - Testability via logic.provide() and logic.clear()
 */
export const cartLogic = logic("cartLogic", () => {
  // Get auth logic for checking authentication
  const $auth = authLogic();

  // Helper to require auth - returns true if authenticated, false if showing login modal
  const requireAuth = (): boolean => {
    if ($auth.isAuthenticated()) {
      return true;
    }
    $auth.openLoginModal();
    return false;
  };
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

  // Actions (require authentication)
  const addItem = (product: Product, quantity = 1) => {
    if (!requireAuth()) return;

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
    if (!requireAuth()) return;

    items.set((current) =>
      current.filter((item) => item.productId !== productId)
    );
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (!requireAuth()) return;

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
    if (!requireAuth()) return;

    items.set([]);
  };

  // Internal: Clear cart after successful order (no auth check needed)
  const _clearAfterOrder = () => {
    items.set([]);
  };

  const openDrawer = () => {
    drawerOpen.set(true);
  };

  const closeDrawer = () => {
    drawerOpen.set(false);
  };

  return {
    // ═══════════════════════════════════════════════════════════════════════════
    // SIGNALS (for UI reactivity and computed signals)
    // ═══════════════════════════════════════════════════════════════════════════

    /** List of cart items with product details and quantities */
    items,
    /** Whether the cart drawer is currently visible */
    drawerOpen,
    /** Computed: total number of items in cart */
    itemCount,
    /** Computed: cart subtotal after item discounts */
    subtotal,
    /** Computed: total discount amount across all items */
    totalDiscount,

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Add a product to cart (or increase quantity if exists) */
    addItem,
    /** Remove a product from cart entirely */
    removeItem,
    /** Update quantity of a specific item (removes if quantity <= 0) */
    updateQuantity,
    /** Remove all items from cart */
    clearCart,
    /** Show the cart drawer */
    openDrawer,
    /** Hide the cart drawer */
    closeDrawer,

    // Internal methods (prefixed with _) for use by other logics
    /** @internal Clear cart after successful order (bypasses auth) */
    _clearAfterOrder,
  };
});
