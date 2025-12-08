import { describe, it, expect, beforeEach, vi } from "vitest";
import { logic } from "rextive";
import { productsLogic } from "./productsLogic";
import { productsApi } from "@/api/client";
import type { Product, ProductsResponse, Category } from "@/api/types";

// Mock productsApi
vi.mock("@/api/client", () => ({
  productsApi: {
    getCategories: vi.fn(),
    search: vi.fn(),
    getByCategory: vi.fn(),
    getSorted: vi.fn(),
  },
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

const createMockProduct = (id: number, title: string, price: number): Product => ({
  id,
  title,
  description: `Description for ${title}`,
  price,
  discountPercentage: 10,
  rating: 4.5,
  stock: 100,
  brand: "Test Brand",
  category: "electronics",
  thumbnail: `thumb${id}.jpg`,
  images: [`img${id}.jpg`],
  tags: ["test"],
  sku: `SKU-${id}`,
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
    barcode: `BAR-${id}`,
    qrCode: `qr${id}.png`,
  },
});

const mockProducts: ProductsResponse = {
  products: [
    createMockProduct(1, "Product 1", 10),
    createMockProduct(2, "Product 2", 20),
  ],
  total: 50,
  skip: 0,
  limit: 12,
};

const mockCategories: Category[] = [
  { slug: "electronics", name: "Electronics", url: "/electronics" },
  { slug: "clothing", name: "Clothing", url: "/clothing" },
  { slug: "home", name: "Home", url: "/home" },
];

describe("productsLogic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logic.clear();
    vi.mocked(productsApi.getSorted).mockResolvedValue(mockProducts);
    vi.mocked(productsApi.getCategories).mockResolvedValue(mockCategories);
    vi.mocked(productsApi.search).mockResolvedValue(mockProducts);
    vi.mocked(productsApi.getByCategory).mockResolvedValue(mockProducts);
  });

  it("should initialize with default state", () => {
    const products = productsLogic.create();

    expect(products.search()).toBe("");
    expect(products.category()).toBeNull();
    expect(products.sortBy()).toBe("title");
    expect(products.sortOrder()).toBe("asc");
    expect(products.page()).toBe(1);
  });

  it("should set search and reset page", () => {
    const products = productsLogic.create();
    products.setPage(3);

    products.setSearch("laptop");

    expect(products.search()).toBe("laptop");
    expect(products.page()).toBe(1);
  });

  it("should set category and clear search", () => {
    const products = productsLogic.create();
    products.setSearch("test");

    products.setCategory("electronics");

    expect(products.category()).toBe("electronics");
    expect(products.search()).toBe("");
    expect(products.page()).toBe(1);
  });

  it("should set sort options", () => {
    const products = productsLogic.create();

    products.setSort("price", "desc");

    expect(products.sortBy()).toBe("price");
    expect(products.sortOrder()).toBe("desc");
  });

  it("should set page directly", () => {
    const products = productsLogic.create();

    products.setPage(2);
    expect(products.page()).toBe(2);

    products.setPage(5);
    expect(products.page()).toBe(5);
  });

  it("should navigate with prevPage", () => {
    const products = productsLogic.create();
    products.setPage(3);

    products.prevPage();

    expect(products.page()).toBe(2);
  });

  it("should not go below page 1", () => {
    const products = productsLogic.create();

    products.prevPage();

    expect(products.page()).toBe(1);
  });

  it("should clear category when set to null", () => {
    const products = productsLogic.create();
    products.setCategory("electronics");

    products.setCategory(null);

    expect(products.category()).toBeNull();
  });
});

