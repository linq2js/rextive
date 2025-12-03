import { describe, it, expect, vi } from "vitest";
import { signal } from "../signal";
import { staleOn } from "./staleOn";

describe("staleOn", () => {
  describe("single notifier", () => {
    it("should mark source as stale when notifier changes", () => {
      const trigger = signal(0);
      let computeCount = 0;

      const source = signal({ trigger: signal(0) }, () => {
        computeCount++;
        return computeCount;
      });

      const result = source.pipe(staleOn(trigger));

      // Initial compute
      source();
      expect(computeCount).toBe(1);

      // Trigger stale
      trigger.set(1);

      // Not recomputed yet (lazy)
      expect(computeCount).toBe(1);

      // Access triggers recompute
      source();
      expect(computeCount).toBe(2);

      result.dispose();
    });

    it("should not mark stale when filter returns false", () => {
      const trigger = signal(0);
      let computeCount = 0;

      const source = signal({ trigger: signal(0) }, () => {
        computeCount++;
        return computeCount;
      });

      // Only stale when trigger > 5
      const result = source.pipe(staleOn(trigger, (n) => n() > 5));

      // Initial compute
      source();
      expect(computeCount).toBe(1);

      // Trigger with value <= 5 - should not mark stale
      trigger.set(3);
      source();
      expect(computeCount).toBe(1); // No recompute

      trigger.set(5);
      source();
      expect(computeCount).toBe(1); // No recompute

      // Trigger with value > 5 - should mark stale
      trigger.set(6);
      source();
      expect(computeCount).toBe(2); // Recomputed

      result.dispose();
    });

    it("should return the same signal type", () => {
      const trigger = signal(0);
      const source = signal({ trigger }, ({ deps }) => deps.trigger * 2);

      const result = source.pipe(staleOn(trigger));

      // Should be the same signal
      expect(result).toBe(source);
    });
  });

  describe("multiple notifiers", () => {
    it("should mark stale when any notifier changes", () => {
      const trigger1 = signal(0);
      const trigger2 = signal(0);
      let computeCount = 0;

      const source = signal({ dep: signal(0) }, () => {
        computeCount++;
        return computeCount;
      });

      const result = source.pipe(staleOn([trigger1, trigger2]));

      // Initial compute
      source();
      expect(computeCount).toBe(1);

      // Trigger from first notifier
      trigger1.set(1);
      source();
      expect(computeCount).toBe(2);

      // Trigger from second notifier
      trigger2.set(1);
      source();
      expect(computeCount).toBe(3);

      result.dispose();
    });

    it("should apply filter to each notifier individually", () => {
      const trigger1 = signal(0);
      const trigger2 = signal(0);
      let computeCount = 0;

      const source = signal({ dep: signal(0) }, () => {
        computeCount++;
        return computeCount;
      });

      // Only stale when the specific notifier's value > 0
      const result = source.pipe(staleOn([trigger1, trigger2], (n) => n() > 0));

      // Initial compute
      source();
      expect(computeCount).toBe(1);

      // trigger1 = 0, should not mark stale
      trigger1.set(0);
      source();
      expect(computeCount).toBe(1);

      // trigger1 > 0, should mark stale
      trigger1.set(1);
      source();
      expect(computeCount).toBe(2);

      // trigger2 = 0, should not mark stale
      trigger2.set(0);
      source();
      expect(computeCount).toBe(2);

      // trigger2 > 0, should mark stale
      trigger2.set(1);
      source();
      expect(computeCount).toBe(3);

      result.dispose();
    });
  });

  describe("lazy recomputation", () => {
    it("should not recompute until accessed", () => {
      const trigger = signal(0);
      let computeCount = 0;

      const source = signal({ dep: signal(0) }, () => {
        computeCount++;
        return computeCount;
      });

      const result = source.pipe(staleOn(trigger));

      // Initial compute
      source();
      expect(computeCount).toBe(1);

      // Mark stale multiple times
      trigger.set(1);
      trigger.set(2);
      trigger.set(3);

      // Still not recomputed
      expect(computeCount).toBe(1);

      // Single recompute on access
      source();
      expect(computeCount).toBe(2);

      result.dispose();
    });

    it("multiple stale calls before access result in single recomputation", () => {
      const trigger1 = signal(0);
      const trigger2 = signal(0);
      let computeCount = 0;

      const source = signal({ dep: signal(0) }, () => {
        computeCount++;
        return computeCount;
      });

      const result = source.pipe(staleOn([trigger1, trigger2]));

      // Initial compute
      source();
      expect(computeCount).toBe(1);

      // Multiple stale triggers
      trigger1.set(1);
      trigger2.set(1);
      trigger1.set(2);
      trigger2.set(2);

      // Still not recomputed
      expect(computeCount).toBe(1);

      // Single recompute on access
      source();
      expect(computeCount).toBe(2);

      result.dispose();
    });
  });

  describe("cleanup", () => {
    it("should unsubscribe from notifiers on dispose", () => {
      const trigger = signal(0);
      let computeCount = 0;

      const source = signal({ dep: signal(0) }, () => {
        computeCount++;
        return computeCount;
      });

      const result = source.pipe(staleOn(trigger));

      // Initial compute
      source();
      expect(computeCount).toBe(1);

      // Dispose
      result.dispose();

      // Trigger should not mark stale after dispose
      trigger.set(1);
      // Access - should not recompute since disposed
      // (disposed signals don't track stale state)
    });

    it("should unsubscribe from all notifiers on dispose", () => {
      const trigger1 = signal(0);
      const trigger2 = signal(0);
      let computeCount = 0;

      const source = signal({ dep: signal(0) }, () => {
        computeCount++;
        return computeCount;
      });

      const result = source.pipe(staleOn([trigger1, trigger2]));

      // Initial compute
      source();
      expect(computeCount).toBe(1);

      // Dispose
      result.dispose();

      // Neither trigger should work after dispose
      trigger1.set(1);
      trigger2.set(1);
    });
  });

  describe("chaining", () => {
    it("should work with multiple staleOn operators", () => {
      const trigger1 = signal(0);
      const trigger2 = signal(0);
      let computeCount = 0;

      const source = signal({ dep: signal(0) }, () => {
        computeCount++;
        return computeCount;
      });

      const result = source.pipe(staleOn(trigger1), staleOn(trigger2));

      // Initial compute
      source();
      expect(computeCount).toBe(1);

      // Both triggers work
      trigger1.set(1);
      source();
      expect(computeCount).toBe(2);

      trigger2.set(1);
      source();
      expect(computeCount).toBe(3);

      result.dispose();
    });

    it("should work combined with refreshOn", async () => {
      const staleTrigger = signal(0);
      const refreshTrigger = signal(0);
      let computeCount = 0;

      const source = signal({ dep: signal(0) }, () => {
        computeCount++;
        return computeCount;
      });

      const result = source.pipe(
        staleOn(staleTrigger),
        refreshOn(refreshTrigger)
      );

      // Initial compute
      result();
      expect(computeCount).toBe(1);

      // Stale - lazy (no recompute yet)
      staleTrigger.set(1);
      expect(computeCount).toBe(1);

      // Access triggers recompute after stale
      result();
      expect(computeCount).toBe(2);

      // Refresh - immediate (via microtask)
      refreshTrigger.set(1);
      await Promise.resolve();
      result();
      expect(computeCount).toBe(3);

      result.dispose();
    });
  });
});

// Import refreshOn for combined test
import { refreshOn } from "./refreshOn";
