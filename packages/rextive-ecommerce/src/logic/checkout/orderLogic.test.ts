import { describe, it, expect, beforeEach, vi } from "vitest";
import { logic, signal } from "rextive";
import { orderLogic } from "./orderLogic";
import { cartLogic } from "../cartLogic";
import { shippingLogic } from "./shippingLogic";
import { paymentLogic } from "./paymentLogic";
import { SHIPPING_COST, TAX_RATE } from "./types";

// Mock dependencies
const mockCartItems = signal<
  Array<{
    productId: number;
    product: { id: number; title: string; price: number; discountPercentage: number };
    quantity: number;
  }>
>([]);
const mockSubtotal = signal(0);

vi.mock("../cartLogic", () => ({
  cartLogic: vi.fn(() => ({
    items: mockCartItems,
    subtotal: mockSubtotal,
    _clearAfterOrder: vi.fn(),
  })),
}));

const mockShippingInfo = signal({
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  address: "123 Main St",
  city: "New York",
  postalCode: "10001",
  country: "USA",
});

vi.mock("./shippingLogic", () => ({
  shippingLogic: vi.fn(() => ({
    info: mockShippingInfo,
  })),
}));

const mockPaymentMethod = signal<"card" | "paypal" | "cod">("card");

vi.mock("./paymentLogic", () => ({
  paymentLogic: vi.fn(() => ({
    method: mockPaymentMethod,
  })),
}));

describe("orderLogic", () => {
  beforeEach(() => {
    logic.clear();
    vi.clearAllMocks();
    mockCartItems.set([]);
    mockSubtotal.set(0);
    mockPaymentMethod.set("card");
  });

  it("should have fixed shipping cost", () => {
    const order = orderLogic.create();

    expect(order.shippingCost()).toBe(SHIPPING_COST);
  });

  it("should calculate tax from subtotal", () => {
    mockSubtotal.set(100);
    const order = orderLogic.create();

    expect(order.tax()).toBe(100 * TAX_RATE);
  });

  it("should calculate total", () => {
    mockSubtotal.set(100);
    const order = orderLogic.create();

    const expectedTotal = 100 + SHIPPING_COST + 100 * TAX_RATE;
    expect(order.total()).toBe(expectedTotal);
  });

  it("should return null from orderAsync when no request", async () => {
    const order = orderLogic.create();

    const result = await order.orderAsync();

    expect(result).toBeNull();
  });

  it("should reset order state", () => {
    const order = orderLogic.create();
    // Trigger an order first
    mockCartItems.set([
      {
        productId: 1,
        product: { id: 1, title: "Test", price: 50, discountPercentage: 0 },
        quantity: 2,
      },
    ]);
    mockSubtotal.set(100);

    order.reset();

    // After reset, orderAsync should return null
    expect(order.orderAsync()).resolves.toBeNull();
  });

  it("should update tax when subtotal changes", () => {
    mockSubtotal.set(50);
    const order = orderLogic.create();

    expect(order.tax()).toBe(50 * TAX_RATE);

    mockSubtotal.set(200);
    expect(order.tax()).toBe(200 * TAX_RATE);
  });

  it("should update total when subtotal changes", () => {
    mockSubtotal.set(50);
    const order = orderLogic.create();

    const expectedTotal1 = 50 + SHIPPING_COST + 50 * TAX_RATE;
    expect(order.total()).toBe(expectedTotal1);

    mockSubtotal.set(200);
    const expectedTotal2 = 200 + SHIPPING_COST + 200 * TAX_RATE;
    expect(order.total()).toBe(expectedTotal2);
  });
});

