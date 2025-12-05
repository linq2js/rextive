import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/utils";
import { signal } from "rextive";
import { mockLogic } from "rextive/test";
import { SortSelect } from "./SortSelect";
import { productsLogic } from "@/logic/productsLogic";

describe("SortSelect", () => {
  const $products = mockLogic(productsLogic);

  beforeEach(() => {
    $products.default({
      sortBy: signal<"title" | "price" | "rating">("title"),
      sortOrder: signal<"asc" | "desc">("asc"),
      category: signal<string | null>(null),
      search: signal(""),
      setSort: vi.fn(),
    });
  });

  afterEach(() => {
    $products.clear();
  });

  it("should show sort label", () => {
    $products.provide({});

    render(<SortSelect />);

    expect(screen.getByText("Sort by:")).toBeInTheDocument();
  });

  it("should show default selection", () => {
    $products.provide({ sortBy: signal("title"), sortOrder: signal("asc") });

    render(<SortSelect />);

    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("title-asc");
  });

  it("should call setSort when selection changes", () => {
    const mock = $products.provide({ setSort: vi.fn() });

    render(<SortSelect />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "price-desc" } });

    expect(mock.setSort).toHaveBeenCalledWith("price", "desc");
  });

  it("should show all sort options", () => {
    $products.provide({});

    render(<SortSelect />);

    expect(screen.getByText("Name: A-Z")).toBeInTheDocument();
    expect(screen.getByText("Name: Z-A")).toBeInTheDocument();
    expect(screen.getByText("Price: Low to High")).toBeInTheDocument();
    expect(screen.getByText("Price: High to Low")).toBeInTheDocument();
    expect(screen.getByText("Top Rated")).toBeInTheDocument();
  });

  it("should reflect current sort state", () => {
    $products.provide({ sortBy: signal("price"), sortOrder: signal("desc") });

    render(<SortSelect />);

    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("price-desc");
  });

  it("should be disabled when category is selected", () => {
    $products.provide({ category: signal("furniture") });

    render(<SortSelect />);

    const select = screen.getByRole("combobox");
    expect(select).toBeDisabled();
  });

  it("should be disabled when search is active", () => {
    $products.provide({ search: signal("phone") });

    render(<SortSelect />);

    const select = screen.getByRole("combobox");
    expect(select).toBeDisabled();
  });

  it("should be enabled when no category or search", () => {
    $products.provide({ category: signal(null), search: signal("") });

    render(<SortSelect />);

    const select = screen.getByRole("combobox");
    expect(select).not.toBeDisabled();
  });
});
