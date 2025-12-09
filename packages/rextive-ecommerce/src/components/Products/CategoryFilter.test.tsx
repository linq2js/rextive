import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/utils";
import { signal } from "rextive";
import { mockLogic } from "rextive/test";
import { CategoryFilter } from "./CategoryFilter";
import { productsLogic } from "@/logic/productsLogic";
import type { Category } from "@/api/types";

const mockCategories: Category[] = [
  { slug: "smartphones", name: "Smartphones", url: "/category/smartphones" },
  { slug: "laptops", name: "Laptops", url: "/category/laptops" },
  { slug: "fragrances", name: "Fragrances", url: "/category/fragrances" },
];

// Helper to create mock task states for testing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMockTaskSignal = <T,>(taskState: { loading: boolean; value: T; error?: unknown }) => {
  return signal(taskState) as any;
};

describe("CategoryFilter", () => {
  const $products = mockLogic(productsLogic);

  beforeEach(() => {
    // Use a signal that directly returns the success task state
    $products.default({
      category: signal<string | null>(null),
      categoriesTask: createMockTaskSignal({ loading: false, value: mockCategories }),
      setCategory: vi.fn(),
    });
  });

  afterEach(() => {
    $products.clear();
  });

  it("should show All button selected by default", () => {
    $products.provide({ category: signal(null) });

    render(<CategoryFilter />);

    const allButton = screen.getByText("All");
    expect(allButton).toBeInTheDocument();
    // All button should have the selected style (bg-brand-600)
    expect(allButton.className).toContain("bg-brand-600");
  });

  it("should show category buttons", () => {
    $products.provide({ category: signal(null) });

    render(<CategoryFilter />);

    expect(screen.getByText("Smartphones")).toBeInTheDocument();
    expect(screen.getByText("Laptops")).toBeInTheDocument();
    expect(screen.getByText("Fragrances")).toBeInTheDocument();
  });

  it("should call setCategory when category is clicked", () => {
    const mock = $products.provide({
      category: signal(null),
      setCategory: vi.fn(),
    });

    render(<CategoryFilter />);

    fireEvent.click(screen.getByText("Laptops"));

    expect(mock.setCategory).toHaveBeenCalledWith("laptops");
  });

  it("should call setCategory(null) when All is clicked", () => {
    const mock = $products.provide({
      category: signal("smartphones"),
      setCategory: vi.fn(),
    });

    render(<CategoryFilter />);

    fireEvent.click(screen.getByText("All"));

    expect(mock.setCategory).toHaveBeenCalledWith(null);
  });

  it("should show loading skeletons when loading", () => {
    // Create a loading task state with empty array as fallback
    $products.provide({
      category: signal(null),
      categoriesTask: createMockTaskSignal<Category[]>({ loading: true, value: [] }),
    });

    render(<CategoryFilter />);

    // Should show skeleton elements
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should highlight selected category", () => {
    $products.provide({ category: signal("laptops") });

    render(<CategoryFilter />);

    const laptopsButton = screen.getByText("Laptops");
    expect(laptopsButton.className).toContain("bg-brand-600");

    // All button should not be selected
    const allButton = screen.getByText("All");
    expect(allButton.className).not.toContain("bg-brand-600");
  });
});
