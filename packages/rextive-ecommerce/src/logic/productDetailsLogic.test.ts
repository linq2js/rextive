import { describe, it, expect, beforeEach, vi } from "vitest";
import { logic } from "rextive";
import { productDetailsLogic } from "./productDetailsLogic";
import { productsApi } from "@/api/client";
import type { Product } from "@/api/types";

// Mock productsApi
vi.mock("@/api/client", () => ({
  productsApi: {
    getById: vi.fn(),
  },
}));

const mockProduct: Product = {
  id: 1,
  title: "Test Product",
  description: "A test product",
  price: 99.99,
  discountPercentage: 10,
  rating: 4.5,
  stock: 10,
  brand: "Test Brand",
  category: "electronics",
  thumbnail: "thumb.jpg",
  images: ["img1.jpg", "img2.jpg", "img3.jpg"],
  tags: ["test"],
  sku: "TEST-001",
  weight: 1,
  dimensions: { width: 10, height: 10, depth: 10 },
  warrantyInformation: "1 year",
  shippingInformation: "Ships in 3-5 days",
  availabilityStatus: "In Stock",
  reviews: [],
  returnPolicy: "30 days",
  minimumOrderQuantity: 1,
  meta: {
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    barcode: "123456",
    qrCode: "qr.png",
  },
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
    expect(details.quantity()).toBe(1);
  });

  it("should load product and reset quantity", () => {
    const details = productDetailsLogic.create();
    details.setQuantity(5);

    details.loadProduct(42);

    expect(details.productId()).toBe(42);
    expect(details.quantity()).toBe(1);
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
    details.setQuantity(5);

    details.reset();

    expect(details.productId()).toBeNull();
    expect(details.quantity()).toBe(1);
  });
});

