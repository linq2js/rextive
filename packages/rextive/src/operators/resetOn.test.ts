import { describe, it, expect } from "vitest";
import { signal } from "../signal";
import { resetOn } from "./on";

describe("resetOn", () => {
  describe("single notifier", () => {
    it("should reset source to initial value when notifier changes", () => {
      const trigger = signal(0);
      const counter = signal(10);

      counter.pipe(resetOn(trigger));

      // Modify the value
      counter.set(50);
      expect(counter()).toBe(50);

      // Trigger reset
      trigger.set(1);
      expect(counter()).toBe(10); // Back to initial value
    });

    it("should reset object to initial value", () => {
      const trigger = signal(0);
      const form = signal({ name: "", email: "" });

      form.pipe(resetOn(trigger));

      // Fill in form
      form.set({ name: "John", email: "john@example.com" });
      expect(form()).toEqual({ name: "John", email: "john@example.com" });

      // Trigger reset
      trigger.set(1);
      expect(form()).toEqual({ name: "", email: "" });
    });

    it("should reset array to initial value", () => {
      const trigger = signal(0);
      const items = signal<number[]>([1, 2, 3]);

      items.pipe(resetOn(trigger));

      // Modify array
      items.set([4, 5, 6, 7, 8]);
      expect(items()).toEqual([4, 5, 6, 7, 8]);

      // Trigger reset
      trigger.set(1);
      expect(items()).toEqual([1, 2, 3]);
    });

    it("should not reset when filter returns false", () => {
      const trigger = signal(0);
      const counter = signal(10);

      // Only reset when trigger > 5
      counter.pipe(resetOn(trigger, (n) => n() > 5));

      counter.set(50);
      expect(counter()).toBe(50);

      // Trigger with value <= 5 - should not reset
      trigger.set(3);
      expect(counter()).toBe(50);

      trigger.set(5);
      expect(counter()).toBe(50);

      // Trigger with value > 5 - should reset
      trigger.set(6);
      expect(counter()).toBe(10);
    });

    it("should return the same signal", () => {
      const trigger = signal(0);
      const source = signal(42);

      const result = source.pipe(resetOn(trigger));

      expect(result).toBe(source);
    });
  });

  describe("multiple notifiers", () => {
    it("should reset when any notifier changes", () => {
      const trigger1 = signal(0);
      const trigger2 = signal(0);
      const counter = signal(10);

      counter.pipe(resetOn([trigger1, trigger2]));

      counter.set(50);
      expect(counter()).toBe(50);

      // Trigger from first notifier
      trigger1.set(1);
      expect(counter()).toBe(10);

      // Modify again
      counter.set(100);
      expect(counter()).toBe(100);

      // Trigger from second notifier
      trigger2.set(1);
      expect(counter()).toBe(10);
    });

    it("should apply filter to multiple notifiers", () => {
      const trigger1 = signal(0);
      const trigger2 = signal(0);
      const counter = signal(10);

      // Only reset when notifier value > 5
      counter.pipe(resetOn([trigger1, trigger2], (n) => n() > 5));

      counter.set(50);
      expect(counter()).toBe(50);

      // Both triggers below threshold
      trigger1.set(3);
      trigger2.set(4);
      expect(counter()).toBe(50);

      // First trigger above threshold
      trigger1.set(6);
      expect(counter()).toBe(10);

      // Modify and check second trigger
      counter.set(200);
      trigger2.set(10);
      expect(counter()).toBe(10);
    });
  });

  describe("notifier pattern", () => {
    it("should work with void notifier (event bus pattern)", () => {
      const clearTrigger = signal<void>();
      const data = signal({ count: 0, items: [] as string[] });

      data.pipe(resetOn(clearTrigger));

      // Accumulate data
      data.set({ count: 5, items: ["a", "b", "c"] });
      expect(data()).toEqual({ count: 5, items: ["a", "b", "c"] });

      // Clear using void notifier
      clearTrigger.set(undefined as void);
      expect(data()).toEqual({ count: 0, items: [] });
    });

    it("should work with action dispatcher pattern", () => {
      type Action = { type: "reset" } | { type: "clear" };
      const action = signal<Action>();
      const counter = signal(0);

      // Only reset on "reset" action
      counter.pipe(resetOn(action, (a) => a()?.type === "reset"));

      counter.set(100);
      expect(counter()).toBe(100);

      // "clear" action should not reset
      action.set({ type: "clear" });
      expect(counter()).toBe(100);

      // "reset" action should reset
      action.set({ type: "reset" });
      expect(counter()).toBe(0);
    });
  });

  describe("cleanup", () => {
    it("should cleanup subscriptions on dispose", () => {
      const trigger = signal(0);
      const counter = signal(10);

      const result = counter.pipe(resetOn(trigger));

      counter.set(50);
      trigger.set(1);
      expect(counter()).toBe(10);

      // Dispose
      result.dispose();

      // Trigger after dispose should not throw (subscriptions cleaned up)
      // The signal is disposed so we can't test further modifications
      expect(() => trigger.set(2)).not.toThrow();
    });

    it("should cleanup when source is disposed", () => {
      const trigger = signal(0);
      const counter = signal(10);

      counter.pipe(resetOn(trigger));

      counter.dispose();

      // This should not throw
      trigger.set(1);
    });
  });

  describe("chaining", () => {
    it("should work with multiple resetOn operators", () => {
      const trigger1 = signal(0);
      const trigger2 = signal(0);
      const counter = signal(10);

      counter.pipe(resetOn(trigger1)).pipe(resetOn(trigger2));

      counter.set(50);
      expect(counter()).toBe(50);

      trigger1.set(1);
      expect(counter()).toBe(10);

      counter.set(100);
      trigger2.set(1);
      expect(counter()).toBe(10);
    });
  });

  describe("edge cases", () => {
    it("should handle rapid consecutive resets", () => {
      const trigger = signal(0);
      const counter = signal(10);

      counter.pipe(resetOn(trigger));

      counter.set(100);
      trigger.set(1);
      trigger.set(2);
      trigger.set(3);

      expect(counter()).toBe(10);
    });

    it("should handle empty array notifier", () => {
      const counter = signal(10);

      // Empty array - no notifiers
      counter.pipe(resetOn([]));

      counter.set(50);
      expect(counter()).toBe(50);

      // Nothing should reset it
    });

    it("should handle boolean signal as notifier", () => {
      const enabled = signal(false);
      const counter = signal(10);

      // Reset when enabled becomes true
      counter.pipe(resetOn(enabled, (e) => e() === true));

      counter.set(50);
      expect(counter()).toBe(50);

      enabled.set(true);
      expect(counter()).toBe(10);
    });
  });
});

