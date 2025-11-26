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

  // .map() method removed - use select operator from rextive/op instead
  // .scan() method removed - use scan operator from rextive/op instead

  describe("tags integration", () => {
    it("should register computed signal with tags and allow operations", () => {
      const myTag = tag<number>();
      const source = signal(1);

      const computed = signal({ source }, ({ deps }) => deps.source * 2, {
        use: [myTag],
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
        use: [myTag],
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
        use: [tag1, tag2],
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
