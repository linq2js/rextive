import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@/test/utils";
import { logic, signal } from "rextive";
import { CartButton } from "./CartButton";
import { cartLogic } from "@/logic/cart";

describe("CartButton", () => {
  afterEach(() => {
    logic.clear();
  });

  const setupCartLogic = (overrides = {}) => {
    const instance = {
      openDrawer: vi.fn(),
      itemCount: signal(0),
      ...overrides,
    };
    // Use type assertion for partial mock
    logic.provide(cartLogic as any, () => instance);
    return instance;
  };

  it("should not show badge when cart is empty", () => {
    setupCartLogic({ itemCount: signal(0) });

    render(<CartButton />);

    // Badge should not be present when count is 0
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("should show badge with item count", () => {
    setupCartLogic({ itemCount: signal(5) });

    render(<CartButton />);

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should show 99+ when count exceeds 99", () => {
    setupCartLogic({ itemCount: signal(150) });

    render(<CartButton />);

    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("should call openDrawer when clicked", () => {
    const cart = setupCartLogic({ itemCount: signal(3) });

    render(<CartButton />);

    fireEvent.click(screen.getByRole("button", { name: /shopping cart/i }));

    expect(cart.openDrawer).toHaveBeenCalledTimes(1);
  });
});
