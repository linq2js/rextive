import { describe, it, expect } from "vitest";
import { signal } from "../signal";
import { refreshOn } from "./on";

describe("refreshOn", () => {
  describe("single notifier", () => {
    it("should refresh source when notifier changes", async () => {
      const trigger = signal(0);
      let computeCount = 0;

      const source = signal({ dep: signal(0) }, () => {
        computeCount++;
        return computeCount;
      });

      const result = source.pipe(refreshOn(trigger));

      // Access to trigger initial compute
      result();
      expect(computeCount).toBe(1);

      // Trigger refresh
      trigger.set(1);
      await Promise.resolve(); // Wait for microtask
      result();
      expect(computeCount).toBe(2);

      // Trigger again
      trigger.set(2);
      await Promise.resolve();
      result();
      expect(computeCount).toBe(3);

      result.dispose();
    });

    it("should not refresh when filter returns false", async () => {
      const trigger = signal(0);
      let computeCount = 0;

      const source = signal({ dep: signal(0) }, () => {
        computeCount++;
        return computeCount;
      });

      // Only refresh when trigger > 5
      const result = source.pipe(refreshOn(trigger, (n) => n() > 5));

      // Access to trigger initial compute
      result();
      expect(computeCount).toBe(1);

      // Trigger with value <= 5 - should not refresh
      trigger.set(3);
      await Promise.resolve();
      result();
      expect(computeCount).toBe(1);

      trigger.set(5);
      await Promise.resolve();
      result();
      expect(computeCount).toBe(1);

      // Trigger with value > 5 - should refresh
      trigger.set(6);
      await Promise.resolve();
      result();
      expect(computeCount).toBe(2);

      trigger.set(10);
      await Promise.resolve();
      result();
      expect(computeCount).toBe(3);

      result.dispose();
    });

    it("should return the same signal type", () => {
      const trigger = signal(0);
      const source = signal({ trigger }, ({ deps }) => deps.trigger * 2);

      const result = source.pipe(refreshOn(trigger));

      // Should be the same signal
      expect(result).toBe(source);
    });
  });

  describe("multiple notifiers", () => {
    it("should refresh source when any notifier changes", async () => {
      const trigger1 = signal(0);
      const trigger2 = signal(0);
      let computeCount = 0;

      const source = signal({ dep: signal(0) }, () => {
        computeCount++;
        return computeCount;
      });

      const result = source.pipe(refreshOn([trigger1, trigger2]));

      // Initial compute
      result();
      expect(computeCount).toBe(1);

      // Trigger from first notifier
      trigger1.set(1);
      await Promise.resolve();
      result();
      expect(computeCount).toBe(2);

      // Trigger from second notifier
      trigger2.set(1);
      await Promise.resolve();
      result();
      expect(computeCount).toBe(3);

      // Both work
      trigger1.set(2);
      await Promise.resolve();
      result();
      expect(computeCount).toBe(4);

      result.dispose();
    });

    it("should apply filter to each notifier individually", async () => {
      const trigger1 = signal(0);
      const trigger2 = signal(0);
      let computeCount = 0;

      const source = signal({ dep: signal(0) }, () => {
        computeCount++;
        return computeCount;
      });

      // Only refresh when the specific notifier's value > 0
      const result = source.pipe(
        refreshOn([trigger1, trigger2], (n) => n() > 0)
      );

      // Initial compute
      result();
      expect(computeCount).toBe(1);

      // trigger1 = 0, should not refresh
      trigger1.set(0);
      await Promise.resolve();
      result();
      expect(computeCount).toBe(1);

      // trigger1 > 0, should refresh
      trigger1.set(1);
      await Promise.resolve();
      result();
      expect(computeCount).toBe(2);

      // trigger2 = 0, should not refresh
      trigger2.set(0);
      await Promise.resolve();
      result();
      expect(computeCount).toBe(2);

      // trigger2 > 0, should refresh
      trigger2.set(1);
      await Promise.resolve();
      result();
      expect(computeCount).toBe(3);

      result.dispose();
    });
  });

  describe("cleanup", () => {
    it("should unsubscribe from notifiers on dispose", async () => {
      const trigger = signal(0);
      let computeCount = 0;

      const source = signal({ dep: signal(0) }, () => {
        computeCount++;
        return computeCount;
      });

      const result = source.pipe(refreshOn(trigger));

      // Initial compute
      result();
      expect(computeCount).toBe(1);

      // Trigger works before dispose
      trigger.set(1);
      await Promise.resolve();
      result();
      expect(computeCount).toBe(2);

      // Dispose
      result.dispose();

      // Trigger should not work after dispose
      trigger.set(2);
      await Promise.resolve();
      // Note: After dispose, accessing result may throw or return stale value
      expect(computeCount).toBe(2); // No additional compute triggered
    });

    it("should unsubscribe from all notifiers on dispose", async () => {
      const trigger1 = signal(0);
      const trigger2 = signal(0);
      let computeCount = 0;

      const source = signal({ dep: signal(0) }, () => {
        computeCount++;
        return computeCount;
      });

      const result = source.pipe(refreshOn([trigger1, trigger2]));

      // Initial compute
      result();
      expect(computeCount).toBe(1);

      // Dispose
      result.dispose();

      // Neither trigger should work after dispose
      trigger1.set(1);
      trigger2.set(1);
      await Promise.resolve();
      expect(computeCount).toBe(1); // No change
    });
  });

  describe("chaining", () => {
    it("should work with multiple refreshOn operators", async () => {
      const trigger1 = signal(0);
      const trigger2 = signal(0);
      let computeCount = 0;

      const source = signal({ dep: signal(0) }, () => {
        computeCount++;
        return computeCount;
      });

      const result = source.pipe(refreshOn(trigger1), refreshOn(trigger2));

      // Initial compute
      result();
      expect(computeCount).toBe(1);

      // Both triggers work
      trigger1.set(1);
      await Promise.resolve();
      result();
      expect(computeCount).toBe(2);

      trigger2.set(1);
      await Promise.resolve();
      result();
      expect(computeCount).toBe(3);

      result.dispose();
    });
  });
});
