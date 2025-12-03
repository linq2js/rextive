import { describe, it, expect } from "vitest";
import { signal, is } from "./index";

describe("is", () => {
  it("should identify any signal", () => {
    const mutable = signal(1);
    const computed = signal({ mutable }, ({ deps }) => deps.mutable * 2);
    const notSignal = { value: 1 };

    expect(is(mutable)).toBe(true);
    expect(is(computed)).toBe(true);
    expect(is(notSignal)).toBe(false);
    expect(is(null)).toBe(false);
    expect(is(undefined)).toBe(false);
    expect(is(42)).toBe(false);
  });

  it("should identify mutable signals", () => {
    const mutable = signal(1);
    const computed = signal({ mutable }, ({ deps }) => deps.mutable * 2);

    expect(is(mutable, "mutable")).toBe(true);
    expect(is(computed, "mutable")).toBe(false);

    if (is(mutable, "mutable")) {
      // TypeScript should know mutable has set method
      mutable.set(5);
      expect(mutable()).toBe(5);
    }
  });

  it("should identify computed signals", () => {
    const mutable = signal(1);
    const computed = signal({ mutable }, ({ deps }) => deps.mutable * 2);

    expect(is(computed, "computed")).toBe(true);
    expect(is(mutable, "computed")).toBe(false);

    if (is(computed, "computed")) {
      // TypeScript should know computed has pause/resume methods
      computed.pause();
      expect(computed.paused()).toBe(true);
      computed.resume();
      expect(computed.paused()).toBe(false);
    }
  });

  it("should work with type guards in conditional logic", () => {
    const signals: unknown[] = [
      signal(1),
      signal({ a: signal(1) }, ({ deps }) => deps.a * 2),
      { value: 1 },
      null,
    ];

    const mutableSignals = signals.filter((s) => is(s, "mutable"));
    const computedSignals = signals.filter((s) => is(s, "computed"));
    const anySignals = signals.filter((s) => is(s));

    expect(mutableSignals).toHaveLength(1);
    expect(computedSignals).toHaveLength(1);
    expect(anySignals).toHaveLength(2);
  });

  it("should provide proper type narrowing", () => {
    const mixed: unknown = signal(42);

    if (is(mixed, "mutable")) {
      // TypeScript knows this has set method
      mixed.set(100);
      expect(mixed()).toBe(100);
    }

    const computed = signal({ a: signal(1) }, ({ deps }) => deps.a * 2);

    if (is(computed, "computed")) {
      // TypeScript knows this has pause/resume
      computed.pause();
      expect(computed.paused()).toBe(true);
    }
  });

  it("should identify accessors (function with on method)", () => {
    const mutable = signal(1);
    const computed = signal({ mutable }, ({ deps }) => deps.mutable * 2);

    // Signals are accessors (functions with on method)
    expect(is(mutable, "accessor")).toBe(true);
    expect(is(computed, "accessor")).toBe(true);

    // Regular functions without on method are not accessors
    const regularFn = () => 42;
    expect(is(regularFn, "accessor")).toBe(false);

    // Objects are not accessors
    expect(is({ on: () => {} }, "accessor")).toBe(false);
  });

  it("should identify observables (object with on method)", () => {
    // Object with on method is observable
    const observable = { on: () => {} };
    expect(is(observable, "observable")).toBe(true);

    // Null is not observable
    expect(is(null, "observable")).toBe(false);

    // Object without on method is not observable
    expect(is({ value: 1 }, "observable")).toBe(false);

    // Functions are not observables (even if they have on)
    const fn = Object.assign(() => {}, { on: () => {} });
    expect(is(fn, "observable")).toBe(false);
  });

  it("should identify tags", () => {
    const tag = signal.tag<number>();

    expect(is(tag, "tag")).toBe(true);

    // Regular objects are not tags
    expect(is({}, "tag")).toBe(false);
    expect(is(null, "tag")).toBe(false);

    // Signals are not tags
    const mutable = signal(1);
    expect(is(mutable, "tag")).toBe(false);
  });

  it("should return false for unknown type parameter", () => {
    const mutable = signal(1);
    // Use a type assertion to test the edge case
    expect(is(mutable, "unknown" as any)).toBe(false);
  });
});
