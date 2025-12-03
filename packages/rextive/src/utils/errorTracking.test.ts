import { describe, it, expect, vi } from "vitest";
import { trackAsync, addErrorTrace, getErrorTrace } from "./errorTracking";

describe("trackAsync", () => {
  it("should not call onSettled for non-promise values", () => {
    const onSettled = vi.fn();

    trackAsync(() => 42, onSettled);

    expect(onSettled).not.toHaveBeenCalled();
  });

  it("should not call onSettled for undefined", () => {
    const onSettled = vi.fn();

    trackAsync(() => undefined, onSettled);

    expect(onSettled).not.toHaveBeenCalled();
  });

  it("should call onSettled when promise resolves", async () => {
    const onSettled = vi.fn();
    const resolvedPromise = Promise.resolve(42);

    trackAsync(() => resolvedPromise, onSettled);

    // Wait for promise to resolve
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it("should call onSettled when promise rejects", async () => {
    const onSettled = vi.fn();
    const error = new Error("test error");
    const rejectedPromise = Promise.reject(error);

    trackAsync(() => rejectedPromise, onSettled);

    // Wait for promise to reject
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it("should not call onSettled if value has changed (stale resolve)", async () => {
    const onSettled = vi.fn();
    const originalPromise = Promise.resolve(42);
    let current: Promise<number> | undefined = originalPromise;

    trackAsync(() => current, onSettled);

    // Simulate refresh - value changes before promise settles
    current = Promise.resolve(100);

    // Wait for original promise to resolve
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Should not call onSettled because value has changed
    expect(onSettled).not.toHaveBeenCalled();
  });

  it("should not call onSettled if value has changed (stale reject)", async () => {
    const onSettled = vi.fn();
    const error = new Error("test error");
    const rejectedPromise = Promise.reject(error);
    let current: Promise<any> | undefined = rejectedPromise;

    trackAsync(() => current, onSettled);

    // Simulate refresh - value changes before promise settles
    current = Promise.resolve("new value");

    // Wait for original promise to reject
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Should not call onSettled because value has changed
    expect(onSettled).not.toHaveBeenCalled();
  });

  it("should call onSettled if value is same reference", async () => {
    const onSettled = vi.fn();
    const promise = Promise.resolve(42);

    trackAsync(() => promise, onSettled);

    // Wait for promise to resolve
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Should call onSettled because value is same reference
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it("should handle promise-like objects (resolve)", async () => {
    const onSettled = vi.fn();

    // Create a promise-like object (thenable) that resolves
    const thenable = {
      then(onResolve: any) {
        setTimeout(() => onResolve(42), 0);
        return this;
      },
    };

    trackAsync(() => thenable, onSettled);

    // Wait for thenable to resolve
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it("should handle promise-like objects (reject)", async () => {
    const onSettled = vi.fn();
    const error = new Error("test error");

    // Create a promise-like object (thenable) that rejects
    const thenable = {
      then(_onResolve: any, onReject: any) {
        setTimeout(() => onReject(error), 0);
        return this;
      },
    };

    trackAsync(() => thenable, onSettled);

    // Wait for thenable to reject
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(onSettled).toHaveBeenCalledTimes(1);
  });
});

describe("error tracing", () => {
  describe("addErrorTrace", () => {
    it("should add trace info to error object", () => {
      const error = new Error("test");
      addErrorTrace(error, {
        signal: "count",
        when: "compute:initial",
        async: false,
      });

      const traces = getErrorTrace(error);
      expect(traces).toBeDefined();
      expect(traces).toHaveLength(1);
      expect(traces![0].signal).toBe("count");
      expect(traces![0].when).toBe("compute:initial");
      expect(traces![0].async).toBe(false);
      expect(traces![0].timestamp).toBeGreaterThan(0);
    });

    it("should accumulate multiple traces for same error", () => {
      const error = new Error("propagating error");

      addErrorTrace(error, {
        signal: "source",
        when: "compute:initial",
        async: true,
      });
      addErrorTrace(error, {
        signal: "middle",
        when: "compute:dependency",
        async: false,
      });
      addErrorTrace(error, {
        signal: "final",
        when: "compute:dependency",
        async: false,
      });

      const traces = getErrorTrace(error);
      expect(traces).toHaveLength(3);
      expect(traces!.map((t) => t.signal)).toEqual([
        "source",
        "middle",
        "final",
      ]);
    });

    it("should ignore primitive errors", () => {
      const stringError = "string error";
      const numberError = 42;

      addErrorTrace(stringError as any, {
        signal: "test",
        when: "compute:initial",
        async: false,
      });
      addErrorTrace(numberError as any, {
        signal: "test",
        when: "compute:initial",
        async: false,
      });

      expect(getErrorTrace(stringError as any)).toBeUndefined();
      expect(getErrorTrace(numberError as any)).toBeUndefined();
    });

    it("should ignore null", () => {
      addErrorTrace(null, {
        signal: "test",
        when: "compute:initial",
        async: false,
      });
      expect(getErrorTrace(null)).toBeUndefined();
    });
  });

  describe("getErrorTrace", () => {
    it("should return undefined for error without traces", () => {
      const error = new Error("no traces");
      expect(getErrorTrace(error)).toBeUndefined();
    });

    it("should return undefined for non-object", () => {
      expect(getErrorTrace("string")).toBeUndefined();
      expect(getErrorTrace(123)).toBeUndefined();
      expect(getErrorTrace(null)).toBeUndefined();
      expect(getErrorTrace(undefined)).toBeUndefined();
    });

    it("should return traces in order they were added", () => {
      const error = new Error("ordered");

      addErrorTrace(error, {
        signal: "first",
        when: "compute:initial",
        async: true,
      });

      // Small delay to ensure different timestamps
      const traces1 = getErrorTrace(error);
      expect(traces1![0].signal).toBe("first");

      addErrorTrace(error, {
        signal: "second",
        when: "compute:dependency",
        async: false,
      });

      const traces2 = getErrorTrace(error);
      expect(traces2![0].signal).toBe("first");
      expect(traces2![1].signal).toBe("second");
      expect(traces2![1].timestamp).toBeGreaterThanOrEqual(
        traces2![0].timestamp
      );
    });
  });

  describe("error path example", () => {
    it("should build error path as error propagates through signals", () => {
      const originalError = new Error("database connection failed");

      // Simulate error propagating through signal dependency chain:
      // dbConnection → userService → dashboard

      addErrorTrace(originalError, {
        signal: "dbConnection",
        when: "compute:initial",
        async: true,
      });
      addErrorTrace(originalError, {
        signal: "userService",
        when: "compute:dependency",
        async: false,
      });
      addErrorTrace(originalError, {
        signal: "dashboard",
        when: "compute:dependency",
        async: false,
      });

      const traces = getErrorTrace(originalError);
      expect(traces).toBeDefined();

      // Build error path from traces
      const errorPath = traces!.map((t) => t.signal).join(" → ");
      expect(errorPath).toBe("dbConnection → userService → dashboard");

      // First error was async (Promise rejection)
      expect(traces![0].async).toBe(true);

      // Subsequent errors were sync (dependency access)
      expect(traces![1].async).toBe(false);
      expect(traces![2].async).toBe(false);
    });
  });
});
