import { describe, it, expect, beforeEach } from "vitest";
import { logic } from "rextive";
import { paymentLogic } from "./paymentLogic";

describe("paymentLogic", () => {
  beforeEach(() => {
    logic.clear();
  });

  it("should initialize with card as default payment method", () => {
    const payment = paymentLogic.create();

    expect(payment.method()).toBe("card");
  });

  it("should set payment method to paypal", () => {
    const payment = paymentLogic.create();

    payment.setMethod("paypal");

    expect(payment.method()).toBe("paypal");
  });

  it("should set payment method to cod", () => {
    const payment = paymentLogic.create();

    payment.setMethod("cod");

    expect(payment.method()).toBe("cod");
  });

  it("should reset to default card method", () => {
    const payment = paymentLogic.create();
    payment.setMethod("paypal");

    payment.reset();

    expect(payment.method()).toBe("card");
  });
});

