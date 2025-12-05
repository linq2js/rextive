import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/utils";
import { signal } from "rextive";
import { mockLogic } from "rextive/test";
import { CartButton } from "./CartButton";
import { cartLogic } from "@/logic/cartLogic";

describe("CartButton", () => {
  const $cart = mockLogic(cartLogic);

  beforeEach(() => {
    $cart.default({
      openDrawer: vi.fn(),
      itemCount: signal(0),
    });
  });

  afterEach(() => {
    $cart.clear();
  });

  it("should not show badge when cart is empty", () => {
    $cart.provide({ itemCount: signal(0) });

    render(<CartButton />);

    // Badge should not be present when count is 0
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("should show badge with item count", () => {
    $cart.provide({ itemCount: signal(5) });

    render(<CartButton />);

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should show 99+ when count exceeds 99", () => {
    $cart.provide({ itemCount: signal(150) });

    render(<CartButton />);

    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("should call openDrawer when clicked", () => {
    const mock = $cart.provide({
      itemCount: signal(3),
      openDrawer: vi.fn(),
    });

    render(<CartButton />);

    fireEvent.click(screen.getByRole("button", { name: /shopping cart/i }));

    expect(mock.openDrawer).toHaveBeenCalledTimes(1);
  });
});
