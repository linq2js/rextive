import { describe, it, expect, vi } from "vitest";
import { signal } from "../signal";
import { take, takeWhile, takeLast, takeUntil } from "./take";

describe("take operators", () => {
  describe("take", () => {
    it("should use custom name when provided", () => {
      const source = signal(0);
      const taken = take<number>(3, { name: "customTake" })(source);

      expect(taken.displayName).toMatch(/^#customTake-\d+$/);
    });

    it("should take only first N emissions", () => {
      const source = signal(0);
      const taken = take(3)(source);

      expect(taken()).toBe(0); // Initial doesn't count

      source.set(1);
      expect(taken()).toBe(1);

      source.set(2);
      expect(taken()).toBe(2);

      source.set(3);
      expect(taken()).toBe(3);

      // After 3 emissions, should stop updating
      source.set(4);
      expect(taken()).toBe(3);

      source.set(5);
      expect(taken()).toBe(3);
    });

    it("should work with take(0)", () => {
      const source = signal(10);
      const taken = take(0)(source);

      expect(taken()).toBe(10); // Initial value

      source.set(20);
      expect(taken()).toBe(10); // No emissions taken
    });

    it("should work with take(1)", () => {
      const source = signal("a");
      const taken = take(1)(source);

      source.set("b");
      expect(taken()).toBe("b");

      source.set("c");
      expect(taken()).toBe("b"); // Only first emission
    });

    it("should work with pipe", () => {
      const source = signal(0);
      const taken = source.pipe(take(2));

      source.set(1);
      source.set(2);
      source.set(3);

      expect(taken()).toBe(2);
    });
  });

  describe("takeWhile", () => {
    it("should use custom name when provided", () => {
      const source = signal(0);
      const taken = takeWhile<number>((x) => x < 5, { name: "customTakeWhile" })(
        source
      );

      expect(taken.displayName).toMatch(/^#customTakeWhile-\d+$/);
    });

    it("should take while predicate returns true", () => {
      const source = signal(0);
      const taken = takeWhile<number>((x) => x < 5)(source);

      source.set(1);
      expect(taken()).toBe(1);

      source.set(3);
      expect(taken()).toBe(3);

      source.set(5); // Predicate fails
      expect(taken()).toBe(3);

      source.set(2); // Even though predicate would pass, already stopped
      expect(taken()).toBe(3);
    });

    it("should pass index to predicate", () => {
      const source = signal("a");
      const indices: number[] = [];
      const taken = takeWhile<string>((_, index) => {
        indices.push(index);
        return index < 2;
      })(source);

      source.set("b"); // index 0
      source.set("c"); // index 1
      source.set("d"); // index 2 - fails

      expect(indices).toEqual([0, 1, 2]);
      expect(taken()).toBe("c");
    });

    it("should include failing value when inclusive is true", () => {
      const source = signal(0);
      const taken = takeWhile<number>((x) => x < 5, { inclusive: true })(source);

      source.set(3);
      expect(taken()).toBe(3);

      source.set(5); // Predicate fails but inclusive
      expect(taken()).toBe(5);

      source.set(6); // Already stopped
      expect(taken()).toBe(5);
    });

    it("should work with pipe", () => {
      const source = signal(0);
      const taken = source.pipe(takeWhile((x) => x < 10));

      source.set(5);
      source.set(15);
      source.set(3);

      expect(taken()).toBe(5);
    });
  });

  describe("takeLast", () => {
    it("should use custom name when provided", () => {
      const source = signal(0);
      const taken = takeLast<number>(3, { name: "customTakeLast" })(source);

      expect(taken.displayName).toMatch(/^#customTakeLast-\d+$/);
    });

    it("should keep only the last N values", () => {
      const source = signal(0);
      const last = takeLast<number>(3)(source);

      expect(last()).toEqual([0]); // Initial

      source.set(1);
      expect(last()).toEqual([0, 1]);

      source.set(2);
      expect(last()).toEqual([0, 1, 2]);

      source.set(3);
      expect(last()).toEqual([1, 2, 3]); // Oldest dropped

      source.set(4);
      expect(last()).toEqual([2, 3, 4]);
    });

    it("should work with takeLast(1)", () => {
      const source = signal("a");
      const last = takeLast<string>(1)(source);

      expect(last()).toEqual(["a"]);

      source.set("b");
      expect(last()).toEqual(["b"]);

      source.set("c");
      expect(last()).toEqual(["c"]);
    });

    it("should work with pipe", () => {
      const source = signal(0);
      const last = source.pipe(takeLast(2));

      source.set(1);
      source.set(2);
      source.set(3);

      expect(last()).toEqual([2, 3]);
    });
  });

  describe("takeUntil", () => {
    it("should use custom name when provided", () => {
      const source = signal(0);
      const notifier = signal(false);
      const taken = takeUntil<number>(notifier, { name: "customTakeUntil" })(
        source
      );

      expect(taken.displayName).toMatch(/^#customTakeUntil-\d+$/);
    });

    it("should take until notifier signal changes", () => {
      const source = signal(0);
      const notifier = signal(false);
      const taken = takeUntil(notifier)(source);

      source.set(1);
      expect(taken()).toBe(1);

      source.set(2);
      expect(taken()).toBe(2);

      notifier.set(true); // Trigger stop

      source.set(3);
      expect(taken()).toBe(2); // Stopped
    });

    it("should work with array of notifiers", () => {
      const source = signal(0);
      const notifier1 = signal(false);
      const notifier2 = signal(false);
      const taken = takeUntil([notifier1, notifier2])(source);

      source.set(1);
      expect(taken()).toBe(1);

      notifier2.set(true); // Second notifier triggers

      source.set(2);
      expect(taken()).toBe(1); // Stopped
    });

    it("should stop immediately if notifier changes before first emission", () => {
      const source = signal(0);
      const notifier = signal(false);
      const taken = takeUntil(notifier)(source);

      notifier.set(true);

      source.set(1);
      expect(taken()).toBe(0); // Initial value, no updates
    });

    it("should work with pipe", () => {
      const source = signal(0);
      const stop = signal(false);
      const taken = source.pipe(takeUntil(stop));

      source.set(1);
      stop.set(true);
      source.set(2);

      expect(taken()).toBe(1);
    });

    it("should clean up notifier subscriptions on dispose", () => {
      const source = signal(0);
      const notifier = signal(false);
      const taken = takeUntil(notifier)(source);

      const listener = vi.fn();
      taken.on(listener);

      taken.dispose();

      // Should not throw when notifier changes
      notifier.set(true);
    });
  });
});

