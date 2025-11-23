import { describe, it, expect, vi } from "vitest";
import { signal } from "./signal";
import { tag } from "./tag";

describe("createMutableSignal", () => {
  describe("fallback error handling", () => {
    it("should use fallback when lazy initialization throws", () => {
      const sig = signal(
        () => {
          throw new Error("Error");
        },
        {
          fallback: () => 42,
        }
      );

      // Should use fallback value
      expect(sig()).toBe(42);
    });
  });

  describe("tags integration", () => {
    it("should register mutable signal with tags", () => {
      const myTag = tag<number>();

      const sig = signal(1, {
        tags: [myTag],
      });

      // Should be tracked by tag
      expect(myTag.has(sig)).toBe(true);
      expect(myTag.size).toBe(1);
    });

    it("should unregister from tags on dispose", () => {
      const myTag = tag<number>();

      const sig = signal(1, {
        tags: [myTag],
      });

      expect(myTag.has(sig)).toBe(true);

      // Dispose
      sig.dispose();

      expect(myTag.has(sig)).toBe(false);
      expect(myTag.size).toBe(0);
    });

    it("should handle multiple tags", () => {
      const tag1 = tag<number>();
      const tag2 = tag<number>();

      const sig = signal(1, {
        tags: [tag1, tag2],
      });

      expect(tag1.has(sig)).toBe(true);
      expect(tag2.has(sig)).toBe(true);

      sig.dispose();

      expect(tag1.has(sig)).toBe(false);
      expect(tag2.has(sig)).toBe(false);
    });
  });

  describe("map method", () => {
    it("should map mutable signal values", () => {
      const source = signal(5);
      const mapped = source.map((x) => x * 2);

      expect(mapped()).toBe(10);

      source.set(10);
      expect(mapped()).toBe(20);
    });

    it("should map with custom equals function", () => {
      const source = signal(5);

      const listener = vi.fn();
      const mapped = source.map(
        (x) => ({ value: x }),
        (a, b) => a && b && a.value === b.value // Custom equals with null check
      );
      
      // Get initial value first
      const initial = mapped();
      expect(initial).toEqual({ value: 5 });
      
      // Now subscribe
      mapped.on(listener);

      // Set to same value - should not notify due to custom equals
      source.set(5);
      expect(listener).toHaveBeenCalledTimes(0);

      // Set to different value
      source.set(10);
      expect(mapped()).toEqual({ value: 10 });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("scan method", () => {
    it("should accumulate values from mutable signal", () => {
      const source = signal(1);
      const accumulated = source.scan((acc, curr) => acc + curr, 0);

      expect(accumulated()).toBe(1); // 0 + 1

      source.set(2);
      expect(accumulated()).toBe(3); // 1 + 2

      source.set(3);
      expect(accumulated()).toBe(6); // 3 + 3
    });

    it("should scan with custom equals function", () => {
      const source = signal(1);

      const listener = vi.fn();
      const scanned = source.scan(
        (acc, curr) => ({ sum: acc.sum + curr }),
        { sum: 0 },
        (a, b) => a && b && a.sum === b.sum
      );
      
      // Get initial value first
      expect(scanned()).toEqual({ sum: 1 });
      
      // Now subscribe
      scanned.on(listener);

      source.set(0); // Results in same sum: 1 + 0 = 1
      expect(scanned()).toEqual({ sum: 1 });
      expect(listener).toHaveBeenCalledTimes(0);

      source.set(5); // Results in: 1 + 5 = 6
      expect(scanned()).toEqual({ sum: 6 });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("eager initialization", () => {
    it("should compute immediately when lazy=false", () => {
      const computeFn = vi.fn(() => 42);

      const sig = signal(computeFn, { lazy: false });

      // Should have computed immediately
      expect(computeFn).toHaveBeenCalledTimes(1);
      expect(sig()).toBe(42);
      expect(computeFn).toHaveBeenCalledTimes(1); // Still once
    });

    it("should not compute when lazy=true (default)", () => {
      const computeFn = vi.fn(() => 42);

      const sig = signal(computeFn);

      // Should not have computed yet
      expect(computeFn).toHaveBeenCalledTimes(0);

      // Access triggers computation
      expect(sig()).toBe(42);
      expect(computeFn).toHaveBeenCalledTimes(1);
    });
  });
});

