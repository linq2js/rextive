import { describe, it, expect, beforeEach, vi } from "vitest";
import { logic } from "rextive";
import { checkoutLogic } from "./checkoutLogic";

// Mock child logics
const mockShipping = {
  prefillFromUser: vi.fn(),
  isValid: vi.fn(() => true),
  reset: vi.fn(),
};

const mockPayment = {
  reset: vi.fn(),
};

const mockOrder = {
  placeOrder: vi.fn(),
  reset: vi.fn(),
};

vi.mock("./shippingLogic", () => ({
  shippingLogic: vi.fn(() => mockShipping),
}));

vi.mock("./paymentLogic", () => ({
  paymentLogic: vi.fn(() => mockPayment),
}));

vi.mock("./orderLogic", () => ({
  orderLogic: vi.fn(() => mockOrder),
}));

describe("checkoutLogic", () => {
  beforeEach(() => {
    logic.clear();
    vi.clearAllMocks();
  });

  it("should initialize with closed state and shipping step", () => {
    const checkout = checkoutLogic.create();

    expect(checkout.isOpen()).toBe(false);
    expect(checkout.currentStep()).toBe("shipping");
  });

  it("should open checkout and prefill shipping", () => {
    const checkout = checkoutLogic.create();

    checkout.open();

    expect(checkout.isOpen()).toBe(true);
    expect(checkout.currentStep()).toBe("shipping");
    expect(mockShipping.prefillFromUser).toHaveBeenCalled();
    expect(mockOrder.reset).toHaveBeenCalled();
  });

  it("should close checkout", () => {
    const checkout = checkoutLogic.create();
    checkout.open();

    checkout.close();

    expect(checkout.isOpen()).toBe(false);
  });

  it("should navigate to specific step", () => {
    const checkout = checkoutLogic.create();

    checkout.goToStep("payment");
    expect(checkout.currentStep()).toBe("payment");

    checkout.goToStep("review");
    expect(checkout.currentStep()).toBe("review");
  });

  it("should move to next step when shipping is valid", () => {
    mockShipping.isValid.mockReturnValue(true);
    const checkout = checkoutLogic.create();

    checkout.nextStep();

    expect(checkout.currentStep()).toBe("payment");
  });

  it("should not move to payment when shipping is invalid", () => {
    mockShipping.isValid.mockReturnValue(false);
    const checkout = checkoutLogic.create();

    checkout.nextStep();

    expect(checkout.currentStep()).toBe("shipping");
  });

  it("should move from payment to review", () => {
    const checkout = checkoutLogic.create();
    checkout.goToStep("payment");

    checkout.nextStep();

    expect(checkout.currentStep()).toBe("review");
  });

  it("should move to previous step", () => {
    const checkout = checkoutLogic.create();
    checkout.goToStep("review");

    checkout.prevStep();
    expect(checkout.currentStep()).toBe("payment");

    checkout.prevStep();
    expect(checkout.currentStep()).toBe("shipping");
  });

  it("should place order and navigate to complete", () => {
    const checkout = checkoutLogic.create();
    checkout.goToStep("review");

    checkout.placeOrder();

    expect(mockOrder.placeOrder).toHaveBeenCalled();
    expect(checkout.currentStep()).toBe("complete");
  });

  it("should reset all state", () => {
    const checkout = checkoutLogic.create();
    checkout.goToStep("review");

    checkout.reset();

    expect(checkout.currentStep()).toBe("shipping");
    expect(mockShipping.reset).toHaveBeenCalled();
    expect(mockPayment.reset).toHaveBeenCalled();
    expect(mockOrder.reset).toHaveBeenCalled();
  });
});

