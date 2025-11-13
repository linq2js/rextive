import { describe, it, expect, vi } from "vitest";
import { action } from "./action";

describe("action", () => {
  describe("basic functionality", () => {
    it("should create an action from a sync function", () => {
      const increment = action((x: number) => x + 1);

      expect(increment.status).toBe("idle");
      expect(increment.result).toBeUndefined();
      expect(increment.error).toBeUndefined();
      expect(increment.calls).toBe(0);

      const result = increment(5);
      expect(result).toBe(6);
      expect(increment.status).toBe("success");
      expect(increment.result).toBe(6);
      expect(increment.calls).toBe(1);
    });

    it("should create an action from an async function", async () => {
      const fetchData = action(async (id: number) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return `data-${id}`;
      });

      expect(fetchData.status).toBe("idle");

      const promise = fetchData(123);
      expect(fetchData.status).toBe("loading");
      expect(fetchData.result).toBeUndefined();
      expect(fetchData.calls).toBe(1);

      const result = await promise;
      expect(result).toBe("data-123");
      expect(fetchData.status).toBe("success");
      expect(fetchData.result).toBe("data-123");
    });

    it("should handle sync errors", () => {
      const throwError = action(() => {
        throw new Error("sync error");
      });

      expect(() => throwError()).toThrow("sync error");
      expect(throwError.status).toBe("error");
      expect(throwError.error).toBeInstanceOf(Error);
      expect((throwError.error as Error).message).toBe("sync error");
    });

    it("should handle async errors", async () => {
      const fetchError = action(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error("async error");
      });

      const promise = fetchError();
      expect(fetchError.status).toBe("loading");

      await expect(promise).rejects.toThrow("async error");
      expect(fetchError.status).toBe("error");
      expect(fetchError.error).toBeInstanceOf(Error);
      expect((fetchError.error as Error).message).toBe("async error");
    });

    it("should track number of calls", () => {
      const increment = action((x: number) => x + 1);

      expect(increment.calls).toBe(0);
      increment(1);
      expect(increment.calls).toBe(1);
      increment(2);
      expect(increment.calls).toBe(2);
      increment(3);
      expect(increment.calls).toBe(3);
    });

    it("should reset action state", async () => {
      const fetchData = action(async (id: number) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return `data-${id}`;
      });

      await fetchData(1);
      expect(fetchData.status).toBe("success");
      expect(fetchData.result).toBe("data-1");
      expect(fetchData.calls).toBe(1);

      fetchData.reset();
      expect(fetchData.status).toBe("idle");
      expect(fetchData.result).toBeUndefined();
      expect(fetchData.calls).toBe(0);
    });
  });

  describe("event callbacks", () => {
    it("should call init callback before execution", () => {
      const initSpy = vi.fn();
      const increment = action((x: number) => x + 1, {
        on: { init: initSpy },
      });

      increment(5);
      expect(initSpy).toHaveBeenCalledTimes(1);

      increment(10);
      expect(initSpy).toHaveBeenCalledTimes(2);
    });

    it("should call success callback for sync actions", () => {
      const successSpy = vi.fn();
      const increment = action((x: number) => x + 1, {
        on: { success: successSpy },
      });

      increment(5);
      expect(successSpy).toHaveBeenCalledWith(6);
    });

    it("should call success callback for async actions", async () => {
      const successSpy = vi.fn();
      const fetchData = action(
        async (id: number) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return `data-${id}`;
        },
        { on: { success: successSpy } }
      );

      await fetchData(123);
      expect(successSpy).toHaveBeenCalledWith("data-123");
    });

    it("should call error callback for sync errors", () => {
      const errorSpy = vi.fn();
      const throwError = action(
        () => {
          throw new Error("sync error");
        },
        { on: { error: errorSpy } }
      );

      expect(() => throwError()).toThrow("sync error");
      expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
      expect(errorSpy.mock.calls[0][0].message).toBe("sync error");
    });

    it("should call error callback for async errors", async () => {
      const errorSpy = vi.fn();
      const fetchError = action(
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          throw new Error("async error");
        },
        { on: { error: errorSpy } }
      );

      await expect(fetchError()).rejects.toThrow("async error");
      expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
      expect(errorSpy.mock.calls[0][0].message).toBe("async error");
    });

    it("should call loading callback for async actions", () => {
      const loadingSpy = vi.fn();
      const fetchData = action(
        async (id: number) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return `data-${id}`;
        },
        { on: { loading: loadingSpy } }
      );

      fetchData(123);
      expect(loadingSpy).toHaveBeenCalledTimes(1);
    });

    it("should call done callback with undefined error on success", async () => {
      const doneSpy = vi.fn();
      const fetchData = action(
        async (id: number) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return `data-${id}`;
        },
        { on: { done: doneSpy } }
      );

      await fetchData(123);
      expect(doneSpy).toHaveBeenCalledWith(undefined, "data-123");
    });

    it("should call done callback with error on failure", async () => {
      const doneSpy = vi.fn();
      const fetchError = action(
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          throw new Error("async error");
        },
        { on: { done: doneSpy } }
      );

      await expect(fetchError()).rejects.toThrow("async error");
      expect(doneSpy).toHaveBeenCalledWith(expect.any(Error), undefined);
    });

    it("should call reset callback when reset() is called", async () => {
      const resetSpy = vi.fn();
      const fetchData = action(
        async (id: number) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return `data-${id}`;
        },
        { on: { reset: resetSpy } }
      );

      await fetchData(1);
      fetchData.reset();
      expect(resetSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("concurrent calls", () => {
    it("should ignore results from stale calls", async () => {
      let resolvers: Array<(value: string) => void> = [];

      const fetchData = action(async (id: number) => {
        return new Promise<string>((resolve) => {
          resolvers.push((value) => resolve(value));
        });
      });

      const promise1 = fetchData(1);
      const promise2 = fetchData(2);

      // Resolve the second call first
      resolvers[1]("data-2");
      await promise2;
      expect(fetchData.result).toBe("data-2");

      // Resolve the first call (should be ignored)
      resolvers[0]("data-1");
      await promise1;
      expect(fetchData.result).toBe("data-2"); // Still data-2, not data-1
    });

    it("should ignore errors from stale calls", async () => {
      let resolvers: Array<{
        resolve: (value: string) => void;
        reject: (error: Error) => void;
      }> = [];

      const fetchData = action(async (id: number) => {
        return new Promise<string>((resolve, reject) => {
          resolvers.push({ resolve, reject });
        });
      });

      const promise1 = fetchData(1);
      const promise2 = fetchData(2);

      // Resolve the second call
      resolvers[1].resolve("data-2");
      await promise2;
      expect(fetchData.status).toBe("success");
      expect(fetchData.result).toBe("data-2");

      // Reject the first call (should be ignored)
      resolvers[0].reject(new Error("stale error"));
      await expect(promise1).rejects.toThrow("stale error");

      // Status should still be success from the second call
      expect(fetchData.status).toBe("success");
      expect(fetchData.result).toBe("data-2");
    });
  });

  describe("with multiple arguments", () => {
    it("should handle multiple arguments correctly", () => {
      const add = action((a: number, b: number, c: number) => a + b + c);

      const result = add(1, 2, 3);
      expect(result).toBe(6);
      expect(add.result).toBe(6);
    });

    it("should handle async actions with multiple arguments", async () => {
      const concat = action(async (a: string, b: string, c: string) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return `${a}-${b}-${c}`;
      });

      const result = await concat("hello", "world", "test");
      expect(result).toBe("hello-world-test");
      expect(concat.result).toBe("hello-world-test");
    });
  });
});
