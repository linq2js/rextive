import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/utils";
import { signal } from "rextive";
import { mockLogic } from "rextive/test";
import { CartDrawer } from "./CartDrawer";
import { cartLogic } from "@/logic/cartLogic";

describe("CartDrawer", () => {
  const $cart = mockLogic(cartLogic);

  afterEach(() => {
    $cart.clear();
  });

  beforeEach(() => {
    $cart.default({
      drawerOpen: signal(false),
      closeDrawer: vi.fn(),
      items: signal([]),
      itemCount: signal(0),
      subtotal: signal(0),
      totalDiscount: signal(0),
      clearCart: vi.fn(),
    });
  });

  it("should be hidden when drawer is closed", () => {
    $cart.provide({ drawerOpen: signal(false) });

    render(<CartDrawer />);

    const aside = screen.getByRole("complementary", { name: /shopping cart/i });
    expect(aside.className).toContain("translate-x-full");
  });

  it("should be visible when drawer is open", () => {
    $cart.provide({ drawerOpen: signal(true) });

    render(<CartDrawer />);

    const aside = screen.getByRole("complementary", { name: /shopping cart/i });
    expect(aside.className).toContain("translate-x-0");
  });

  it("should show Your Cart title", () => {
    $cart.provide({ drawerOpen: signal(true) });

    render(<CartDrawer />);

    expect(screen.getByText("Your Cart")).toBeInTheDocument();
  });

  it("should call closeDrawer when backdrop is clicked", () => {
    const mock = $cart.provide({
      drawerOpen: signal(true),
      closeDrawer: vi.fn(),
    });

    render(<CartDrawer />);

    const backdrop = document.querySelector('[aria-hidden="true"]');
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    expect(mock.closeDrawer).toHaveBeenCalled();
  });

  it("should show empty cart message when cart is empty", () => {
    $cart.provide({ drawerOpen: signal(true), items: signal([]) });

    render(<CartDrawer />);

    expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
  });

  it("should show item count in header", () => {
    $cart.provide({ drawerOpen: signal(true), itemCount: signal(3) });

    render(<CartDrawer />);

    expect(screen.getByText("(3 items)")).toBeInTheDocument();
  });

  it("should show singular item text for 1 item", () => {
    $cart.provide({ drawerOpen: signal(true), itemCount: signal(1) });

    render(<CartDrawer />);

    expect(screen.getByText("(1 item)")).toBeInTheDocument();
  });
});
