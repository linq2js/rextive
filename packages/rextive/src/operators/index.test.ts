import { describe, it, expect, vi } from "vitest";
import { signal } from "../signal";
import { select, scan, filter } from "./index";

describe("operators", () => {
  describe("select", () => {
    it("should transform signal values", () => {
      const count = signal(5);
      const doubled = select((x: number) => x * 2)(count);

      expect(doubled()).toBe(10);

      count.set(10);
      expect(doubled()).toBe(20);
    });

    it("should work with .pipe() method", () => {
      const count = signal(5);
      const doubled = count.pipe(select((x) => x * 2));

      expect(doubled()).toBe(10);
    });

    it("should support equality shortcuts", () => {
      const user = signal({ name: "Alice", age: 30 });
      const name = user.pipe(select((u) => u.name, "shallow"));

      expect(name()).toBe("Alice");

      user.set({ name: "Alice", age: 31 });
      // Should not trigger update due to shallow equality
      expect(name()).toBe("Alice");
    });

    it("should support options object", () => {
      const count = signal(5);
      const doubled = count.pipe(
        select((x) => x * 2, { equals: "strict", name: "doubled" })
      );

      expect(doubled()).toBe(10);
      expect(doubled.displayName).toBe("doubled");
    });

    it("should notify listeners on changes", () => {
      const count = signal(5);
      const doubled = count.pipe(select((x) => x * 2));
      const listener = vi.fn();

      doubled.on(listener);
      count.set(10);

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("scan", () => {
    it("should accumulate values", () => {
      const count = signal(1);
      const sum = count.pipe(scan((acc, curr) => acc + curr, 0));

      expect(sum()).toBe(1);

      count.set(2);
      expect(sum()).toBe(3);

      count.set(3);
      expect(sum()).toBe(6);
    });

    it("should maintain state across updates", () => {
      const count = signal(1);
      const history = count.pipe(
        scan((acc, curr) => [...acc, curr], [] as number[])
      );

      expect(history()).toEqual([1]);

      count.set(2);
      expect(history()).toEqual([1, 2]);

      count.set(3);
      expect(history()).toEqual([1, 2, 3]);
    });

    it("should support equality shortcuts", () => {
      const count = signal(1);
      const stats = count.pipe(
        scan(
          (acc, curr) => ({ sum: acc.sum + curr, count: acc.count + 1 }),
          { sum: 0, count: 0 },
          "shallow"
        )
      );

      expect(stats()).toEqual({ sum: 1, count: 1 });

      count.set(2);
      expect(stats()).toEqual({ sum: 3, count: 2 });
    });

    it("should work with different types", () => {
      const count = signal(1);
      const formatted = count.pipe(
        scan((acc, curr) => `${acc},${curr}`, "0")
      );

      expect(formatted()).toBe("0,1");

      count.set(2);
      expect(formatted()).toBe("0,1,2");
    });
  });

  describe("filter", () => {
    it("should filter values based on predicate", () => {
      const count = signal(1);
      const evenOnly = count.pipe(filter((x) => x % 2 === 0));

      expect(evenOnly()).toBe(1); // First value always emitted

      count.set(2);
      expect(evenOnly()).toBe(2); // Passes filter

      count.set(3);
      expect(evenOnly()).toBe(2); // Filtered out, keeps previous

      count.set(4);
      expect(evenOnly()).toBe(4); // Passes filter
    });

    it("should support type narrowing", () => {
      const value = signal<string | number>(1);
      const numbersOnly = value.pipe(
        filter((x): x is number => typeof x === "number")
      );

      expect(numbersOnly()).toBe(1);

      value.set("hello");
      expect(numbersOnly()).toBe(1); // Filtered out

      value.set(42);
      expect(numbersOnly()).toBe(42);
    });

    it("should work with .pipe() chaining", () => {
      const count = signal(1);
      const result = count.pipe(
        filter((x) => x > 0),
        select((x) => x * 2)
      );

      expect(result()).toBe(2);

      count.set(-1);
      expect(result()).toBe(2); // Filtered, keeps previous

      count.set(5);
      expect(result()).toBe(10);
    });

    it("should support equality shortcuts", () => {
      const count = signal(1);
      const filtered = count.pipe(filter((x) => x > 0, "strict"));

      expect(filtered()).toBe(1);
    });

    it("should notify listeners only when value passes filter", () => {
      const count = signal(1);
      const evenOnly = count.pipe(filter((x) => x % 2 === 0));
      const listener = vi.fn();

      evenOnly.on(listener);

      count.set(2); // Passes
      expect(listener).toHaveBeenCalledTimes(1);

      count.set(3); // Filtered
      expect(listener).toHaveBeenCalledTimes(1); // No additional call

      count.set(4); // Passes
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("should handle complex objects", () => {
      const user = signal({ name: "Alice", age: 25 });
      const adults = user.pipe(filter((u) => u.age >= 18));

      expect(adults()).toEqual({ name: "Alice", age: 25 });

      user.set({ name: "Bob", age: 15 });
      expect(adults()).toEqual({ name: "Alice", age: 25 }); // Filtered

      user.set({ name: "Charlie", age: 30 });
      expect(adults()).toEqual({ name: "Charlie", age: 30 });
    });
  });

  describe("operator composition", () => {
    it("should compose multiple operators", () => {
      const count = signal(1);
      const result = count.pipe(
        filter((x) => x > 0),
        select((x) => x * 2),
        scan((acc, curr) => acc + curr, 0)
      );

      expect(result()).toBe(2); // 1 * 2 = 2, 0 + 2 = 2

      count.set(2);
      expect(result()).toBe(6); // 2 * 2 = 4, 2 + 4 = 6

      count.set(-1);
      expect(result()).toBe(6); // Filtered, no change
    });

    it("should create reusable operators", () => {
      const double = select((x: number) => x * 2);
      const addOne = select((x: number) => x + 1);
      const positiveOnly = filter((x: number) => x > 0);

      const count1 = signal(5);
      const count2 = signal(10);

      const result1 = count1.pipe(positiveOnly, double, addOne);
      const result2 = count2.pipe(positiveOnly, double, addOne);

      expect(result1()).toBe(11); // 5 * 2 + 1
      expect(result2()).toBe(21); // 10 * 2 + 1
    });
  });
});

