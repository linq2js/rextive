import { describe, it, expect, vi } from "vitest";
import { signal } from "../signal";
import { scanSignal } from "./scanSignal";

describe("scanSignal", () => {
  it("should accumulate values", () => {
    const count = signal(1);
    const total = scanSignal(count, (sum, curr) => sum + curr, 0);

    expect(total()).toBe(1);

    count.set(2);
    expect(total()).toBe(3);

    count.set(3);
    expect(total()).toBe(6);
  });

  it("should calculate delta from previous value", () => {
    const count = signal(10);
    // Accumulator stores { prev, delta }
    const deltaState = scanSignal(
      count,
      (acc, curr) => ({
        prev: curr,
        delta: curr - acc.prev,
      }),
      { prev: 0, delta: 0 }
    );
    const delta = deltaState.map((s) => s.delta);

    expect(delta()).toBe(10); // 10 - 0

    count.set(15);
    expect(delta()).toBe(5); // 15 - 10

    count.set(12);
    expect(delta()).toBe(-3); // 12 - 15
  });

  it("should support type transformation", () => {
    const count = signal(1);
    const history = scanSignal(count, (acc, curr) => acc + curr + ", ", "");

    expect(history()).toBe("1, ");

    count.set(2);
    expect(history()).toBe("1, 2, ");

    count.set(3);
    expect(history()).toBe("1, 2, 3, ");
  });

  it("should build statistics object", () => {
    const value = signal(10);
    const stats = scanSignal(
      value,
      (acc, curr) => ({
        sum: acc.sum + curr,
        count: acc.count + 1,
        avg: (acc.sum + curr) / (acc.count + 1),
        min: Math.min(acc.min, curr),
        max: Math.max(acc.max, curr),
      }),
      { sum: 0, count: 0, avg: 0, min: Infinity, max: -Infinity }
    );

    expect(stats()).toEqual({
      sum: 10,
      count: 1,
      avg: 10,
      min: 10,
      max: 10,
    });

    value.set(20);
    expect(stats()).toEqual({
      sum: 30,
      count: 2,
      avg: 15,
      min: 10,
      max: 20,
    });

    value.set(5);
    expect(stats()).toEqual({
      sum: 35,
      count: 3,
      avg: 11.666666666666666,
      min: 5,
      max: 20,
    });
  });

  it("should keep last N values", () => {
    const value = signal(1);
    const last3 = scanSignal(
      value,
      (acc, curr) => [...acc, curr].slice(-3),
      [] as number[]
    );

    expect(last3()).toEqual([1]);

    value.set(2);
    expect(last3()).toEqual([1, 2]);

    value.set(3);
    expect(last3()).toEqual([1, 2, 3]);

    value.set(4);
    expect(last3()).toEqual([2, 3, 4]);

    value.set(5);
    expect(last3()).toEqual([3, 4, 5]);
  });

  it("should work via method syntax .scan()", () => {
    const count = signal(1);
    const total = count.scan((sum, curr) => sum + curr, 0);

    expect(total()).toBe(1);

    count.set(2);
    expect(total()).toBe(3);
  });

  it("should notify subscribers on changes", () => {
    const count = signal(1);
    const total = scanSignal(count, (sum, curr) => sum + curr, 0);

    const listener = vi.fn();
    total.on(listener);

    count.set(2);
    expect(listener).toHaveBeenCalledTimes(1);

    count.set(3);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("should support custom equals function", () => {
    const value = signal({ x: 1 });
    // Custom equals for object comparison
    const values = scanSignal(
      value,
      (arr, curr) => [...arr, curr],
      [] as Array<{ x: number }>,
      (a, b) => a?.length === b?.length // Only notify when length changes
    );

    const listener = vi.fn();
    values.on(listener);

    expect(values()).toEqual([{ x: 1 }]);

    value.set({ x: 2 });
    expect(values()).toEqual([{ x: 1 }, { x: 2 }]);
    expect(listener).toHaveBeenCalledTimes(1); // Length changed 1 -> 2

    value.set({ x: 3 });
    expect(values()).toEqual([{ x: 1 }, { x: 2 }, { x: 3 }]);
    expect(listener).toHaveBeenCalledTimes(2); // Length changed 2 -> 3
  });

  it("should work with computed signals", () => {
    const count = signal(1);
    const doubled = signal({ count }, (ctx) => ctx.deps.count * 2);
    const total = scanSignal(doubled, (sum, curr) => sum + curr, 0);

    expect(total()).toBe(2);

    count.set(2);
    expect(total()).toBe(6); // 2 + 4

    count.set(3);
    expect(total()).toBe(12); // 6 + 6
  });

  it("should support chaining with map", () => {
    const count = signal(1);
    const total = count.scan((sum, curr) => sum + curr, 0);
    const formatted = total.map((x) => `Total: ${x}`);

    expect(formatted()).toBe("Total: 1");

    count.set(2);
    expect(formatted()).toBe("Total: 3");
  });

  it("should maintain separate accumulator per signal", () => {
    const count = signal(1);
    const total1 = scanSignal(count, (sum, curr) => sum + curr, 0);
    const total2 = scanSignal(count, (sum, curr) => sum + curr, 100);

    expect(total1()).toBe(1);
    expect(total2()).toBe(101);

    count.set(2);
    expect(total1()).toBe(3);
    expect(total2()).toBe(103);
  });

  it("should handle undefined values", () => {
    const value = signal<number | undefined>(5);
    const sum = scanSignal(
      value,
      (acc, curr) => acc + (curr ?? 0),
      0
    );

    expect(sum()).toBe(5);

    value.set(undefined);
    expect(sum()).toBe(5);

    value.set(10);
    expect(sum()).toBe(15);
  });

  it("should dispose properly", () => {
    const count = signal(1);
    const total = scanSignal(count, (sum, curr) => sum + curr, 0);

    const listener = vi.fn();
    total.on(listener);

    total.dispose();

    count.set(2);
    expect(listener).not.toHaveBeenCalled();
  });

  it("should work with pause/resume", () => {
    const count = signal(1);
    const total = scanSignal(count, (sum, curr) => sum + curr, 0);

    expect(total()).toBe(1);

    total.pause();
    count.set(2);
    expect(total()).toBe(1); // Still old value (paused)

    total.resume();
    expect(total()).toBe(3); // Updated after resume
  });

  it("should track trend direction", () => {
    const price = signal(100);
    // Accumulator stores { prev, trend }
    const trendState = scanSignal(
      price,
      (acc, curr) => ({
        prev: curr,
        trend: curr > acc.prev ? "↑" : curr < acc.prev ? "↓" : "→",
      }),
      { prev: 100, trend: "→" as "↑" | "↓" | "→" }
    );
    const trend = trendState.map((s) => s.trend);

    expect(trend()).toBe("→"); // 100 === 100

    price.set(110);
    expect(trend()).toBe("↑"); // 110 > 100

    price.set(90);
    expect(trend()).toBe("↓"); // 90 < 110
    
    price.set(105);
    expect(trend()).toBe("↑"); // 105 > 90

    price.set(105);
    // Note: price hasn't changed (still 105), so scan doesn't recompute
    // trend() still returns "↑" from previous computation
    expect(trend()).toBe("↑");
  });

  it("should calculate moving average", () => {
    const value = signal(10);
    const movingAvg = scanSignal(
      value,
      (acc, curr) => {
        const newValues = [...acc.values, curr].slice(-3);
        const sum = newValues.reduce((a, b) => a + b, 0);
        return {
          values: newValues,
          avg: sum / newValues.length,
        };
      },
      { values: [] as number[], avg: 0 }
    );

    expect(movingAvg().avg).toBe(10);

    value.set(20);
    expect(movingAvg().avg).toBe(15); // (10 + 20) / 2

    value.set(30);
    expect(movingAvg().avg).toBe(20); // (10 + 20 + 30) / 3

    value.set(40);
    expect(movingAvg().avg).toBe(30); // (20 + 30 + 40) / 3
  });

  it("should handle errors in accumulator function", () => {
    const count = signal(1);
    const total = scanSignal(count, (sum, curr) => {
      if (curr > 10) throw new Error("Too large");
      return sum + curr;
    }, 0);

    expect(total()).toBe(1);

    count.set(15);
    expect(() => total()).toThrow("Too large");
  });

  it("should support lazy evaluation", () => {
    const count = signal(1);
    const accumulatorFn = vi.fn((sum: number, curr: number) => sum + curr);
    const total = scanSignal(count, accumulatorFn, 0);

    expect(accumulatorFn).not.toHaveBeenCalled();

    total();
    expect(accumulatorFn).toHaveBeenCalledTimes(1);
  });
});

