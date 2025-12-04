import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@/test/utils";
import { logic, signal } from "rextive";
import { CategoryFilter } from "./CategoryFilter";
import { productsLogic } from "@/logic/productsLogic";

const mockCategories = [
  { slug: "smartphones", name: "Smartphones", url: "/category/smartphones" },
  { slug: "laptops", name: "Laptops", url: "/category/laptops" },
  { slug: "fragrances", name: "Fragrances", url: "/category/fragrances" },
];

describe("CategoryFilter", () => {
  afterEach(() => {
    logic.clear();
  });

  const setupProductsLogic = (overrides = {}) => {
    const instance = {
      category: signal<string | null>(null),
      categoriesTask: signal({
        loading: false,
        error: undefined,
        value: mockCategories,
      }),
      setCategory: vi.fn(),
      ...overrides,
    };
    // Use type assertion for partial mock
    logic.provide(productsLogic as any, () => instance);
    return instance;
  };

  it("should show All button selected by default", () => {
    setupProductsLogic({ category: signal(null) });

    render(<CategoryFilter />);

    const allButton = screen.getByText("All");
    expect(allButton).toBeInTheDocument();
    // All button should have the selected style (bg-brand-600)
    expect(allButton.className).toContain("bg-brand-600");
  });

  it("should show category buttons", () => {
    setupProductsLogic({ category: signal(null) });

    render(<CategoryFilter />);

    expect(screen.getByText("Smartphones")).toBeInTheDocument();
    expect(screen.getByText("Laptops")).toBeInTheDocument();
    expect(screen.getByText("Fragrances")).toBeInTheDocument();
  });

  it("should call setCategory when category is clicked", () => {
    const products = setupProductsLogic({ category: signal(null) });

    render(<CategoryFilter />);

    fireEvent.click(screen.getByText("Laptops"));

    expect(products.setCategory).toHaveBeenCalledWith("laptops");
  });

  it("should call setCategory(null) when All is clicked", () => {
    const products = setupProductsLogic({ category: signal("smartphones") });

    render(<CategoryFilter />);

    fireEvent.click(screen.getByText("All"));

    expect(products.setCategory).toHaveBeenCalledWith(null);
  });

  it("should show loading skeletons when loading", () => {
    setupProductsLogic({
      category: signal(null),
      categoriesTask: signal({
        loading: true,
        error: undefined,
        value: [],
      }),
    });

    render(<CategoryFilter />);

    // Should show skeleton elements
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should highlight selected category", () => {
    setupProductsLogic({ category: signal("laptops") });

    render(<CategoryFilter />);

    const laptopsButton = screen.getByText("Laptops");
    expect(laptopsButton.className).toContain("bg-brand-600");

    // All button should not be selected
    const allButton = screen.getByText("All");
    expect(allButton.className).not.toContain("bg-brand-600");
  });
});
