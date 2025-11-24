import { describe, it, expect, vi } from "vitest";
import { signal } from "./signal";
import { select, scan } from "./operators";

describe("signal.to()", () => {
  it("should chain single transformation", () => {
    const count = signal(5);
    const double = select((x: number) => x * 2);

    const result = count.to(double);

    expect(result()).toBe(10);
  });

  it("should chain multiple transformations", () => {
    const count = signal(5);
    const double = select((x: number) => x * 2);
    const addOne = select((x: number) => x + 1);
    const format = select((x: number) => `Value: ${x}`);

    const result = count.to(double, addOne, format);

    expect(result()).toBe("Value: 11");
  });

  it("should update when source changes", () => {
    const count = signal(5);
    const double = select((x: number) => x * 2);
    const addOne = select((x: number) => x + 1);

    const result = count.to(double, addOne);

    expect(result()).toBe(11);

    count.set(10);
    expect(result()).toBe(21);
  });

  it("should work with scan operator from rextive/op", () => {
    const count = signal(1);
    
    // Use scan operator from rextive/op
    const accumulate = scan((acc: number, curr: number) => acc + curr, 0);

    const result = count.to(accumulate);

    expect(result()).toBe(1);

    count.set(2);
    expect(result()).toBe(3);

    count.set(3);
    expect(result()).toBe(6);
  });

  it("should notify listeners on changes", () => {
    const count = signal(5);
    const double = select((x: number) => x * 2);
    const addOne = select((x: number) => x + 1);

    const result = count.to(double, addOne);
    const listener = vi.fn();
    result.on(listener);

    count.set(10);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(result()).toBe(21);
  });

  it("should work with computed signals", () => {
    const a = signal(2);
    const b = signal(3);
    const sum = signal({ a, b }, ({ deps }) => deps.a + deps.b);

    const double = select((x: number) => x * 2);
    const addTen = select((x: number) => x + 10);

    const result = sum.to(double, addTen);

    expect(result()).toBe(20); // (2 + 3) * 2 + 10 = 20

    a.set(5);
    expect(result()).toBe(26); // (5 + 3) * 2 + 10 = 26
  });

  it("should support complex operator composition", () => {
    const count = signal(1);

    // Reusable operators
    const double = select((x: number) => x * 2);
    const square = select((x: number) => x * x);
    const addFive = select((x: number) => x + 5);

    const result = count.to(double, square, addFive);

    expect(result()).toBe(9); // (1 * 2)^2 + 5 = 9

    count.set(2);
    expect(result()).toBe(21); // (2 * 2)^2 + 5 = 21
  });

  it("should work with custom operators that return different types", () => {
    const count = signal(5);

    const toArray = select((x: number) => [x]);
    const appendValue = select((arr: number[]) => [...arr, arr[0] * 2]);
    const join = select((arr: number[]) => arr.join(","));

    const result = count.to(toArray, appendValue, join);

    expect(result()).toBe("5,10");

    count.set(3);
    expect(result()).toBe("3,6");
  });

  it("should work with no operators (identity)", () => {
    const count = signal(5);
    const result = count.to();

    expect(result).toBe(count);
    expect(result()).toBe(5);
  });

  it("should create independent signal chain", () => {
    const count = signal(5);
    const double = select((x: number) => x * 2);
    const addOne = select((x: number) => x + 1);

    const result1 = count.to(double, addOne);
    const result2 = count.to(double, addOne);

    // Both chains should work independently
    expect(result1()).toBe(11);
    expect(result2()).toBe(11);

    count.set(10);
    expect(result1()).toBe(21);
    expect(result2()).toBe(21);
  });

  it("should automatically dispose all intermediate signals", () => {
    const count = signal(5);

    // Track if intermediates are disposed
    const intermediate1Spy = vi.fn();
    const intermediate2Spy = vi.fn();

    const trackDispose = (s: any, spy: any) => {
      const originalDispose = s.dispose;
      s.dispose = () => {
        spy();
        originalDispose.call(s);
      };
      return s;
    };

    const result = count.to(
      (s) =>
        trackDispose(
          select((x: number) => x * 2)(s),
          intermediate1Spy
        ),
      (s) =>
        trackDispose(
          select((x: number) => x + 1)(s),
          intermediate2Spy
        ),
      (s) => select((x: number) => `Value: ${x}`)(s)
    );

    expect(result()).toBe("Value: 11");

    // Dispose the result
    result.dispose();

    // All intermediates should be disposed
    expect(intermediate1Spy).toHaveBeenCalledTimes(1);
    expect(intermediate2Spy).toHaveBeenCalledTimes(1);
  });

  it("should handle empty pipe (no intermediates to dispose)", () => {
    const count = signal(5);
    const result = count.to();

    expect(result).toBe(count);

    // Should not throw
    expect(() => result.dispose()).not.toThrow();
  });

  it("should handle single operator (no intermediates)", () => {
    const count = signal(5);
    const result = count.to((s) => select((x: number) => x * 2)(s));

    expect(result()).toBe(10);

    // Should not throw when disposing
    expect(() => result.dispose()).not.toThrow();
  });
});
