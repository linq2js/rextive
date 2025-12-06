import { signal, logic } from "rextive";
import { persistor } from "rextive/plugins";
import type { Product, LocalCartItem } from "@/api/types";
import { authLogic } from "./authLogic";
import { alertLogic } from "./alertLogic";

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
  const $alert = alertLogic();

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
  /**
   * Add a product to cart.
   * @returns true if added successfully, false if validation failed
   */
  const addItem = (product: Product, quantity = 1): boolean => {
    if (!requireAuth()) return false;

    const currentItems = items();
    const existing = currentItems.find((item) => item.productId === product.id);
    const currentQty = existing?.quantity ?? 0;
    const newTotalQty = currentQty + quantity;

    // Check if exceeds stock
    if (newTotalQty > product.stock) {
      const available = product.stock - currentQty;
      if (available <= 0) {
        $alert.warning(
          `You already have the maximum available (${product.stock}) in your cart.`,
          `Cannot add "${product.title}"`
        );
      } else {
        $alert.warning(
          `Only ${available} more available.\n${currentQty} already in cart, ${product.stock} total in stock.`,
          `Cannot add ${quantity} "${product.title}"`
        );
      }
      return false;
    }

    items.set((current) => {
      const existingItem = current.find((item) => item.productId === product.id);

      if (existingItem) {
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [...current, { productId: product.id, product, quantity }];
    });

    return true;
  };

  const removeItem = (productId: number) => {
    if (!requireAuth()) return;

    items.set((current) =>
      current.filter((item) => item.productId !== productId)
    );
  };

  /**
   * Update quantity of a specific item.
   * @returns true if updated successfully, false if validation failed
   */
  const updateQuantity = (productId: number, quantity: number): boolean => {
    if (!requireAuth()) return false;

    if (quantity <= 0) {
      removeItem(productId);
      return true;
    }

    const currentItems = items();
    const item = currentItems.find((i) => i.productId === productId);

    if (!item) return false;

    // Check if exceeds stock
    if (quantity > item.product.stock) {
      $alert.warning(
        `Only ${item.product.stock} available in stock.`,
        `Cannot set quantity to ${quantity}`
      );
      return false;
    }

    items.set((current) =>
      current.map((i) =>
        i.productId === productId ? { ...i, quantity } : i
      )
    );

    return true;
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
