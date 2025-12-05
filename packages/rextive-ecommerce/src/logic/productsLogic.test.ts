import { describe, it, expect, beforeEach, vi } from "vitest";
import { logic } from "rextive";
import { productsLogic } from "./productsLogic";
import { productsApi } from "@/api/client";

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

const mockProducts = {
  products: [
    { id: 1, title: "Product 1", price: 10 },
    { id: 2, title: "Product 2", price: 20 },
  ],
  total: 50,
  skip: 0,
  limit: 12,
};

const mockCategories = ["electronics", "clothing", "home"];

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

