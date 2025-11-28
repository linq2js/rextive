import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { signal } from "../signal";
import { debounce } from "./debounce";
import { to } from "./to";

describe("debounce operator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should create a debounced signal with initial value", () => {
    const source = signal("initial");
    const debounced = debounce(300)(source);

    expect(debounced()).toBe("initial");
  });

  it("should debounce rapid updates", () => {
    const source = signal(0);
    const debounced = debounce(300)(source);

    // Rapid updates
    source.set(1);
    source.set(2);
    source.set(3);

    // Not updated yet (still debouncing)
    expect(debounced()).toBe(0);

    // Advance time but not enough
    vi.advanceTimersByTime(200);
    expect(debounced()).toBe(0);

    // Advance past debounce time
    vi.advanceTimersByTime(100);
    expect(debounced()).toBe(3); // Only last value
  });

  it("should reset debounce timer on each update", () => {
    const source = signal(0);
    const debounced = debounce(300)(source);

    source.set(1);
    vi.advanceTimersByTime(200);
    expect(debounced()).toBe(0);

    source.set(2); // Reset timer
    vi.advanceTimersByTime(200);
    expect(debounced()).toBe(0); // Still waiting

    vi.advanceTimersByTime(100);
    expect(debounced()).toBe(2);
  });

  it("should update immediately after debounce period", () => {
    const source = signal("a");
    const debounced = debounce(100)(source);

    source.set("b");
    vi.advanceTimersByTime(100);
    expect(debounced()).toBe("b");

    // Next update starts fresh
    source.set("c");
    expect(debounced()).toBe("b"); // Still old value

    vi.advanceTimersByTime(100);
    expect(debounced()).toBe("c");
  });

  it("should notify subscribers after debounce", () => {
    const source = signal(0);
    const debounced = debounce(300)(source);

    const listener = vi.fn();
    debounced.on(listener);

    source.set(1);
    source.set(2);
    source.set(3);

    expect(listener).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("should return a Computed signal", () => {
    const source = signal(0);
    const debounced = debounce(300)(source);

    expect((debounced as any).set).toBeUndefined();
    expect(typeof debounced.pause).toBe("function");
    expect(typeof debounced.resume).toBe("function");
  });

  it("should clean up timeout on dispose", () => {
    const source = signal(0);
    const debounced = debounce(300)(source);

    source.set(10);
    debounced.dispose();

    // Should not throw or update after dispose
    vi.advanceTimersByTime(300);
  });

  it("should work with objects", () => {
    const source = signal({ name: "John" });
    const debounced = debounce(100)(source);

    source.set({ name: "Jane" });
    source.set({ name: "Bob" });

    vi.advanceTimersByTime(100);
    expect(debounced()).toEqual({ name: "Bob" });
  });

  it("should work with arrays", () => {
    const source = signal([1, 2, 3]);
    const debounced = debounce(100)(source);

    source.set([4, 5]);
    source.set([6, 7, 8]);

    vi.advanceTimersByTime(100);
    expect(debounced()).toEqual([6, 7, 8]);
  });

  it("should handle zero debounce time", () => {
    const source = signal(0);
    const debounced = debounce(0)(source);

    source.set(1);

    // Even with 0ms, it should be async (next tick)
    expect(debounced()).toBe(0);

    vi.advanceTimersByTime(0);
    expect(debounced()).toBe(1);
  });

  it("should be usable in computed dependencies", () => {
    const source = signal(5);

    // Use debounced signal as dependency
    const doubled = source.pipe(
      debounce(100),
      to((x) => x * 2)
    );

    expect(doubled()).toBe(10);

    source.set(10);
    expect(doubled()).toBe(10); // Not updated yet

    vi.advanceTimersByTime(100);
    expect(doubled()).toBe(20);
  });
});
