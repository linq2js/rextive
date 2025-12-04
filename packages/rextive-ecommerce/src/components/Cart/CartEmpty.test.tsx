import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/utils";
import { CartEmpty } from "./CartEmpty";

describe("CartEmpty", () => {
  it("should display empty cart message", () => {
    render(<CartEmpty onClose={vi.fn()} />);

    expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
    expect(
      screen.getByText("Looks like you haven't added anything yet")
    ).toBeInTheDocument();
  });

  it("should call onClose when Continue Shopping is clicked", () => {
    const onClose = vi.fn();
    render(<CartEmpty onClose={onClose} />);

    fireEvent.click(screen.getByText("Continue Shopping"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
