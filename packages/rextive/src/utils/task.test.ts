import { describe, it, expect } from "vitest";
import { task } from "./task";
import { is } from "../is";
import { TASK_TYPE, type Task } from "../types";

describe("task", () => {
  describe("task.from() - value normalization", () => {
    it("should return existing task if already a task", async () => {
      const promise = Promise.resolve(42);
      const t1 = task.from(promise);

      await promise;
      const t2 = task.from(promise);

      // After resolution, should be success task
      expect(t2.status).toBe("success");
      expect(t2.value).toBe(42);
    });

    it("should wrap promises in loading task", () => {
      const promise = Promise.resolve(42);
      const result = task.from(promise);

      expect(result.status).toBe("loading");
      expect(result.promise).toBe(promise);
    });

    it("should update task when promise resolves", async () => {
      const promise = Promise.resolve(42);
      const t1 = task.from(promise);

      expect(t1.status).toBe("loading");

      await promise;
      const t2 = task.from(promise);

      expect(t2.status).toBe("success");
      expect(t2.value).toBe(42);
    });

    it("should update task when promise rejects", async () => {
      const error = new Error("Failed");
      const promise = Promise.reject(error);

      // Prevent unhandled rejection
      promise.catch(() => {});

      const t1 = task.from(promise);
      expect(t1.status).toBe("loading");

      await Promise.allSettled([promise]);
      const t2 = task.from(promise);

      expect(t2.status).toBe("error");
      expect(t2.error).toBe(error);
    });

    it("should cache tasks for object values", () => {
      const obj = { value: 42 };
      const t1 = task.from(obj);
      const t2 = task.from(obj);

      expect(t1).toBe(t2); // Should return same instance (cached)
      expect(t1.status).toBe("success");
      expect(t1.value).toBe(obj);
    });

    it("should cache tasks for function values", () => {
      const fn = () => 42;
      const t1 = task.from(fn);
      const t2 = task.from(fn);

      expect(t1).toBe(t2); // Should return same instance (cached)
      expect(t1.status).toBe("success");
      expect(t1.value).toBe(fn);
    });

    it("should wrap primitives in success task", () => {
      const num = task.from(42);
      expect(num.status).toBe("success");
      expect(num.value).toBe(42);

      const str = task.from("hello");
      expect(str.status).toBe("success");
      expect(str.value).toBe("hello");

      const bool = task.from(true);
      expect(bool.status).toBe("success");
      expect(bool.value).toBe(true);
    });

    it("should handle null values", () => {
      const t = task.from(null);
      expect(t.status).toBe("success");
      expect(t.value).toBe(null);
    });
  });

  describe("task.get() - promise cache", () => {
    it("should get or create task for promise", () => {
      const promise = Promise.resolve(42);
      const t1 = task.get(promise);
      const t2 = task.get(promise);

      expect(t1).toBe(t2); // Should return same instance
      expect(t1.status).toBe("loading");
      expect(t1.promise).toBe(promise);
    });

    it("should return cached task for same promise", () => {
      const promise1 = Promise.resolve(42);
      const promise2 = Promise.resolve(42); // Different promise instance

      const t1 = task.get(promise1);
      const t2 = task.get(promise1); // Same promise
      const t3 = task.get(promise2); // Different promise

      expect(t1).toBe(t2); // Should return same instance for same promise
      expect(t1).not.toBe(t3); // Different promises get different tasks
    });

    it("should transition to success when promise resolves", async () => {
      const promise = Promise.resolve(42);
      const t1 = task.get(promise);

      expect(t1.status).toBe("loading");

      await promise;
      const t2 = task.get(promise);

      expect(t2.status).toBe("success");
      expect(t2.value).toBe(42);
    });

    it("should transition to error when promise rejects", async () => {
      const error = new Error("Failed");
      const promise = Promise.reject(error);

      // Prevent unhandled rejection
      promise.catch(() => {});

      const t1 = task.get(promise);
      expect(t1.status).toBe("loading");

      await Promise.allSettled([promise]);
      const t2 = task.get(promise);

      expect(t2.status).toBe("error");
      expect(t2.error).toBe(error);
    });
  });

  describe("task.set() - promise cache", () => {
    it("should set custom task for promise", async () => {
      const promise = Promise.resolve(100);

      // Manually create success-like object
      const customTask: Task<number> = {
        [TASK_TYPE]: true,
        status: "success",
        promise,
        value: 100,
        error: undefined,
        loading: false,
      };

      task.set(promise, customTask);
      const retrieved = task.get(promise);

      expect(retrieved).toBe(customTask);
      expect(retrieved.status).toBe("success");
      expect(retrieved.value).toBe(100);
    });
  });

  describe("is(value, 'task') - type guard", () => {
    it("should identify task from promise", () => {
      const t = task.from(Promise.resolve(1));
      expect(is(t, "task")).toBe(true);
    });

    it("should identify task from value", () => {
      const t = task.from(42);
      expect(is(t, "task")).toBe(true);
    });

    it("should reject non-task values", () => {
      expect(is(null, "task")).toBe(false);
      expect(is(undefined, "task")).toBe(false);
      expect(is(42, "task")).toBe(false);
      expect(is("string", "task")).toBe(false);
      expect(is({}, "task")).toBe(false);
      expect(is([], "task")).toBe(false);
      expect(is({ status: "success", data: 42 }, "task")).toBe(false);
    });

    it("should work with type narrowing", () => {
      const obj = { id: 1, name: "Alice" };
      const value: unknown = task.from(obj);

      if (is<{ id: number; name: string }>(value, "task")) {
        if (value.status === "success") {
          expect(value.value.id).toBe(1);
          expect(value.value.name).toBe("Alice");
        }
      }
    });
  });

  describe("type discrimination", () => {
    it("should narrow type based on status - loading", () => {
      const t: Task<number> = task.from(new Promise<number>(() => {}));

      if (t.status === "loading") {
        expect(t.value).toBeUndefined();
        expect(t.error).toBeUndefined();
        expect(t.loading).toBe(true);
      }
    });

    it("should narrow type based on status - success", () => {
      const t: Task<number> = task.from(42);

      if (t.status === "success") {
        const value: number = t.value;
        expect(value).toBe(42);
        expect(t.error).toBeUndefined();
        expect(t.loading).toBe(false);
      }
    });

    it("should work with switch statement", async () => {
      const testTask = (t: Task<string>) => {
        switch (t.status) {
          case "loading":
            return "loading";
          case "success":
            return `success: ${t.value}`;
          case "error":
            return `error: ${t.error}`;
        }
      };

      expect(testTask(task.from(new Promise<string>(() => {})))).toBe(
        "loading"
      );
      expect(testTask(task.from("hello"))).toBe("success: hello");

      // Create error task via rejected promise
      const errorPromise = Promise.reject("oops");
      errorPromise.catch(() => {}); // Prevent unhandled
      const loadingTask = task.from(errorPromise);
      await Promise.allSettled([errorPromise]);
      const errorTask = task.from(errorPromise);

      expect(testTask(errorTask)).toBe("error: oops");
    });
  });

  describe("promise integration", () => {
    it("should maintain promise reference in loading state", async () => {
      const promise = Promise.resolve(42);
      const t = task.from(promise);

      expect(t.promise).toBe(promise);
      const result = await t.promise;
      expect(result).toBe(42);
    });

    it("should allow suspense integration by throwing promise", () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve(42), 100);
      });
      const t = task.from(promise);

      let thrownValue;
      try {
        if (t.status === "loading") {
          throw t.promise;
        }
      } catch (e) {
        thrownValue = e;
      }

      expect(thrownValue).toBe(promise);
    });
  });

  describe("TASK_TYPE symbol", () => {
    it("should be present on all task types", async () => {
      const loadingTask = task.from(new Promise(() => {}));
      expect(loadingTask[TASK_TYPE]).toBe(true);

      const successTask = task.from(42);
      expect(successTask[TASK_TYPE]).toBe(true);

      const errorPromise = Promise.reject(new Error());
      errorPromise.catch(() => {});
      await Promise.allSettled([errorPromise]);
      const errorTask = task.from(errorPromise);
      expect(errorTask[TASK_TYPE]).toBe(true);
    });

    it("should be a unique symbol", () => {
      const obj = { [TASK_TYPE]: true };
      expect(TASK_TYPE.toString()).toContain("Symbol");
      expect(obj[TASK_TYPE]).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle promises that never resolve", () => {
      const neverResolve = new Promise(() => {});
      const t = task.from(neverResolve);

      expect(t.status).toBe("loading");
      expect(t.promise).toBe(neverResolve);
    });

    it("should handle immediately resolved promises", async () => {
      const promise = Promise.resolve("immediate");
      const t = task.from(promise);

      expect(t.status).toBe("loading");

      await promise;
      const t2 = task.from(promise);

      expect(t2.status).toBe("success");
      expect(t2.value).toBe("immediate");
    });

    it("should handle empty objects and arrays", () => {
      const emptyObj = task.from({});
      expect(emptyObj.value).toEqual({});

      const emptyArr = task.from([]);
      expect(emptyArr.value).toEqual([]);
    });

    it("should handle boolean values", () => {
      const trueValue = task.from(true);
      expect(trueValue.value).toBe(true);

      const falseValue = task.from(false);
      expect(falseValue.value).toBe(false);
    });

    it("should handle zero and empty string", () => {
      const zero = task.from(0);
      expect(zero.value).toBe(0);

      const empty = task.from("");
      expect(empty.value).toBe("");
    });
  });

  describe("task() with signals", () => {
    it("should extract value from signal containing primitive", async () => {
      const { signal } = await import("../signal");

      const sig = signal(42);
      const t = task.from(sig);

      expect(t.status).toBe("success");
      expect(t.value).toBe(42);
    });

    it("should extract loading task from signal with promise", async () => {
      const { signal } = await import("../signal");

      const promise = new Promise(() => {}); // Never resolves
      const sig = signal(promise);
      const t = task.from(sig);

      expect(t.status).toBe("loading");
    });
  });

  describe("task() - pipe operator with initial value", () => {
    it("should work with .pipe() and return task with value", async () => {
      const { signal } = await import("../signal");

      const asyncSignal = signal(async () => {
        return 42;
      });

      const taskSignal = asyncSignal.pipe(task(0));

      const result = taskSignal();
      expect(result.status).toBe("loading");
      expect(result.value).toBe(0); // Uses initial value on first load
      expect("value" in result).toBe(true);
    });

    it("should return task with value on success state", async () => {
      const { signal } = await import("../signal");

      const asyncSignal = signal(async () => 42);
      const taskSignal = asyncSignal.pipe(task(0));

      await asyncSignal();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const result = taskSignal();
      expect(result.status).toBe("success");
      expect(result.value).toBe(42);
    });

    it("should show previous value on refresh (stale-while-revalidate)", async () => {
      const { signal } = await import("../signal");

      let resolveValue = 42;
      const trigger = signal(0);

      const asyncSignal = signal({ trigger }, async () => {
        await new Promise((r) => setTimeout(r, 5));
        return resolveValue;
      });

      const taskSignal = asyncSignal.pipe(task(0));

      // Initial load
      let result = taskSignal();
      expect(result.status).toBe("loading");
      expect(result.value).toBe(0); // Initial value

      // Wait for first resolve
      await asyncSignal();
      await new Promise((resolve) => setTimeout(resolve, 50));
      result = taskSignal();
      expect(result.status).toBe("success");
      expect(result.value).toBe(42);

      // Trigger refresh
      resolveValue = 100;
      trigger.set(1);

      await new Promise((resolve) => setTimeout(resolve, 1));
      result = taskSignal();
      // During loading, value should still be available (stale-while-revalidate)
      expect(result.value).toBe(42); // Shows previous value
    });
  });
});
