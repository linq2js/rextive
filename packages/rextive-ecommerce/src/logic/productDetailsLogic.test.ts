import { describe, it, expect, beforeEach, vi } from "vitest";
import { logic } from "rextive";
import { productDetailsLogic } from "./productDetailsLogic";
import { productsApi } from "@/api/client";

// Mock productsApi
vi.mock("@/api/client", () => ({
  productsApi: {
    getById: vi.fn(),
  },
}));

const mockProduct = {
  id: 1,
  title: "Test Product",
  price: 99.99,
  stock: 10,
  images: ["img1.jpg", "img2.jpg", "img3.jpg"],
};

describe("productDetailsLogic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logic.clear();
    vi.mocked(productsApi.getById).mockResolvedValue(mockProduct);
  });

  it("should initialize with default state", () => {
    const details = productDetailsLogic.create();

    expect(details.productId()).toBeNull();
    expect(details.selectedImageIndex()).toBe(0);
    expect(details.quantity()).toBe(1);
  });

  it("should load product and reset state", () => {
    const details = productDetailsLogic.create();
    details.selectImage(2);
    details.setQuantity(5);

    details.loadProduct(42);

    expect(details.productId()).toBe(42);
    expect(details.selectedImageIndex()).toBe(0);
    expect(details.quantity()).toBe(1);
  });

  it("should select image index", () => {
    const details = productDetailsLogic.create();

    details.selectImage(2);

    expect(details.selectedImageIndex()).toBe(2);
  });

  it("should set quantity within bounds", () => {
    const details = productDetailsLogic.create();

    details.setQuantity(5);
    expect(details.quantity()).toBe(5);

    details.setQuantity(0);
    expect(details.quantity()).toBe(1); // Min is 1
  });

  it("should increment and decrement quantity", () => {
    const details = productDetailsLogic.create();

    details.incrementQuantity();
    expect(details.quantity()).toBe(2);

    details.incrementQuantity();
    expect(details.quantity()).toBe(3);

    details.decrementQuantity();
    expect(details.quantity()).toBe(2);
  });

  it("should not decrement below 1", () => {
    const details = productDetailsLogic.create();

    details.decrementQuantity();

    expect(details.quantity()).toBe(1);
  });

  it("should reset all state", () => {
    const details = productDetailsLogic.create();
    details.loadProduct(42);
    details.selectImage(2);
    details.setQuantity(5);

    details.reset();

    expect(details.productId()).toBeNull();
    expect(details.selectedImageIndex()).toBe(0);
    expect(details.quantity()).toBe(1);
  });
});

