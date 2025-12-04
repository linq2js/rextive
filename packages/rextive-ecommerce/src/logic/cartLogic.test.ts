import { describe, it, expect, beforeEach, vi } from "vitest";
import { logic, signal } from "rextive";
import { cartLogic } from "./cartLogic";
import { authLogic } from "./authLogic";
import type { Product } from "@/api/types";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(global, "localStorage", { value: localStorageMock });

// Helper to setup auth mock (authenticated by default)
const setupAuthMock = (isAuthenticated = true) => {
  const instance = {
    user: signal(isAuthenticated ? { id: 1, username: "test" } : null),
    isAuthenticated: signal(isAuthenticated).to((v) => v),
    openLoginModal: vi.fn(),
  };
  logic.provide(authLogic as any, () => instance as any);
  return instance;
};

// Mock product
const mockProduct: Product = {
  id: 1,
  title: "Test Product",
  description: "A test product",
  price: 100,
  discountPercentage: 10,
  rating: 4.5,
  stock: 50,
  brand: "Test",
  category: "test",
  thumbnail: "https://example.com/thumb.jpg",
  images: [],
  tags: [],
  sku: "TEST1",
  weight: 100,
  dimensions: { width: 10, height: 10, depth: 5 },
  warrantyInformation: "1 year",
  shippingInformation: "Ships in 1 day",
  availabilityStatus: "In Stock",
  reviews: [],
  returnPolicy: "30 days",
  minimumOrderQuantity: 1,
  meta: {
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    barcode: "123",
    qrCode: "https://example.com/qr",
  },
};

describe("cartLogic", () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    logic.clear();
  });

  it("should start with empty cart", () => {
    setupAuthMock(true);
    const cart = cartLogic.create();

    expect(cart.items()).toEqual([]);
    expect(cart.itemCount()).toBe(0);
    expect(cart.subtotal()).toBe(0);
  });

  it("should add item to cart when authenticated", () => {
    setupAuthMock(true);
    const cart = cartLogic.create();

    cart.addItem(mockProduct, 2);

    expect(cart.items()).toHaveLength(1);
    expect(cart.items()[0].productId).toBe(1);
    expect(cart.items()[0].quantity).toBe(2);
    expect(cart.itemCount()).toBe(2);
  });

  it("should show login modal when adding item while not authenticated", () => {
    const authMock = setupAuthMock(false);
    const cart = cartLogic.create();

    cart.addItem(mockProduct, 2);

    expect(authMock.openLoginModal).toHaveBeenCalled();
    expect(cart.items()).toHaveLength(0);
  });

  it("should increase quantity when adding existing item", () => {
    setupAuthMock(true);
    const cart = cartLogic.create();

    cart.addItem(mockProduct, 1);
    cart.addItem(mockProduct, 2);

    expect(cart.items()).toHaveLength(1);
    expect(cart.items()[0].quantity).toBe(3);
    expect(cart.itemCount()).toBe(3);
  });

  it("should remove item from cart", () => {
    setupAuthMock(true);
    const cart = cartLogic.create();

    cart.addItem(mockProduct, 1);
    expect(cart.items()).toHaveLength(1);

    cart.removeItem(mockProduct.id);
    expect(cart.items()).toHaveLength(0);
  });

  it("should update item quantity", () => {
    setupAuthMock(true);
    const cart = cartLogic.create();

    cart.addItem(mockProduct, 1);
    cart.updateQuantity(mockProduct.id, 5);

    expect(cart.items()[0].quantity).toBe(5);
    expect(cart.itemCount()).toBe(5);
  });

  it("should remove item when quantity set to 0", () => {
    setupAuthMock(true);
    const cart = cartLogic.create();

    cart.addItem(mockProduct, 2);
    cart.updateQuantity(mockProduct.id, 0);

    expect(cart.items()).toHaveLength(0);
  });

  it("should calculate subtotal with discount", () => {
    setupAuthMock(true);
    const cart = cartLogic.create();

    // Product: $100 with 10% discount = $90 per item
    cart.addItem(mockProduct, 2);

    // 2 * $90 = $180
    expect(cart.subtotal()).toBe(180);
  });

  it("should calculate total discount", () => {
    setupAuthMock(true);
    const cart = cartLogic.create();

    // Product: $100 with 10% discount = $10 discount per item
    cart.addItem(mockProduct, 2);

    // 2 * $10 = $20 total discount
    expect(cart.totalDiscount()).toBe(20);
  });

  it("should clear all items", () => {
    setupAuthMock(true);
    const cart = cartLogic.create();

    cart.addItem(mockProduct, 3);
    expect(cart.items()).toHaveLength(1);

    cart.clearCart();
    expect(cart.items()).toHaveLength(0);
    expect(cart.itemCount()).toBe(0);
  });

  it("should open and close drawer", () => {
    setupAuthMock(true);
    const cart = cartLogic.create();

    expect(cart.drawerOpen()).toBe(false);

    cart.openDrawer();
    expect(cart.drawerOpen()).toBe(true);

    cart.closeDrawer();
    expect(cart.drawerOpen()).toBe(false);
  });
});
