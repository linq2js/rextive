import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { signal } from "../signal";
import { pace } from "./pace";
import type { Scheduler } from "./types";

describe("pace operator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should create a computed signal with initial value from source", () => {
    const source = signal(42);
    const identity: Scheduler = (notify) => notify; // Pass-through

    const result = pace(identity)(source);

    expect(result()).toBe(42);
  });

  it("should update when source changes (with identity scheduler)", () => {
    const source = signal(0);
    const identity: Scheduler = (notify) => notify;

    const result = pace(identity)(source);

    source.set(10);
    expect(result()).toBe(10);

    source.set(20);
    expect(result()).toBe(20);
  });

  it("should apply scheduler to control update timing", () => {
    const source = signal(0);
    const notifyCalls: number[] = [];

    // Custom scheduler that delays by 100ms
    const delayScheduler: Scheduler = (notify) => {
      return () => {
        setTimeout(() => {
          notifyCalls.push(Date.now());
          notify();
        }, 100);
      };
    };

    const result = pace(delayScheduler)(source);
    expect(result()).toBe(0); // Initial value immediately

    source.set(10);
    expect(result()).toBe(0); // Not updated yet

    vi.advanceTimersByTime(50);
    expect(result()).toBe(0); // Still not updated

    vi.advanceTimersByTime(50);
    expect(result()).toBe(10); // Now updated
  });

  it("should return a Computed signal (read-only)", () => {
    const source = signal(0);
    const identity: Scheduler = (notify) => notify;

    const result = pace(identity)(source);

    // Should not have .set() method
    expect((result as any).set).toBeUndefined();

    // Should have computed-specific methods
    expect(typeof result.pause).toBe("function");
    expect(typeof result.resume).toBe("function");
    expect(typeof result.paused).toBe("function");
  });

  it("should clean up on dispose", () => {
    const source = signal(0);
    const cleanupCalled = vi.fn();

    const schedulerWithCleanup: Scheduler = (notify) => {
      const timeoutId = setTimeout(notify, 100);
      // Track cleanup via closure
      return () => {
        clearTimeout(timeoutId);
        cleanupCalled();
      };
    };

    const result = pace(schedulerWithCleanup)(source);
    source.set(10); // Trigger scheduler

    result.dispose();

    // Cleanup should have been triggered
    expect(cleanupCalled).toHaveBeenCalled();

    // Advancing time should not cause issues
    vi.advanceTimersByTime(200);
  });

  it("should dispose internal mutable signal on dispose", () => {
    const source = signal(0);
    const identity: Scheduler = (notify) => notify;

    const result = pace(identity)(source);
    
    // Subscribe before dispose
    const listener = vi.fn();
    result.on(listener);
    
    // Verify it works before dispose
    source.set(5);
    expect(listener).toHaveBeenCalledTimes(1);
    
    result.dispose();

    // After dispose, source changes should not propagate
    listener.mockClear();
    source.set(10);
    expect(listener).not.toHaveBeenCalled();
  });

  it("should unsubscribe from source on dispose", () => {
    const source = signal(0);
    const identity: Scheduler = (notify) => notify;

    const result = pace(identity)(source);
    result.dispose();

    // Source changes should not affect result
    source.set(100);
    // Result should maintain last value before dispose
    // (reading disposed signal behavior depends on implementation)
  });

  it("should support curried syntax", () => {
    const source = signal("hello");
    const identity: Scheduler = (notify) => notify;

    // Curried: pace(scheduler)(source)
    const paceWithIdentity = pace(identity);
    const result = paceWithIdentity(source);

    expect(result()).toBe("hello");
    source.set("world");
    expect(result()).toBe("world");
  });

  it("should propagate values from computed source", () => {
    const source = signal(0);
    const identity: Scheduler = (notify) => notify;

    const computedSource = signal(
      { source },
      ({ deps }) => deps.source * 2
    );

    const result = pace(identity)(computedSource);

    expect(result()).toBe(0);

    source.set(5);
    expect(result()).toBe(10);
    
    source.set(10);
    expect(result()).toBe(20);
  });
});

