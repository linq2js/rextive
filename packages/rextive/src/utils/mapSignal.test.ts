import { describe, it, expect, vi } from "vitest";
import { signal } from "../index";
import { mapSignal } from "./mapSignal";

describe("mapSignal", () => {
  it("should transform signal values", () => {
    const count = signal(5);
    const doubled = mapSignal(count, (x) => x * 2);

    expect(doubled()).toBe(10);

    count.set(10);
    expect(doubled()).toBe(20);
  });

  it("should support type transformations", () => {
    const count = signal(42);
    const formatted = mapSignal(count, (x) => `Count: ${x}`);

    expect(formatted()).toBe("Count: 42");

    count.set(100);
    expect(formatted()).toBe("Count: 100");
  });

  it("should work with computed signals", () => {
    const count = signal(5);
    const doubled = signal({ count }, (ctx) => ctx.deps.count * 2);
    const formatted = mapSignal(doubled, (x) => `Result: ${x}`);

    expect(formatted()).toBe("Result: 10");

    count.set(20);
    expect(formatted()).toBe("Result: 40");
  });

  it("should support chaining", () => {
    const count = signal(5);
    const doubled = mapSignal(count, (x) => x * 2);
    const incremented = mapSignal(doubled, (x) => x + 1);
    const formatted = mapSignal(incremented, (x) => `Final: ${x}`);

    expect(formatted()).toBe("Final: 11");

    count.set(10);
    expect(formatted()).toBe("Final: 21");
  });

  it("should use method syntax via .map()", () => {
    const count = signal(5);
    const result = count.map((x) => x * 2).map((x) => x + 1);

    expect(result()).toBe(11);
  });

  it("should notify subscribers on changes", () => {
    const count = signal(5);
    const doubled = mapSignal(count, (x) => x * 2);

    const listener = vi.fn();
    doubled.on(listener);

    expect(listener).not.toHaveBeenCalled();

    count.set(10);
    expect(listener).toHaveBeenCalledTimes(1);

    count.set(20);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("should not notify if value doesn't change (default equals)", () => {
    const count = signal(5);
    const doubled = mapSignal(count, (x) => x * 2);

    const listener = vi.fn();
    doubled.on(listener);

    count.set(5); // Same value
    expect(listener).not.toHaveBeenCalled();
  });

  it("should support custom equals function", () => {
    const count = signal(5);
    const rounded = mapSignal(
      count,
      (x) => Math.round(x / 10) * 10,
      (a, b) => a === b
    );

    const listener = vi.fn();
    rounded.on(listener);

    expect(rounded()).toBe(10);

    count.set(6); // Still rounds to 10
    expect(listener).not.toHaveBeenCalled();
    expect(rounded()).toBe(10);

    count.set(15); // Rounds to 20
    expect(listener).toHaveBeenCalledTimes(1);
    expect(rounded()).toBe(20);
  });

  it("should work with objects", () => {
    const user = signal({ name: "John", age: 30 });
    const name = mapSignal(user, (u) => u.name);

    expect(name()).toBe("John");

    user.set({ name: "Jane", age: 25 });
    expect(name()).toBe("Jane");
  });

  it("should work with arrays", () => {
    const numbers = signal([1, 2, 3]);
    const sum = mapSignal(numbers, (arr) => arr.reduce((a, b) => a + b, 0));

    expect(sum()).toBe(6);

    numbers.set([10, 20, 30]);
    expect(sum()).toBe(60);
  });

  it("should handle undefined values", () => {
    const value = signal<number | undefined>(5);
    const doubled = mapSignal(value, (x) => (x !== undefined ? x * 2 : 0));

    expect(doubled()).toBe(10);

    value.set(undefined);
    expect(doubled()).toBe(0);
  });

  it("should support lazy evaluation", () => {
    const count = signal(5);
    const computeFn = vi.fn((x: number) => x * 2);
    const doubled = mapSignal(count, computeFn);

    expect(computeFn).not.toHaveBeenCalled();

    doubled();
    expect(computeFn).toHaveBeenCalledTimes(1);
  });

  it("should dispose properly", () => {
    const count = signal(5);
    const doubled = mapSignal(count, (x) => x * 2);

    const listener = vi.fn();
    doubled.on(listener);

    doubled.dispose();

    count.set(10);
    expect(listener).not.toHaveBeenCalled();
  });

  it("should work with pause/resume on computed signals", () => {
    const count = signal(5);
    const doubled = mapSignal(count, (x) => x * 2);

    expect(doubled()).toBe(10);

    doubled.pause();
    count.set(10);
    expect(doubled()).toBe(10); // Still old value

    doubled.resume();
    expect(doubled()).toBe(20); // Updated
  });

  it("should handle errors in transform function", () => {
    const count = signal(5);
    const erroring = mapSignal(count, (x) => {
      if (x > 10) throw new Error("Too large");
      return x * 2;
    });

    expect(erroring()).toBe(10);

    count.set(15);
    expect(() => erroring()).toThrow("Too large");
  });

  it("should work with fallback option", () => {
    const count = signal(5);
    const doubled = signal(
      { count },
      (ctx) => {
        const val = ctx.deps.count;
        if (val > 10) throw new Error("Too large");
        return val * 2;
      },
      { fallback: () => -1 }
    );
    const formatted = mapSignal(doubled, (x) => `Result: ${x}`);

    expect(formatted()).toBe("Result: 10");

    count.set(15);
    expect(formatted()).toBe("Result: -1");
  });
});

