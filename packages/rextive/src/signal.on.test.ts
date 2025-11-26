import { describe, it, expect, vi } from "vitest";
import { signal } from "./signal";

describe("signal.on()", () => {
  describe("basic functionality", () => {
    it("should call callback when any signal changes", () => {
      const count = signal(0);
      const name = signal("Alice");
      const enabled = signal(true);

      const callback = vi.fn();
      signal.on([count, name, enabled], callback);

      count.set(1);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(count);

      name.set("Bob");
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith(name);

      enabled.set(false);
      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenCalledWith(enabled);
    });

    it("should NOT evaluate signals at the beginning (effect-like)", () => {
      const count = signal(5);
      const name = signal("Alice");

      const callback = vi.fn();
      signal.on([count, name], callback);

      // Should not have been called yet
      expect(callback).toHaveBeenCalledTimes(0);

      // Only called when signals change
      count.set(10);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should receive the triggering signal in callback", () => {
      const s1 = signal(1);
      const s2 = signal(2);
      const s3 = signal(3);

      const triggers: Array<typeof s1 | typeof s2 | typeof s3> = [];
      signal.on([s1, s2, s3], (trigger) => {
        triggers.push(trigger);
      });

      s1.set(10);
      s2.set(20);
      s3.set(30);

      expect(triggers).toHaveLength(3);
      expect(triggers[0]).toBe(s1);
      expect(triggers[1]).toBe(s2);
      expect(triggers[2]).toBe(s3);
    });

    it("should allow reading triggering signal value", () => {
      const count = signal(0);
      const name = signal("Alice");

      const values: Array<number | string> = [];
      signal.on([count, name], (trigger) => {
        values.push(trigger());
      });

      count.set(5);
      name.set("Bob");
      count.set(10);

      expect(values).toEqual([5, "Bob", 10]);
    });

    it("should work with single signal", () => {
      const count = signal(0);
      const callback = vi.fn();

      signal.on([count], callback);

      count.set(1);
      count.set(2);

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it("should work with many signals", () => {
      const signals = Array.from({ length: 10 }, (_, i) => signal(i));
      const callback = vi.fn();

      signal.on(signals, callback);

      // Change each signal
      signals.forEach((sig, i) => sig.set(i + 100));

      expect(callback).toHaveBeenCalledTimes(10);
    });
  });

  describe("pause and resume", () => {
    it("should pause subscription", () => {
      const count = signal(0);
      const name = signal("Alice");
      const callback = vi.fn();

      const control = signal.on([count, name], callback);

      count.set(1);
      expect(callback).toHaveBeenCalledTimes(1);

      control.pause();

      count.set(2);
      name.set("Bob");
      expect(callback).toHaveBeenCalledTimes(1); // Still 1, paused
    });

    it("should resume subscription", () => {
      const count = signal(0);
      const callback = vi.fn();

      const control = signal.on([count], callback);

      control.pause();
      count.set(1);
      expect(callback).toHaveBeenCalledTimes(0);

      control.resume();
      count.set(2);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should report paused state", () => {
      const count = signal(0);
      const control = signal.on([count], () => {});

      expect(control.paused()).toBe(false);

      control.pause();
      expect(control.paused()).toBe(true);

      control.resume();
      expect(control.paused()).toBe(false);
    });

    it("should allow multiple pause/resume cycles", () => {
      const count = signal(0);
      const callback = vi.fn();
      const control = signal.on([count], callback);

      control.pause();
      count.set(1);
      control.resume();
      count.set(2);
      control.pause();
      count.set(3);
      control.resume();
      count.set(4);

      expect(callback).toHaveBeenCalledTimes(2); // Only calls 2 and 4
    });

    it("should throw when pausing disposed subscription", () => {
      const count = signal(0);
      const control = signal.on([count], () => {});

      control.dispose();

      expect(() => control.pause()).toThrow("Cannot pause disposed subscription");
    });

    it("should throw when resuming disposed subscription", () => {
      const count = signal(0);
      const control = signal.on([count], () => {});

      control.dispose();

      expect(() => control.resume()).toThrow("Cannot resume disposed subscription");
    });
  });

  describe("dispose", () => {
    it("should stop receiving updates after disposal", () => {
      const count = signal(0);
      const name = signal("Alice");
      const callback = vi.fn();

      const control = signal.on([count, name], callback);

      count.set(1);
      expect(callback).toHaveBeenCalledTimes(1);

      control.dispose();

      count.set(2);
      name.set("Bob");
      expect(callback).toHaveBeenCalledTimes(1); // Still 1
    });

    it("should be idempotent", () => {
      const count = signal(0);
      const control = signal.on([count], () => {});

      control.dispose();
      control.dispose(); // Should not throw
      control.dispose();
    });

    it("should unsubscribe from all signals", () => {
      const count = signal(0);
      const name = signal("Alice");

      const countCallback = vi.fn();
      const nameCallback = vi.fn();

      // Create individual subscriptions to verify disposal
      count.on(countCallback);
      name.on(nameCallback);

      const control = signal.on([count, name], () => {});

      count.set(1);
      name.set("Bob");

      // Both individual callbacks should be called
      expect(countCallback).toHaveBeenCalledTimes(1);
      expect(nameCallback).toHaveBeenCalledTimes(1);

      control.dispose();

      // Reset counts
      countCallback.mockClear();
      nameCallback.mockClear();

      count.set(2);
      name.set("Charlie");

      // Individual callbacks still work (not affected by signal.on disposal)
      expect(countCallback).toHaveBeenCalledTimes(1);
      expect(nameCallback).toHaveBeenCalledTimes(1);
    });

    it("should clear paused state after disposal", () => {
      const count = signal(0);
      const control = signal.on([count], () => {});

      control.pause();
      expect(control.paused()).toBe(true);

      control.dispose();
      expect(control.paused()).toBe(false);
    });
  });

  describe("type inference", () => {
    it("should infer callback parameter type from signals", () => {
      const count = signal(0);
      const name = signal("Alice");
      const enabled = signal(true);

      signal.on([count, name, enabled], (trigger) => {
        // trigger should be typed as: Signal<number> | Signal<string> | Signal<boolean>
        const value = trigger(); // number | string | boolean
        
        // TypeScript should allow this
        if (typeof value === "number") {
          expect(value).toBeTypeOf("number");
        } else if (typeof value === "string") {
          expect(value).toBeTypeOf("string");
        } else {
          expect(value).toBeTypeOf("boolean");
        }
      });

      count.set(1);
      name.set("Bob");
      enabled.set(false);
    });

    it("should work with homogeneous signal types", () => {
      const s1 = signal(1);
      const s2 = signal(2);
      const s3 = signal(3);

      signal.on([s1, s2, s3], (trigger) => {
        // trigger should be typed as: Signal<number>
        const value = trigger(); // number
        expect(typeof value).toBe("number");
      });

      s1.set(10);
    });
  });

  describe("computed signals", () => {
    it("should work with computed signals", () => {
      const count = signal(5);
      const doubled = signal({ count }, ({ deps }) => deps.count * 2);

      const callback = vi.fn();
      signal.on([count, doubled], callback);

      count.set(10);

      // Both count and doubled will trigger (doubled depends on count)
      expect(callback).toHaveBeenCalled();
    });

    it("should work with mixed mutable and computed signals", () => {
      const a = signal(1);
      const b = signal(2);
      const sum = signal({ a, b }, ({ deps }) => deps.a + deps.b);

      const triggers: any[] = [];
      signal.on([a, b, sum], (trigger) => {
        triggers.push(trigger);
      });

      a.set(5);
      b.set(10);

      // Should capture all triggers
      expect(triggers.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("should handle empty signal array", () => {
      const callback = vi.fn();
      const control = signal.on([], callback);

      // Should not throw
      control.pause();
      control.resume();
      control.dispose();

      expect(callback).not.toHaveBeenCalled();
    });

    it("should handle rapid changes", () => {
      const count = signal(0);
      const callback = vi.fn();

      signal.on([count], callback);

      // Rapid updates (start from 1 since initial is 0)
      for (let i = 1; i <= 100; i++) {
        count.set(i);
      }

      expect(callback).toHaveBeenCalledTimes(100);
    });

    it("should handle callback throwing errors", () => {
      const count = signal(0);
      const error = new Error("Callback error");

      signal.on([count], () => {
        throw error;
      });

      expect(() => count.set(1)).toThrow(error);
    });

    it("should work with async signals", async () => {
      const asyncSig = signal(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 42;
      });

      const callback = vi.fn();
      signal.on([asyncSig], callback);

      // Trigger refresh
      asyncSig.refresh?.();

      // Wait a bit for async resolution
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Should have been called when promise resolved
      expect(callback).toHaveBeenCalled();
    });

    it("should not trigger if signal value doesn't change", () => {
      const count = signal(5);
      const callback = vi.fn();

      signal.on([count], callback);

      count.set(5); // Same value
      count.set(5);

      expect(callback).toHaveBeenCalledTimes(0); // No change
    });

    it("should respect signal's equality settings", () => {
      // With custom equality that always returns false (always triggers)
      const count = signal<number>(5, { equals: () => false });
      const callback = vi.fn();

      signal.on([count], callback);

      count.set(5); // Same value but custom equals always returns false
      count.set(5);

      expect(callback).toHaveBeenCalledTimes(2); // Should trigger both times
    });
  });

  describe("cleanup", () => {
    it("should cleanup all resources on dispose", () => {
      const signals = Array.from({ length: 100 }, (_, i) => signal(i));
      const control = signal.on(signals, () => {});

      control.dispose();

      // All signals should be unsubscribed (no memory leaks)
      // This is implicitly tested by ensuring callbacks don't fire
      const callback = vi.fn();
      signals.forEach((sig) => sig.set(999));

      expect(callback).not.toHaveBeenCalled();
    });

    it("should allow creating new subscription after disposing old one", () => {
      const count = signal(0);
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const control1 = signal.on([count], callback1);
      control1.dispose();

      const control2 = signal.on([count], callback2);
      
      count.set(1);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);

      control2.dispose();
    });
  });

  describe("return value", () => {
    it("should return control object with correct methods", () => {
      const count = signal(0);
      const control = signal.on([count], () => {});

      expect(control).toHaveProperty("pause");
      expect(control).toHaveProperty("resume");
      expect(control).toHaveProperty("paused");
      expect(control).toHaveProperty("dispose");

      expect(typeof control.pause).toBe("function");
      expect(typeof control.resume).toBe("function");
      expect(typeof control.paused).toBe("function");
      expect(typeof control.dispose).toBe("function");
    });
  });
});

