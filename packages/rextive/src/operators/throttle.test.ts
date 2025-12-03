import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { signal } from "../signal";
import { throttle } from "./throttle";

describe("throttle operator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should use custom name when provided", () => {
    const source = signal("test");
    const throttled = throttle(300, { name: "customThrottle" })(source);

    // Custom name is used as-is
    expect(throttled.displayName).toBe("customThrottle");
  });

  it("should create a throttled signal with initial value", () => {
    const source = signal("initial");
    const throttled = throttle(300)(source);

    expect(throttled()).toBe("initial");
  });

  it("should emit first value immediately (leading edge)", () => {
    const source = signal(0);
    const throttled = throttle(300)(source);

    source.set(1);
    expect(throttled()).toBe(1); // Immediate update (leading edge)
  });

  it("should throttle subsequent rapid updates", () => {
    const source = signal(0);
    const throttled = throttle(300)(source);

    source.set(1); // Immediate
    expect(throttled()).toBe(1);

    source.set(2); // Throttled
    source.set(3); // Throttled
    expect(throttled()).toBe(1); // Still at first update

    vi.advanceTimersByTime(300);
    expect(throttled()).toBe(3); // Trailing edge with last value
  });

  it("should allow updates after throttle period", () => {
    const source = signal(0);
    const throttled = throttle(300)(source);

    source.set(1);
    expect(throttled()).toBe(1);

    vi.advanceTimersByTime(300);

    source.set(2);
    expect(throttled()).toBe(2); // Immediate again
  });

  it("should emit trailing value if updates during throttle", () => {
    const source = signal(0);
    const throttled = throttle(300)(source);

    source.set(1); // Leading edge
    source.set(2);
    source.set(3);

    vi.advanceTimersByTime(300);
    expect(throttled()).toBe(3); // Trailing edge
  });

  it("should not emit trailing if no updates during throttle", () => {
    const source = signal(0);
    const throttled = throttle(300)(source);
    const listener = vi.fn();
    throttled.on(listener);

    source.set(1); // Leading edge
    expect(listener).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(300);
    // No trailing emit since no updates during throttle
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("should return a Computed signal", () => {
    const source = signal(0);
    const throttled = throttle(300)(source);

    expect((throttled as any).set).toBeUndefined();
    expect(typeof throttled.pause).toBe("function");
    expect(typeof throttled.resume).toBe("function");
  });

  it("should clean up on dispose", () => {
    const source = signal(0);
    const throttled = throttle(300)(source);

    source.set(1);
    source.set(2); // Pending trailing

    throttled.dispose();

    // Trailing should not fire after dispose
    vi.advanceTimersByTime(300);
  });

  it("should handle continuous stream of updates", () => {
    const source = signal(0);
    const throttled = throttle(100)(source);
    const values: number[] = [];

    throttled.on(() => values.push(throttled()));

    // Simulate continuous updates over 500ms
    for (let i = 1; i <= 10; i++) {
      source.set(i);
      vi.advanceTimersByTime(30);
    }

    // Should have leading + trailing edges
    // At 0ms: leading (1)
    // At 100ms: trailing
    // At 200ms: trailing
    // At 300ms: trailing
    vi.advanceTimersByTime(100); // Final trailing

    // Should have throttled to ~4-5 updates instead of 10
    expect(values.length).toBeLessThan(10);
    expect(values.length).toBeGreaterThan(1);
  });

  it("should work with objects", () => {
    const source = signal({ x: 0 });
    const throttled = throttle(100)(source);

    source.set({ x: 1 });
    expect(throttled()).toEqual({ x: 1 });

    source.set({ x: 2 });
    source.set({ x: 3 });

    vi.advanceTimersByTime(100);
    expect(throttled()).toEqual({ x: 3 });
  });

  it("should be usable in computed dependencies", () => {
    const source = signal(5);
    const throttled = throttle(100)(source);

    const doubled = signal(
      { throttled },
      ({ deps }) => deps.throttled * 2
    );

    expect(doubled()).toBe(10);

    source.set(10);
    expect(doubled()).toBe(20); // Immediate (leading)

    source.set(15);
    source.set(20);
    expect(doubled()).toBe(20); // Still from leading edge

    vi.advanceTimersByTime(100);
    expect(doubled()).toBe(40); // Trailing edge
  });

  it("should handle very short throttle times", () => {
    const source = signal(0);
    const throttled = throttle(10)(source);

    source.set(1);
    expect(throttled()).toBe(1);

    source.set(2);
    vi.advanceTimersByTime(10);
    expect(throttled()).toBe(2);
  });
});

