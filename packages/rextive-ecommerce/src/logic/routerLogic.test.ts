import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { logic } from "rextive";
import { routerLogic } from "./routerLogic";

describe("routerLogic", () => {
  const originalLocation = window.location;
  const originalHistory = window.history;

  beforeEach(() => {
    logic.clear();
    // Mock window.location.hash
    Object.defineProperty(window, "location", {
      value: { hash: "" },
      writable: true,
    });
    // Mock window.history
    Object.defineProperty(window, "history", {
      value: { length: 1, back: vi.fn() },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
    Object.defineProperty(window, "history", {
      value: originalHistory,
      writable: true,
    });
  });

  it("should initialize with home route for empty hash", () => {
    window.location.hash = "";
    const router = routerLogic.create();

    expect(router.route()).toEqual({ page: "home" });
  });

  it("should initialize with home route for #/", () => {
    window.location.hash = "#/";
    const router = routerLogic.create();

    expect(router.route()).toEqual({ page: "home" });
  });

  it("should parse product route", () => {
    window.location.hash = "#/product/123";
    const router = routerLogic.create();

    expect(router.route()).toEqual({ page: "product", id: 123 });
  });

  it("should navigate to home", () => {
    const router = routerLogic.create();

    router.goHome();

    expect(window.location.hash).toBe("#/");
  });

  it("should navigate to product page", () => {
    const router = routerLogic.create();

    router.goToProduct(42);

    expect(window.location.hash).toBe("#/product/42");
  });

  it("should navigate with custom route", () => {
    const router = routerLogic.create();

    router.navigate({ page: "product", id: 99 });

    expect(window.location.hash).toBe("#/product/99");
  });

  it("should go back in history when available", () => {
    Object.defineProperty(window, "history", {
      value: { length: 3, back: vi.fn() },
      writable: true,
    });
    const router = routerLogic.create();

    router.goBack();

    expect(window.history.back).toHaveBeenCalled();
  });

  it("should go home when no history", () => {
    Object.defineProperty(window, "history", {
      value: { length: 1, back: vi.fn() },
      writable: true,
    });
    const router = routerLogic.create();

    router.goBack();

    expect(window.location.hash).toBe("#/");
    expect(window.history.back).not.toHaveBeenCalled();
  });

  it("should handle hash change events", () => {
    window.location.hash = "";
    const router = routerLogic.create();

    expect(router.route()).toEqual({ page: "home" });

    // Simulate hash change
    window.location.hash = "#/product/55";
    window.dispatchEvent(new HashChangeEvent("hashchange"));

    expect(router.route()).toEqual({ page: "product", id: 55 });
  });

  it("should cleanup event listener on dispose", () => {
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const router = routerLogic.create();

    router.dispose();

    expect(removeEventListener).toHaveBeenCalledWith(
      "hashchange",
      expect.any(Function)
    );
  });
});

