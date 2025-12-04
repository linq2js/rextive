import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/utils";
import { CartSummary } from "./CartSummary";

describe("CartSummary", () => {
  it("should display subtotal", () => {
    render(<CartSummary subtotal={99.99} discount={0} onClear={vi.fn()} />);

    expect(screen.getByText("$99.99")).toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
  });

  it("should display discount when greater than zero", () => {
    render(<CartSummary subtotal={89.99} discount={10} onClear={vi.fn()} />);

    expect(screen.getByText("-$10.00")).toBeInTheDocument();
    expect(screen.getByText("Discount")).toBeInTheDocument();
  });

  it("should not display discount when zero", () => {
    render(<CartSummary subtotal={99.99} discount={0} onClear={vi.fn()} />);

    expect(screen.queryByText("Discount")).not.toBeInTheDocument();
  });

  it("should call onClear when Clear Cart button is clicked", () => {
    const onClear = vi.fn();
    render(<CartSummary subtotal={99.99} discount={0} onClear={onClear} />);

    fireEvent.click(screen.getByText("Clear Cart"));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("should display Checkout button", () => {
    render(<CartSummary subtotal={99.99} discount={0} onClear={vi.fn()} />);

    expect(screen.getByText("Checkout")).toBeInTheDocument();
  });
});
