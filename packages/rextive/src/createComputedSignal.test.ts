import { describe, it, expect, vi } from "vitest";
import { signal } from "./signal";
import { tag } from "./tag";

describe("createComputedSignal", () => {
  describe("fallback error handling", () => {
    it("should use fallback when computation throws", () => {
      const source = signal(1);

      const computed = signal(
        { source },
        () => {
          throw new Error("Computation error");
        },
        {
          fallback: () => -1, // Fallback succeeds
        }
      );

      // Should use fallback value
      expect(computed()).toBe(-1);

      // Still uses fallback after dependency change
      source.set(5);
      expect(computed()).toBe(-1);
    });

    it("should handle fallback that also throws", () => {
      const source = signal(1);

      const computed = signal(
        { source },
        () => {
          throw new Error("Computation error");
        },
        {
          name: "test-signal",
          fallback: () => {
            throw new Error("Fallback error");
          },
        }
      );

      // Should throw FallbackError
      expect(() => computed()).toThrow();
    });

    it("should call fallback on error", () => {
      const source = signal(1);
      const fallbackFn = vi.fn(() => -1);

      const computed = signal(
        { source },
        () => {
          throw new Error("Always throws");
        },
        {
          fallback: fallbackFn,
        }
      );

      // First access - should call fallback
      expect(computed()).toBe(-1);
      expect(fallbackFn).toHaveBeenCalled();
    });
  });

  describe("map method", () => {
    it("should map computed signal values", () => {
      const source = signal(5);
      const computed = signal({ source }, ({ deps }) => deps.source * 2);
      const mapped = computed.map((x) => x + 100);

      expect(mapped()).toBe(110); // (5 * 2) + 100

      source.set(10);
      expect(mapped()).toBe(120); // (10 * 2) + 100
    });

    it("should map with custom equals function", () => {
      const source = signal(5);
      const computed = signal({ source }, ({ deps }) => deps.source * 2);

      const listener = vi.fn();
      const mapped = computed.map(
        (x) => ({ value: x }),
        (a, b) => a && b && a.value === b.value // Custom equals with null check
      );
      
      // Get initial value first
      const initial = mapped();
      expect(initial).toEqual({ value: 10 });
      
      // Now subscribe
      mapped.on(listener);

      // Change to same value - should not notify due to custom equals
      source.set(5); // Still results in 10
      expect(listener).toHaveBeenCalledTimes(0);

      // Change to different value
      source.set(10);
      expect(mapped()).toEqual({ value: 20 });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("scan method", () => {
    it("should accumulate values from computed signal", () => {
      const source = signal(1);
      const computed = signal({ source }, ({ deps }) => deps.source);
      const accumulated = computed.scan((acc, curr) => acc + curr, 0);

      expect(accumulated()).toBe(1); // 0 + 1

      source.set(2);
      expect(accumulated()).toBe(3); // 1 + 2

      source.set(3);
      expect(accumulated()).toBe(6); // 3 + 3
    });

    it("should scan with custom equals function", () => {
      const source = signal(1);
      const computed = signal({ source }, ({ deps }) => deps.source);

      const listener = vi.fn();
      const scanned = computed.scan(
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
      expect(listener).toHaveBeenCalledTimes(0); // No change

      source.set(5); // Results in: 1 + 5 = 6
      expect(scanned()).toEqual({ sum: 6 });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("tags integration", () => {
    it("should register computed signal with tags and allow operations", () => {
      const myTag = tag<number>();
      const source = signal(1);

      const computed = signal({ source }, ({ deps }) => deps.source * 2, {
        tags: [myTag],
      });

      expect(computed()).toBe(2);
      expect(myTag.has(computed)).toBe(true);
      expect(myTag.size).toBe(1);

      source.set(5);
      expect(computed()).toBe(10);

      // Reset via tag - recomputes with current dependencies
      myTag.forEach((sig) => sig.reset());
      // Computed signals recompute with current dependency values
      expect(computed()).toBe(10); // Still 5 * 2 = 10
    });

    it("should unregister from tag on dispose", () => {
      const myTag = tag<number>();
      const source = signal(1);

      const computed = signal({ source }, ({ deps }) => deps.source * 2, {
        tags: [myTag],
      });

      expect(myTag.has(computed)).toBe(true);

      // Dispose
      computed.dispose();

      // Should be removed from tag
      expect(myTag.has(computed)).toBe(false);
      expect(myTag.size).toBe(0);
    });

    it("should handle multiple tags", () => {
      const tag1 = tag<number>();
      const tag2 = tag<number>();
      const source = signal(1);

      const computed = signal({ source }, ({ deps }) => deps.source * 2, {
        tags: [tag1, tag2],
      });

      expect(tag1.has(computed)).toBe(true);
      expect(tag2.has(computed)).toBe(true);

      // Dispose via forEach on one tag
      tag1.forEach((sig) => sig.dispose());

      // Should be removed from both tags
      expect(tag1.has(computed)).toBe(false);
      expect(tag2.has(computed)).toBe(false);
    });
  });

  describe("eager computation", () => {
    it("should compute immediately when lazy=false", () => {
      const computeFn = vi.fn(() => 42);
      const source = signal(1);

      const computed = signal({ source }, computeFn, { lazy: false });

      // Should have computed immediately
      expect(computeFn).toHaveBeenCalledTimes(1);
      expect(computed()).toBe(42);
      expect(computeFn).toHaveBeenCalledTimes(1); // Still once
    });

    it("should ignore errors during eager computation", () => {
      const source = signal(1);

      // Should not throw even though computation fails
      expect(() => {
        signal(
          { source },
          () => {
            throw new Error("Eager error");
          },
          { lazy: false }
        );
      }).not.toThrow();
    });

    it("should use fallback for eager error", () => {
      const source = signal(1);

      const computed = signal(
        { source },
        () => {
          throw new Error("Error");
        },
        { lazy: false, fallback: () => -1 }
      );

      // Eager computation failed, used fallback
      expect(computed()).toBe(-1);

      // Even after dependency change, still uses fallback (still throwing)
      source.set(5);
      expect(computed()).toBe(-1);
    });
  });
});

