import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { logic, signal } from "../index";
import { mockLogic } from "./index";

// Test logic
const counterLogic = logic("counterLogic", () => {
  const count = signal(0);
  const increment = () => count.set((c) => c + 1);
  const decrement = () => count.set((c) => c - 1);
  return { count, increment, decrement };
});

describe("mockLogic", () => {
  const $counter = mockLogic(counterLogic);

  afterEach(() => {
    $counter.clear();
  });

  it("should throw error for missing overrides", () => {
    $counter.provide({});

    const instance = counterLogic();

    expect(() => instance.count).toThrow(
      '[logic.mock] No override for "count" in counterLogic'
    );
  });

  it("should return overridden values", () => {
    const mockCount = signal(42);
    $counter.provide({ count: mockCount });

    const instance = counterLogic();

    expect(instance.count()).toBe(42);
  });

  it("should merge defaults with provide", () => {
    const mockCount = signal(0);
    const mockIncrement = vi.fn();

    $counter.default({
      count: mockCount,
      increment: mockIncrement,
      decrement: vi.fn(),
    });

    // Override only what we need
    const overriddenCount = signal(10);
    $counter.provide({ count: overriddenCount });

    const instance = counterLogic();

    expect(instance.count()).toBe(10); // Overridden
    expect(instance.increment).toBe(mockIncrement); // From default
  });

  it("should provide default dispose method", () => {
    $counter.provide({});

    const instance = counterLogic();

    expect(instance.dispose).toBeDefined();
    expect(() => instance.dispose()).not.toThrow();
  });

  it("should clear defaults and overrides", () => {
    $counter.default({ count: signal(1) });
    $counter.provide({ count: signal(2) });

    $counter.clear();

    // After clear, should throw for missing overrides
    $counter.provide({});
    const instance = counterLogic();
    expect(() => instance.count).toThrow();
  });

  it("should return partial from provide for assertions", () => {
    const mockIncrement = vi.fn();
    const partial = $counter.provide({
      count: signal(0),
      increment: mockIncrement,
      decrement: vi.fn(),
    });

    const instance = counterLogic();
    instance.increment();

    expect(partial.increment).toBe(mockIncrement);
    expect(mockIncrement).toHaveBeenCalled();
  });

  it("should support chaining default calls", () => {
    $counter
      .default({ count: signal(0) })
      .default({ increment: vi.fn() })
      .default({ decrement: vi.fn() });

    $counter.provide({});

    const instance = counterLogic();

    expect(instance.count()).toBe(0);
    expect(instance.increment).toBeDefined();
    expect(instance.decrement).toBeDefined();
  });

  it("should prevent direct property modification", () => {
    $counter.provide({ count: signal(0) });

    const instance = counterLogic();

    expect(() => {
      (instance as any).count = signal(1);
    }).toThrow("[logic.mock] Cannot set properties on mock");
  });
});

