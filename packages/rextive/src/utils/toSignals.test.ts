import { describe, it, expect, vi } from "vitest";
import { toSignals } from "./toSignals";
import { signal } from "../signal";
import { select } from "../operators";

describe("toSignals", () => {
  it("should return source when no operators provided", () => {
    const source = signal(5);
    const result = toSignals(source, []);

    expect(result).toBe(source);
  });

  it("should apply single operator", () => {
    const source = signal(5);
    const result = toSignals(source, [(s) => select((x: number) => x * 2)(s)]);

    expect(result()).toBe(10);
  });

  it("should chain multiple operators", () => {
    const source = signal(5);
    const result = toSignals(source, [
      (s) => select((x: number) => x * 2)(s),
      (s) => select((x: number) => x + 1)(s),
      (s) => select((x: number) => `Value: ${x}`)(s),
    ]);

    expect(result()).toBe("Value: 11");
  });

  it("should track and dispose intermediate signals", () => {
    const source = signal(5);
    const intermediate1Spy = vi.fn();
    const intermediate2Spy = vi.fn();

    const trackDispose = (s: any, spy: any) => {
      const originalDispose = s.dispose;
      s.dispose = () => {
        spy();
        originalDispose.call(s);
      };
      return s;
    };

    const result = toSignals(source, [
      (s) => trackDispose(select((x: number) => x * 2)(s), intermediate1Spy),
      (s) => trackDispose(select((x: number) => x + 1)(s), intermediate2Spy),
      (s) => select((x: number) => `Value: ${x}`)(s),
    ]);

    expect(result()).toBe("Value: 11");

    // Dispose the result
    result.dispose();

    // All intermediates should be disposed
    expect(intermediate1Spy).toHaveBeenCalledTimes(1);
    expect(intermediate2Spy).toHaveBeenCalledTimes(1);
  });

  it("should not wrap dispose when no intermediates created", () => {
    const source = signal(5);
    const originalDispose = source.dispose;

    // Single operator that returns the same signal
    const result = toSignals(source, [(s) => s]);

    // Should return the source as-is
    expect(result).toBe(source);
    expect(result.dispose).toBe(originalDispose);
  });

  it("should handle operators that return the same signal", () => {
    const source = signal(5);

    const result = toSignals(source, [
      (s) => {
        // Side effect but returns same signal
        s.on(() => console.log("changed"));
        return s;
      },
      (s) => select((x: number) => x * 2)(s),
    ]);

    expect(result()).toBe(10);
  });

  it("should handle mixed operators (some return same, some create new)", () => {
    const source = signal(5);
    const spy = vi.fn();

    const trackDispose = (s: any, spy: any) => {
      const originalDispose = s.dispose;
      s.dispose = () => {
        spy();
        originalDispose.call(s);
      };
      return s;
    };

    const result = toSignals(source, [
      (s) => s, // Returns same
      (s) => trackDispose(select((x: number) => x * 2)(s), spy), // Creates new
      (s) => s, // Returns same
      (s) => select((x: number) => x + 1)(s), // Creates new
    ]);

    expect(result()).toBe(11);

    result.dispose();

    // Only the intermediate that was created should be disposed
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should safely handle signals without dispose method", () => {
    const source = signal(5);

    // Create a mock operator that returns an object without dispose
    const result = toSignals(source, [
      (s) => select((x: number) => x * 2)(s),
      (s) => ({ ...s, dispose: undefined }), // Remove dispose
    ]);

    // Should not throw when disposing
    expect(() => result.dispose?.()).not.toThrow();
  });
});

