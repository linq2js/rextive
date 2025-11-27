import { describe, it, expect, vi } from "vitest";
import { Mutable, signal } from "../index";
import { when } from "./when";

describe("when plugin", () => {
  describe("basic usage", () => {
    it("should call callback when trigger signal changes", () => {
      const trigger = signal(0);
      const callback = vi.fn();

      const count = signal(0, {
        use: [when(trigger, callback)],
      });

      expect(callback).not.toHaveBeenCalled();

      trigger.set(1);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(count, trigger);

      trigger.set(2);
      expect(callback).toHaveBeenCalledTimes(2);

      count.dispose();
    });

    it("should support array of triggers", () => {
      const trigger1 = signal(0);
      const trigger2 = signal("a");
      const callback = vi.fn();

      const count = signal(0, {
        use: [when([trigger1, trigger2], callback)],
      });

      trigger1.set(1);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenLastCalledWith(count, trigger1);

      trigger2.set("b");
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith(count, trigger2);

      count.dispose();
    });

    it("should cleanup subscriptions on dispose", () => {
      const trigger = signal(0);
      const callback = vi.fn();

      const count = signal(0, {
        use: [when(trigger, callback)],
      });

      trigger.set(1);
      expect(callback).toHaveBeenCalledTimes(1);

      count.dispose();

      trigger.set(2);
      expect(callback).toHaveBeenCalledTimes(1); // No additional calls
    });
  });

  describe("with mutable signals", () => {
    it("should allow setting value in callback", () => {
      const trigger = signal(0);
      const count = signal(0, {
        use: [when(trigger, (sig: Mutable<number>) => sig.set(100))],
      });

      expect(count()).toBe(0);

      trigger.set(1);
      expect(count()).toBe(100);

      count.dispose();
    });

    it("should work with multiple when plugins", () => {
      const increment = signal(0);
      const reset = signal(0);

      const count = signal(0, {
        use: [
          when(increment, (sig: Mutable<number>) => sig.set((v) => v + 1)),
          when(reset, (sig: Mutable<number>) => sig.set(0)),
        ],
      });

      expect(count()).toBe(0);

      increment.set(1);
      expect(count()).toBe(1);

      increment.set(2);
      expect(count()).toBe(2);

      reset.set(1);
      expect(count()).toBe(0);

      count.dispose();
    });
  });

  describe("with computed signals", () => {
    it("should allow calling signal methods in callback", () => {
      const trigger = signal(0);
      let refreshCalled = false;
      let staleCalled = false;

      const data = signal(0);
      const computed = signal({ data }, ({ deps }) => deps.data * 2);

      // Override methods to track calls
      const originalRefresh = computed.refresh.bind(computed);
      computed.refresh = () => {
        refreshCalled = true;
        originalRefresh();
      };

      const originalStale = computed.stale.bind(computed);
      computed.stale = () => {
        staleCalled = true;
        originalStale();
      };

      signal(0, {
        use: [
          when(trigger, () => {
            computed.refresh();
            computed.stale();
          }),
        ],
      });

      expect(refreshCalled).toBe(false);
      expect(staleCalled).toBe(false);

      trigger.set(1);

      expect(refreshCalled).toBe(true);
      expect(staleCalled).toBe(true);
    });

    it("should allow marking as stale in callback", () => {
      const data = signal(0);
      let computeCount = 0;

      const computed = signal({ data }, ({ deps }) => {
        computeCount++;
        return deps.data * 2;
      });

      const staleTrigger = signal(0);

      signal(0, {
        use: [when(staleTrigger, () => computed.stale())],
      });

      expect(computed()).toBe(0);
      expect(computeCount).toBe(1);

      // Mark as stale - won't recompute until accessed
      staleTrigger.set(1);
      expect(computeCount).toBe(1);

      // Now access triggers recomputation
      expect(computed()).toBe(0);
      expect(computeCount).toBe(2);
    });
  });

  describe("cleanup behavior", () => {
    it("should cleanup all when subscriptions on signal dispose", () => {
      const trigger1 = signal(0);
      const trigger2 = signal(0);
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const count = signal(0, {
        use: [when(trigger1, callback1), when(trigger2, callback2)],
      });

      trigger1.set(1);
      trigger2.set(1);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      count.dispose();

      trigger1.set(2);
      trigger2.set(2);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it("should not interfere with other plugins", () => {
      const trigger = signal(0);
      const pluginCleanup = vi.fn();
      const whenCallback = vi.fn();

      const testPlugin = () => pluginCleanup;

      const count = signal(0, {
        use: [testPlugin, when(trigger, whenCallback)],
      });

      trigger.set(1);
      expect(whenCallback).toHaveBeenCalledTimes(1);

      count.dispose();

      expect(pluginCleanup).toHaveBeenCalledTimes(1);
      expect(whenCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe("type safety", () => {
    it("should infer signal type correctly for mutable signals", () => {
      const trigger = signal(0);

      // TypeScript should infer `sig` as MutableSignal<number>
      const count = signal(0, {
        use: [
          when(trigger, (sig: Mutable<number>) => {
            sig.set(100); // ✅ .set() available
            sig.reset(); // ✅ .reset() available
          }),
        ],
      });

      trigger.set(1);
      expect(count()).toBe(0); // reset() was called

      count.dispose();
    });
  });
});
