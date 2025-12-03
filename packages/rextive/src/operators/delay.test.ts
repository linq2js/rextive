import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { signal } from "../signal";
import { delay, delayScheduler } from "./delay";

describe("delay operator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should use custom name when provided", () => {
    const source = signal("test");
    const delayed = delay(300, { name: "customDelay" })(source);

    // Custom name is used as-is
    expect(delayed.displayName).toBe("customDelay");
  });

  describe("delayScheduler", () => {
    it("should delay notification by specified milliseconds", () => {
      const notify = vi.fn();
      const scheduled = delayScheduler(100)(notify);

      scheduled();
      expect(notify).not.toHaveBeenCalled();

      vi.advanceTimersByTime(99);
      expect(notify).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(notify).toHaveBeenCalledTimes(1);
    });

    it("should delay until specified Date", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const notify = vi.fn();
      const futureDate = new Date(now + 500);
      const scheduled = delayScheduler(futureDate)(notify);

      scheduled();
      expect(notify).not.toHaveBeenCalled();

      vi.advanceTimersByTime(499);
      expect(notify).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(notify).toHaveBeenCalledTimes(1);
    });

    it("should fire immediately if Date is in the past", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const notify = vi.fn();
      const pastDate = new Date(now - 100);
      const scheduled = delayScheduler(pastDate)(notify);

      scheduled();
      // Should use 0ms delay for past dates
      vi.advanceTimersByTime(0);
      expect(notify).toHaveBeenCalledTimes(1);
    });

    it("should queue multiple notifications", () => {
      const notify = vi.fn();
      const scheduled = delayScheduler(100)(notify);

      scheduled(); // First call
      vi.advanceTimersByTime(50);
      scheduled(); // Second call while first is pending

      // First fires at 100ms
      vi.advanceTimersByTime(50);
      expect(notify).toHaveBeenCalledTimes(1);

      // Second fires at 150ms (50 + 100)
      vi.advanceTimersByTime(50);
      expect(notify).toHaveBeenCalledTimes(2);
    });
  });

  describe("delay operator", () => {
    it("should delay signal value updates by specified milliseconds", () => {
      const source = signal(1);
      const delayed = delay(100)(source);

      expect(delayed()).toBe(1); // Initial value is passed through immediately

      source.set(2);
      expect(delayed()).toBe(1); // Still old value

      vi.advanceTimersByTime(100);
      expect(delayed()).toBe(2); // Now updated
    });

    it("should delay signal value updates until specified Date", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const source = signal("initial");
      const futureDate = new Date(now + 200);
      const delayed = delay(futureDate)(source);

      expect(delayed()).toBe("initial");

      source.set("updated");
      expect(delayed()).toBe("initial");

      vi.advanceTimersByTime(200);
      expect(delayed()).toBe("updated");
    });

    it("should delay each update independently", () => {
      const source = signal(0);
      const delayed = delay(100)(source);

      source.set(1);
      expect(delayed()).toBe(0); // Still initial

      vi.advanceTimersByTime(100);
      expect(delayed()).toBe(1); // First update delivered

      source.set(2);
      expect(delayed()).toBe(1); // Still previous value

      vi.advanceTimersByTime(100);
      expect(delayed()).toBe(2); // Second update delivered
    });

    it("should work with pipe", () => {
      const source = signal(10);
      const delayed = source.pipe(delay(50));

      source.set(20);
      expect(delayed()).toBe(10);

      vi.advanceTimersByTime(50);
      expect(delayed()).toBe(20);
    });

    it("should stop updates after dispose", () => {
      const source = signal(1);
      const delayed = delay(100)(source);

      const listener = vi.fn();
      delayed.on(listener);

      source.set(2);
      delayed.dispose();

      vi.advanceTimersByTime(100);
      // Listener should not have been called after dispose
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

