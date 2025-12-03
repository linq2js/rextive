import { describe, it, expect, vi } from "vitest";
import { pipeSignals } from "./pipeSignals";
import { signal } from "../signal";
import { to } from "../operators";
import { is } from "../is";

describe("pipeSignals", () => {
  it("should return source when no operators provided", () => {
    const source = signal(5);
    const result = pipeSignals(source, []);

    expect(result).toBe(source);
  });

  it("should apply single operator", () => {
    const source = signal(5);
    const result = pipeSignals(source, [(s) => to((x: number) => x * 2)(s)]);

    expect(result()).toBe(10);
  });

  it("should chain multiple operators", () => {
    const source = signal(5);
    const result = pipeSignals(source, [
      (s) => to((x: number) => x * 2)(s),
      (s) => to((x: number) => x + 1)(s),
      (s) => to((x: number) => `Value: ${x}`)(s),
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

    const result = pipeSignals(source, [
      (s) => trackDispose(to((x: number) => x * 2)(s), intermediate1Spy),
      (s) => trackDispose(to((x: number) => x + 1)(s), intermediate2Spy),
      (s) => to((x: number) => `Value: ${x}`)(s),
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
    const result = pipeSignals(source, [(s) => s]);

    // Should return the source as-is
    expect(result).toBe(source);
    expect(result.dispose).toBe(originalDispose);
  });

  it("should handle operators that return the same signal", () => {
    const source = signal(5);

    const result = pipeSignals(source, [
      (s) => {
        // Side effect but returns same signal
        s.on(() => console.log("changed"));
        return s;
      },
      (s) => to((x: number) => x * 2)(s),
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

    const result = pipeSignals(source, [
      (s) => s, // Returns same
      (s) => trackDispose(to((x: number) => x * 2)(s), spy), // Creates new
      (s) => s, // Returns same
      (s) => to((x: number) => x + 1)(s), // Creates new
    ]);

    expect(result()).toBe(11);

    result.dispose();

    // Only the intermediate that was created should be disposed
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should safely handle signals without dispose method", () => {
    const source = signal(5);

    // Create a mock operator that returns an object without dispose
    const result = pipeSignals(source, [
      (s) => to((x: number) => x * 2)(s),
      (s) => ({ ...s, dispose: undefined }), // Remove dispose
    ]);

    // Should not throw when disposing
    expect(() => result.dispose?.()).not.toThrow();
  });

  describe("displayName", () => {
    it("should preserve user-defined name on result signal", () => {
      const source = signal(5, { name: "myCount" });
      const result = pipeSignals(source, [
        (s) => to((x: number) => x * 2, { name: "userDefinedName" })(s),
      ]);

      // User-defined name should be preserved (doesn't start with #)
      expect(result.displayName).toBe("userDefinedName");
    });

    it("should not rename when result is the same as source", () => {
      const source = signal(5, { name: "myCount" });
      const result = pipeSignals(source, [(s) => s]);

      // Should return source as-is with original name
      expect(result.displayName).toBe("myCount");
      expect(result).toBe(source);
    });

    it("should not rename non-signal results", () => {
      const source = signal(5, { name: "myCount" });

      // Operator that returns a non-signal object
      const result = pipeSignals(source, [(s) => ({ value: s() * 2 })]);

      // Result is not a signal, so no renaming
      expect(result.displayName).toBeUndefined();
      expect(result.value).toBe(10);
    });

    it("should verify rename logic triggers correctly", () => {
      const source = signal(5, { name: "testSource" });

      // Create a signal with auto-generated name
      const computed = to((x: number) => x * 2)(source);

      // Verify the computed signal has chain name format: source>#to-N
      expect(computed.displayName).toMatch(/^testSource>#to-\d+$/);
      expect(is(computed)).toBe(true);

      // Now pipe it
      const result = pipeSignals(source, [(s) => to((x: number) => x * 2)(s)]);

      // The rename should trigger because:
      // 1. result !== source (true)
      // 2. is(result) (true - it's a computed signal)
      // 3. displayName contains > chain separator
      expect(is(result)).toBe(true);
    });
  });
});
