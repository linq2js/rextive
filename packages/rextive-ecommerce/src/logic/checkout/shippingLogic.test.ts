import { describe, it, expect, beforeEach, vi } from "vitest";
import { logic, signal } from "rextive";
import { shippingLogic } from "./shippingLogic";
import { authLogic } from "../authLogic";
import { DEFAULT_SHIPPING_INFO } from "./types";

// Mock authLogic
const mockUser = signal<{
  firstName: string;
  lastName: string;
  email: string;
} | null>(null);

vi.mock("../authLogic", () => ({
  authLogic: vi.fn(() => ({
    user: mockUser,
  })),
}));

describe("shippingLogic", () => {
  beforeEach(() => {
    logic.clear();
    mockUser.set(null);
  });

  it("should initialize with default shipping info", () => {
    const shipping = shippingLogic.create();

    expect(shipping.info()).toEqual(DEFAULT_SHIPPING_INFO);
  });

  it("should start as invalid", () => {
    const shipping = shippingLogic.create();

    expect(shipping.isValid()).toBe(false);
  });

  it("should update shipping info partially", () => {
    const shipping = shippingLogic.create();

    shipping.update({ firstName: "John", lastName: "Doe" });

    expect(shipping.info().firstName).toBe("John");
    expect(shipping.info().lastName).toBe("Doe");
    expect(shipping.info().email).toBe(""); // Unchanged
  });

  it("should validate when all required fields are filled", () => {
    const shipping = shippingLogic.create();

    shipping.update({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      address: "123 Main St",
      city: "New York",
      postalCode: "10001",
      country: "USA",
    });

    expect(shipping.isValid()).toBe(true);
  });

  it("should be invalid with missing required field", () => {
    const shipping = shippingLogic.create();

    shipping.update({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      address: "123 Main St",
      city: "New York",
      // Missing postalCode
      country: "USA",
    });

    expect(shipping.isValid()).toBe(false);
  });

  it("should be invalid with invalid email", () => {
    const shipping = shippingLogic.create();

    shipping.update({
      firstName: "John",
      lastName: "Doe",
      email: "invalid-email", // No @
      address: "123 Main St",
      city: "New York",
      postalCode: "10001",
      country: "USA",
    });

    expect(shipping.isValid()).toBe(false);
  });

  it("should prefill from logged-in user", () => {
    mockUser.set({
      firstName: "Emily",
      lastName: "Smith",
      email: "emily@example.com",
    });
    const shipping = shippingLogic.create();

    shipping.prefillFromUser();

    expect(shipping.info().firstName).toBe("Emily");
    expect(shipping.info().lastName).toBe("Smith");
    expect(shipping.info().email).toBe("emily@example.com");
  });

  it("should not prefill when no user is logged in", () => {
    mockUser.set(null);
    const shipping = shippingLogic.create();

    shipping.prefillFromUser();

    expect(shipping.info().firstName).toBe("");
  });

  it("should reset to defaults", () => {
    const shipping = shippingLogic.create();
    shipping.update({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
    });

    shipping.reset();

    expect(shipping.info()).toEqual(DEFAULT_SHIPPING_INFO);
  });
});

