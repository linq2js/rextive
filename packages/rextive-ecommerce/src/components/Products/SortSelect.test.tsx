import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@/test/utils";
import { logic, signal } from "rextive";
import { SortSelect } from "./SortSelect";
import { productsLogic } from "@/logic/productsLogic";

describe("SortSelect", () => {
  afterEach(() => {
    logic.clear();
  });

  const setupProductsLogic = (overrides = {}) => {
    const instance = {
      sortBy: signal<"title" | "price" | "rating">("title"),
      sortOrder: signal<"asc" | "desc">("asc"),
      category: signal<string | null>(null),
      search: signal(""),
      setSort: vi.fn(),
      ...overrides,
    };
    // Use type assertion for partial mock
    logic.provide(productsLogic as any, () => instance);
    return instance;
  };

  it("should show sort label", () => {
    setupProductsLogic();

    render(<SortSelect />);

    expect(screen.getByText("Sort by:")).toBeInTheDocument();
  });

  it("should show default selection", () => {
    setupProductsLogic({ sortBy: signal("title"), sortOrder: signal("asc") });

    render(<SortSelect />);

    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("title-asc");
  });

  it("should call setSort when selection changes", () => {
    const products = setupProductsLogic();

    render(<SortSelect />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "price-desc" } });

    expect(products.setSort).toHaveBeenCalledWith("price", "desc");
  });

  it("should show all sort options", () => {
    setupProductsLogic();

    render(<SortSelect />);

    expect(screen.getByText("Name: A-Z")).toBeInTheDocument();
    expect(screen.getByText("Name: Z-A")).toBeInTheDocument();
    expect(screen.getByText("Price: Low to High")).toBeInTheDocument();
    expect(screen.getByText("Price: High to Low")).toBeInTheDocument();
    expect(screen.getByText("Top Rated")).toBeInTheDocument();
  });

  it("should reflect current sort state", () => {
    setupProductsLogic({ sortBy: signal("price"), sortOrder: signal("desc") });

    render(<SortSelect />);

    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("price-desc");
  });

  it("should be disabled when category is selected", () => {
    setupProductsLogic({ category: signal("furniture") });

    render(<SortSelect />);

    const select = screen.getByRole("combobox");
    expect(select).toBeDisabled();
  });

  it("should be disabled when search is active", () => {
    setupProductsLogic({ search: signal("phone") });

    render(<SortSelect />);

    const select = screen.getByRole("combobox");
    expect(select).toBeDisabled();
  });

  it("should be enabled when no category or search", () => {
    setupProductsLogic({ category: signal(null), search: signal("") });

    render(<SortSelect />);

    const select = screen.getByRole("combobox");
    expect(select).not.toBeDisabled();
  });
});
