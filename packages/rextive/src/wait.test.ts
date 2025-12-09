import { describe, it, expect } from "vitest";
import { wait, TimeoutError } from "./wait";
import { signal } from "./index";
import { task } from "./utils/task";

describe("wait", () => {
  describe("waitAll - Synchronous mode (Suspense)", () => {
    describe("Single awaitable", () => {
      it("should throw promise from loading promise", () => {
        const promise = new Promise(() => {}); // Never resolves
        expect(() => wait(promise)).toThrow(Promise);
      });

      it("should unwrap signal value", () => {
        const sig = signal(42);
        expect(wait(sig)).toBe(42);
      });
    });

    describe("Array of awaitables", () => {
      it("should throw combined promise when any loading", () => {
        const p1 = Promise.resolve(1);
        const p2 = new Promise(() => {}); // Never resolves
        const p3 = Promise.resolve(3);

        expect(() => wait([p1, p2, p3])).toThrow(Promise);
      });

      it("should handle signals in array", () => {
        const sig1 = signal(1);
        const sig2 = signal(2);

        expect(wait([sig1, sig2])).toEqual([1, 2]);
      });
    });

    describe("Record of awaitables", () => {
      it("should throw combined promise when any loading", () => {
        const p1 = Promise.resolve(1);
        const p2 = new Promise(() => {});

        expect(() => wait({ a: p1, b: p2 })).toThrow(Promise);
      });

      it("should handle signals in record", () => {
        const sig1 = signal(1);
        const sig2 = signal("two");

        expect(wait({ a: sig1, b: sig2 })).toEqual({ a: 1, b: "two" });
      });
    });
  });

  describe("wait.timeout", () => {
    it("should resolve before timeout", async () => {
      const promise = Promise.resolve(42);

      const result = await wait.timeout(promise, 1000);
      expect(result).toBe(42);
    });

    it("should reject with TimeoutError on timeout", async () => {
      const promise = new Promise(() => {}); // Never resolves

      await expect(wait.timeout(promise, 50)).rejects.toThrow(TimeoutError);
    });

    it("should use custom error message", async () => {
      const promise = new Promise(() => {});

      await expect(wait.timeout(promise, 50, "Custom timeout")).rejects.toThrow(
        "Custom timeout"
      );
    });

    it("should use custom error function", async () => {
      const promise = new Promise(() => {});
      const customError = () => new Error("Custom error");

      await expect(wait.timeout(promise, 50, customError)).rejects.toThrow(
        "Custom error"
      );
    });

    it("should timeout array of awaitables", async () => {
      const p1 = Promise.resolve(1);
      const p2 = new Promise(() => {});

      await expect(wait.timeout([p1, p2], 50)).rejects.toThrow(TimeoutError);
    });

    it("should timeout record of awaitables", async () => {
      const p1 = Promise.resolve(1);
      const p2 = new Promise(() => {});

      await expect(wait.timeout({ a: p1, b: p2 }, 50)).rejects.toThrow(
        TimeoutError
      );
    });

    it("should resolve array before timeout", async () => {
      const result = await wait.timeout(
        [Promise.resolve(1), Promise.resolve(2)],
        1000
      );

      expect(result).toEqual([1, 2]);
    });
  });

  describe("wait.delay", () => {
    it("should resolve after delay", async () => {
      const start = Date.now();
      await wait.delay(50);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some margin
    });

    it("should return undefined", async () => {
      const result = await wait.delay(10);
      expect(result).toBeUndefined();
    });
  });

  describe("TimeoutError", () => {
    it("should have correct name", () => {
      const error = new TimeoutError();
      expect(error.name).toBe("TimeoutError");
    });

    it("should have default message", () => {
      const error = new TimeoutError();
      expect(error.message).toBe("Operation timed out");
    });

    it("should accept custom message", () => {
      const error = new TimeoutError("Custom timeout message");
      expect(error.message).toBe("Custom timeout message");
    });

    it("should be instanceof Error", () => {
      const error = new TimeoutError();
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty array", () => {
      const result = wait([]);
      expect(result).toEqual([]);
    });

    it("should handle empty record", () => {
      const result = wait({});
      expect(result).toEqual({});
    });
  });

  describe("task.from integration", () => {
    it("should work with task.from for async state", async () => {
      const promise = Promise.resolve(42);
      const t = task.from(promise);

      expect(t.status).toBe("loading");
      expect(t.loading).toBe(true);

      await promise;
      // Need a tick for the handler to fire
      await Promise.resolve();

      const t2 = task.from(promise);
      expect(t2.status).toBe("success");
      expect(t2.value).toBe(42);
    });

    it("should handle rejected promise with task.from", async () => {
      const error = new Error("Failed");
      const promise = Promise.reject(error);

      // Prevent unhandled rejection
      promise.catch(() => {});

      const t = task.from(promise);
      expect(t.status).toBe("loading");

      await Promise.allSettled([promise]);
      // Need a tick for the handler to fire
      await Promise.resolve();

      const t2 = task.from(promise);
      expect(t2.status).toBe("error");
      expect(t2.error).toBe(error);
    });
  });
});
