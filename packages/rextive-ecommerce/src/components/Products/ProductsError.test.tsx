import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/utils";
import { ProductsError } from "./ProductsError";

describe("ProductsError", () => {
  it("should display error message", () => {
    render(
      <ProductsError error={new Error("Network error")} onRetry={vi.fn()} />
    );

    expect(screen.getByText("Failed to load products")).toBeInTheDocument();
    expect(screen.getByText("Error: Network error")).toBeInTheDocument();
  });

  it("should display string error", () => {
    render(<ProductsError error="Something went wrong" onRetry={vi.fn()} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("should call onRetry when Try Again is clicked", () => {
    const onRetry = vi.fn();
    render(<ProductsError error="Error" onRetry={onRetry} />);

    fireEvent.click(screen.getByText("Try Again"));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
