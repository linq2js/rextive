import { describe, it, expect, vi } from "vitest";
import {
  trackAsyncError,
  CurrentState,
  addErrorTrace,
  getErrorTrace,
} from "./errorTracking";

describe("trackAsyncError", () => {
  it("should not call onError for non-promise values", () => {
    const onError = vi.fn();
    const current: CurrentState = { value: 42 };

    trackAsyncError(() => current, onError);

    expect(onError).not.toHaveBeenCalled();
  });

  it("should not call onError for undefined current", () => {
    const onError = vi.fn();

    trackAsyncError(() => undefined, onError);

    expect(onError).not.toHaveBeenCalled();
  });

  it("should call onError when promise rejects", async () => {
    const onError = vi.fn();
    const error = new Error("test error");
    const rejectedPromise = Promise.reject(error);
    const current: CurrentState = { value: rejectedPromise };

    trackAsyncError(() => current, onError);

    // Wait for promise to reject
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onError).toHaveBeenCalledWith(error);
  });

  it("should not call onError when promise resolves", async () => {
    const onError = vi.fn();
    const resolvedPromise = Promise.resolve(42);
    const current: CurrentState = { value: resolvedPromise };

    trackAsyncError(() => current, onError);

    // Wait for promise to resolve
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onError).not.toHaveBeenCalled();
  });

  it("should not call onError if current has changed (stale)", async () => {
    const onError = vi.fn();
    const error = new Error("test error");
    const rejectedPromise = Promise.reject(error);
    let current: CurrentState | undefined = { value: rejectedPromise };

    trackAsyncError(() => current, onError);

    // Simulate refresh - current changes
    current = { value: Promise.resolve("new value") };

    // Wait for original promise to reject
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Should not call onError because current has changed
    expect(onError).not.toHaveBeenCalled();
  });

  it("should call onError if current is same reference", async () => {
    const onError = vi.fn();
    const error = new Error("test error");
    const rejectedPromise = Promise.reject(error);
    const current: CurrentState = { value: rejectedPromise };

    trackAsyncError(() => current, onError);

    // Wait for promise to reject
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Should call onError because current is same reference
    expect(onError).toHaveBeenCalledWith(error);
  });

  it("should handle promise-like objects", async () => {
    const onError = vi.fn();
    const error = new Error("test error");

    // Create a promise-like object (thenable)
    const thenable = {
      then(onResolve: any, onReject: any) {
        setTimeout(() => onReject(error), 0);
        return this;
      },
    };

    const current: CurrentState = { value: thenable };

    trackAsyncError(() => current, onError);

    // Wait for thenable to reject
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(onError).toHaveBeenCalledWith(error);
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
