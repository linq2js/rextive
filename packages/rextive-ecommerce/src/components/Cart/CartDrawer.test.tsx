import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@/test/utils";
import { logic, signal } from "rextive";
import { CartDrawer } from "./CartDrawer";
import { cartLogic } from "@/logic/cart";
import type { TestInstance } from "rextive";

describe("CartDrawer", () => {
  afterEach(() => {
    logic.clear();
  });

  const setupCartLogic = (overrides = {}) => {
    const instance: TestInstance<typeof cartLogic> = {
      drawerOpen: signal(false),
      closeDrawer: vi.fn(),
      items: signal([]),
      itemCount: signal(0),
      subtotal: signal(0),
      totalDiscount: signal(0),
      clearCart: vi.fn(),
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      openDrawer: vi.fn(),
      ...overrides,
    };
    logic.provide(cartLogic, () => instance);
    return instance;
  };

  it("should be hidden when drawer is closed", () => {
    setupCartLogic({ drawerOpen: signal(false) });

    render(<CartDrawer />);

    const aside = screen.getByRole("complementary", { name: /shopping cart/i });
    expect(aside.className).toContain("translate-x-full");
  });

  it("should be visible when drawer is open", () => {
    setupCartLogic({ drawerOpen: signal(true) });

    render(<CartDrawer />);

    const aside = screen.getByRole("complementary", { name: /shopping cart/i });
    expect(aside.className).toContain("translate-x-0");
  });

  it("should show Your Cart title", () => {
    setupCartLogic({ drawerOpen: signal(true) });

    render(<CartDrawer />);

    expect(screen.getByText("Your Cart")).toBeInTheDocument();
  });

  it("should call closeDrawer when backdrop is clicked", () => {
    const cart = setupCartLogic({ drawerOpen: signal(true) });

    render(<CartDrawer />);

    const backdrop = document.querySelector('[aria-hidden="true"]');
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    expect(cart.closeDrawer).toHaveBeenCalled();
  });

  it("should show empty cart message when cart is empty", () => {
    setupCartLogic({ drawerOpen: signal(true), items: signal([]) });

    render(<CartDrawer />);

    expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
  });

  it("should show item count in header", () => {
    setupCartLogic({ drawerOpen: signal(true), itemCount: signal(3) });

    render(<CartDrawer />);

    expect(screen.getByText("(3 items)")).toBeInTheDocument();
  });

  it("should show singular item text for 1 item", () => {
    setupCartLogic({ drawerOpen: signal(true), itemCount: signal(1) });

    render(<CartDrawer />);

    expect(screen.getByText("(1 item)")).toBeInTheDocument();
  });
});
