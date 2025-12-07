import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SearchBar } from "./SearchBar";

// Mock productsLogic
const mockSetSearch = vi.fn();
vi.mock("@/logic/productsLogic", () => ({
  productsLogic: vi.fn(() => ({
    setSearch: mockSetSearch,
  })),
}));

describe("SearchBar", () => {
  beforeEach(() => {
    mockSetSearch.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("should render with empty input", () => {
    render(<SearchBar />);

    const input = screen.getByPlaceholderText("Search products...");
    expect(input).toHaveValue("");
  });

  it("should update input value on change", () => {
    render(<SearchBar />);

    const input = screen.getByPlaceholderText("Search products...");
    fireEvent.change(input, { target: { value: "laptop" } });

    expect(input).toHaveValue("laptop");
    expect(mockSetSearch).toHaveBeenCalledWith("laptop");
  });

  it("should show clear button when input has value", () => {
    render(<SearchBar />);

    const input = screen.getByPlaceholderText("Search products...");
    fireEvent.change(input, { target: { value: "laptop" } });

    // Clear button should be visible
    const clearButton = screen.getByRole("button");
    expect(clearButton).toBeInTheDocument();
  });

  it("should clear input when clear button is clicked", () => {
    render(<SearchBar />);

    const input = screen.getByPlaceholderText("Search products...");
    fireEvent.change(input, { target: { value: "laptop" } });

    const clearButton = screen.getByRole("button");
    fireEvent.click(clearButton);

    expect(input).toHaveValue("");
    expect(mockSetSearch).toHaveBeenLastCalledWith("");
  });

  it("should not show clear button when input is empty", () => {
    render(<SearchBar />);

    const clearButton = screen.queryByRole("button");
    expect(clearButton).not.toBeInTheDocument();
  });
});
