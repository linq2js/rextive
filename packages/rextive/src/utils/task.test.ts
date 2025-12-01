import { describe, it, expect } from "vitest";
import { type Task, TASK_TYPE, task } from "./task";

describe("task", () => {
  describe("task.loading() - factory", () => {
    it("should create loading task with promise", () => {
      const promise = Promise.resolve(42);
      const l = task.loading(promise);

      expect(l.status).toBe("loading");
      expect(l.promise).toBe(promise);
      expect(l.value).toBeUndefined();
      expect(l.error).toBeUndefined();
      expect(l.loading).toBe(true);
      expect(l[TASK_TYPE]).toBe(true);
    });

    it("should handle pending promise", async () => {
      let resolve: (value: number) => void;
      const promise = new Promise<number>((r) => {
        resolve = r;
      });
      const l = task.loading(promise);

      expect(l.status).toBe("loading");
      expect(l.value).toBeUndefined();

      // Resolve the promise
      resolve!(42);
      const result = await promise;
      expect(result).toBe(42);
    });

    it("should infer correct promise type", () => {
      const promise = Promise.resolve({ id: 1, name: "Alice" });
      const l = task.loading(promise);

      // Type should be LoadingTask<{ id: number; name: string }>
      expect(l.status).toBe("loading");
      // TypeScript should infer the correct type
    });
  });

  describe("task.success() - factory", () => {
    it("should create success task with data", () => {
      const data = { id: 1, name: "Alice" };
      const l = task.success(data);

      expect(l.status).toBe("success");
      expect(l.value).toEqual(data);
      expect(l.error).toBeUndefined();
      expect(l.loading).toBe(false);
      expect(l[TASK_TYPE]).toBe(true);
    });

    it("should create promise if not provided", () => {
      const data = 42;
      const l = task.success(data);

      expect(l.promise).toBeInstanceOf(Promise);
    });

    it("should use provided promise", async () => {
      const data = 42;
      const promise = Promise.resolve(data);
      const l = task.success(data, promise);

      expect(l.promise).toBe(promise);
      expect(await l.promise).toBe(42);
    });

    it("should handle complex data types", () => {
      const data = {
        id: 1,
        nested: { value: "test" },
        array: [1, 2, 3],
      };
      const l = task.success(data);

      expect(l.value).toEqual(data);
      expect(l.value?.nested.value).toBe("test");
    });

    it("should handle null and undefined data", () => {
      const successNull = task.success(null);
      expect(successNull.value).toBeNull();

      const successUndef = task.success(undefined);
      expect(successUndef.value).toBeUndefined();
    });

    it("should infer correct data type", () => {
      const l = task.success({ id: 1, name: "Alice" });

      // Type should be SuccessTask<{ id: number; name: string }>
      if (l.status === "success") {
        // TypeScript should know data type
        const id: number = l.value.id;
        const name: string = l.value.name;
        expect(id).toBe(1);
        expect(name).toBe("Alice");
      }
    });
  });

  describe("task.error() - factory", () => {
    it("should create error task with error", () => {
      const err = new Error("Failed");
      const l = task.error(err);

      expect(l.status).toBe("error");
      expect(l.error).toBe(err);
      expect(l.value).toBeUndefined();
      expect(l.loading).toBe(false);
      expect(l[TASK_TYPE]).toBe(true);
    });

    it("should create rejected promise if not provided", () => {
      const err = new Error("Failed");
      const l = task.error(err);

      expect(l.promise).toBeInstanceOf(Promise);
      // Should be rejected but caught internally
      return expect(l.promise).rejects.toBe(err);
    });

    it("should use provided promise", async () => {
      const err = new Error("Failed");
      const promise = Promise.reject(err);
      // Catch to prevent unhandled rejection
      promise.catch(() => {});

      const l = task.error(err, promise);

      expect(l.promise).toBe(promise);
      await expect(l.promise).rejects.toBe(err);
    });

    it("should handle different error types", () => {
      // Error object
      const errorObj = task.error(new Error("Error obj"));
      expect(errorObj.error).toBeInstanceOf(Error);

      // String error
      const errorStr = task.error("String error");
      expect(errorStr.error).toBe("String error");

      // Number error
      const errorNum = task.error(404);
      expect(errorNum.error).toBe(404);

      // Object error
      const errorCustom = task.error({ code: "NOT_FOUND" });
      expect(errorCustom.error).toEqual({ code: "NOT_FOUND" });
    });

    it("should not cause unhandled rejection warnings", () => {
      // Creating error task shouldn't cause unhandled rejection
      const l = task.error(new Error("Test"));

      // Promise rejection is caught internally
      expect(l.promise).toBeInstanceOf(Promise);
    });
  });

  describe("task.is() - type guard", () => {
    it("should identify loading task", () => {
      const l = task.loading(Promise.resolve(1));
      expect(task.is(l)).toBe(true);
    });

    it("should identify success task", () => {
      const l = task.success(42);
      expect(task.is(l)).toBe(true);
    });

    it("should identify error task", () => {
      const l = task.error(new Error());
      expect(task.is(l)).toBe(true);
    });

    it("should reject non-task values", () => {
      expect(task.is(null)).toBe(false);
      expect(task.is(undefined)).toBe(false);
      expect(task.is(42)).toBe(false);
      expect(task.is("string")).toBe(false);
      expect(task.is({})).toBe(false);
      expect(task.is([])).toBe(false);
      expect(task.is({ status: "success", data: 42 })).toBe(false);
    });

    it("should work with type narrowing", () => {
      const value: unknown = task.success({ id: 1, name: "Alice" });

      if (task.is<{ id: number; name: string }>(value)) {
        // TypeScript should know value is Task<{ id: number; name: string }>
        if (value.status === "success") {
          expect(value.value.id).toBe(1);
          expect(value.value.name).toBe("Alice");
        }
      }
    });
  });

  describe("type discrimination", () => {
    it("should narrow type based on status - loading", () => {
      const l: Task<number> = task.loading(Promise.resolve(42));

      if (l.status === "loading") {
        // TypeScript should know these are undefined
        expect(l.value).toBeUndefined();
        expect(l.error).toBeUndefined();
        expect(l.loading).toBe(true);
      }
    });

    it("should narrow type based on status - success", () => {
      const l: Task<number> = task.success(42);

      if (l.status === "success") {
        // TypeScript should know data exists and is number
        const value: number = l.value;
        expect(value).toBe(42);
        expect(l.error).toBeUndefined();
        expect(l.loading).toBe(false);
      }
    });

    it("should narrow type based on status - error", () => {
      const err = new Error("Failed");
      const l: Task<number> = task.error(err);

      if (l.status === "error") {
        // TypeScript should know error exists
        expect(l.error).toBe(err);
        expect(l.value).toBeUndefined();
        expect(l.loading).toBe(false);
      }
    });

    it("should work with switch statement", () => {
      const testTask = (t: Task<string>) => {
        switch (l.status) {
          case "loading":
            return "loading";
          case "success":
            return `success: ${l.value}`;
          case "error":
            return `error: ${l.error}`;
        }
      };

      expect(testTask(task.loading(Promise.resolve("test")))).toBe("loading");
      expect(testTask(task.success("hello"))).toBe("success: hello");
      expect(testTask(task.error("oops"))).toBe("error: oops");
    });
  });

  describe("promise integration", () => {
    it("should maintain promise reference in loading state", async () => {
      const promise = Promise.resolve(42);
      const l = task.loading(promise);

      expect(l.promise).toBe(promise);
      const result = await l.promise;
      expect(result).toBe(42);
    });

    it("should handle promise resolution", async () => {
      const promise = Promise.resolve({ id: 1, name: "Alice" });
      const l = task.loading(promise);

      const data = await l.promise;
      expect(data).toEqual({ id: 1, name: "Alice" });
    });

    it("should handle promise rejection", async () => {
      const error = new Error("Failed");
      const promise = Promise.reject(error);
      const l = task.loading(promise);

      await expect(l.promise).rejects.toBe(error);
    });

    it("should allow suspense integration by throwing promise", () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve(42), 100);
      });
      const l = task.loading(promise);

      // In React Suspense, you would throw the promise
      let thrownValue;
      try {
        if (l.status === "loading") {
          throw l.promise;
        }
      } catch (e) {
        thrownValue = e;
      }

      expect(thrownValue).toBe(promise);
    });
  });

  describe("TASK_TYPE symbol", () => {
    it("should be present on all task types", () => {
      const l1 = task.loading(Promise.resolve());
      const l2 = task.success(42);
      const l3 = task.error(new Error());

      expect(l1[TASK_TYPE]).toBe(true);
      expect(l2[TASK_TYPE]).toBe(true);
      expect(l3[TASK_TYPE]).toBe(true);
    });

    it("should be a unique symbol", () => {
      const obj = { [TASK_TYPE]: true };
      expect(TASK_TYPE.toString()).toContain("Symbol");
      expect(obj[TASK_TYPE]).toBe(true);
    });

    it("should not conflict with regular properties", () => {
      const l = task.success({
        status: "custom",
        data: "test",
      });

      expect(l.status).toBe("success");
      expect(l.value).toEqual({ status: "custom", data: "test" });
      expect(l[TASK_TYPE]).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle promises that never resolve", () => {
      const neverResolve = new Promise(() => {});
      const l = task.loading(neverResolve);

      expect(l.status).toBe("loading");
      expect(l.promise).toBe(neverResolve);
    });

    it("should handle immediately resolved promises", async () => {
      const promise = Promise.resolve("immediate");
      const l = task.loading(promise);

      expect(l.status).toBe("loading");
      const result = await l.promise;
      expect(result).toBe("immediate");
    });

    it("should handle empty objects and arrays", () => {
      const emptyObj = task.success({});
      expect(emptyObj.value).toEqual({});

      const emptyArr = task.success([]);
      expect(emptyArr.value).toEqual([]);
    });

    it("should handle boolean values", () => {
      const trueValue = task.success(true);
      expect(trueValue.value).toBe(true);

      const falseValue = task.success(false);
      expect(falseValue.value).toBe(false);
    });

    it("should handle zero and empty string", () => {
      const zero = task.success(0);
      expect(zero.value).toBe(0);

      const empty = task.success("");
      expect(empty.value).toBe("");
    });

    it("should handle generic type parameters correctly", () => {
      // Loading with specific type
      const loading = task.loading<User>(
        Promise.resolve({ id: 1, name: "Alice" })
      );
      expect(loading.status).toBe("loading");

      // Success with inferred type
      const success = task.success({ id: 1, name: "Bob" });
      expect(success.value.name).toBe("Bob");

      // Error with type parameter
      const error = task.error<User>(new Error("Failed"));
      expect(error.status).toBe("error");
    });
  });

  describe("real-world scenarios", () => {
    it("should model fetching user data", async () => {
      // Start with loading
      const userPromise = Promise.resolve({
        id: 1,
        name: "Alice",
        email: "alice@example.com",
      });
      const loading = task.loading(userPromise);
      expect(loading.status).toBe("loading");

      // Resolve to success
      const userData = await userPromise;
      const success = task.success(userData);
      expect(success.status).toBe("success");
      expect(success.value.name).toBe("Alice");
    });

    it("should model failed API calls", () => {
      const apiError = new Error("Network error");
      const l = task.error(apiError);

      expect(l.status).toBe("error");
      expect(l.error).toBeInstanceOf(Error);
      expect((l.error as Error).message).toBe("Network error");
    });

    it("should work with React-like render logic", () => {
      const renderTask = <T>(t: Task<T>) => {
        switch (l.status) {
          case "loading":
            return "Loading...";
          case "success":
            return `Success: ${JSON.stringify(l.value)}`;
          case "error":
            return `Error: ${l.error}`;
        }
      };

      expect(renderTask(task.loading(Promise.resolve(1)))).toBe("Loading...");
      expect(renderTask(task.success({ value: 42 }))).toBe(
        'Success: {"value":42}'
      );
      expect(renderTask(task.error("Failed"))).toBe("Error: Failed");
    });
  });

  describe("task.get() - promise cache", () => {
    it("should get or create task for promise", () => {
      const promise = Promise.resolve(42);
      const l1 = task.get(promise);
      const l2 = task.get(promise);

      expect(l1).toBe(l2); // Should return same instance
      expect(l1.status).toBe("loading");
      expect(l1.promise).toBe(promise);
    });

    it("should return cached task for same promise", () => {
      const promise1 = Promise.resolve(42);
      const promise2 = Promise.resolve(42); // Different promise instance

      const l1 = task.get(promise1);
      const l2 = task.get(promise1); // Same promise
      const l3 = task.get(promise2); // Different promise

      expect(l1).toBe(l2); // Should return same instance for same promise
      expect(l1).not.toBe(l3); // Different promises get different tasks
    });
  });

  describe("task.set() - promise cache", () => {
    it("should set and retrieve custom task for promise", () => {
      const promise = Promise.resolve(100);
      const customTask = task.success(100, promise);

      task.set(promise, customTask);
      const retrieved = task.get(promise);

      expect(retrieved).toBe(customTask);
      expect(retrieved.status).toBe("success");
      expect(retrieved.value).toBe(100);
    });

    it("should override existing task", () => {
      const promise = Promise.resolve(42);
      const task1 = task.get(promise);
      const task2 = task.success(42, promise);

      task.set(promise, task2);
      const retrieved = task.get(promise);

      expect(retrieved).toBe(task2);
      expect(retrieved).not.toBe(task1);
    });
  });

  describe("task() - value normalization", () => {
    it("should return existing task if already a task", () => {
      const l = task.success(42);
      const result = task.from(l);

      expect(result).toBe(l);
    });

    it("should wrap promises in loading task", () => {
      const promise = Promise.resolve(42);
      const result = task.from(promise);

      expect(result.status).toBe("loading");
      expect(result.promise).toBe(promise);
    });

    it("should cache tasks for object values", () => {
      const obj = { value: 42 };
      const l1 = task.from(obj);
      const l2 = task.from(obj);

      expect(l1).toBe(l2); // Should return same instance (cached)
      expect(l1.status).toBe("success");
      expect(l1.value).toBe(obj);
    });

    it("should cache tasks for function values", () => {
      const fn = () => 42;
      const l1 = task.from(fn);
      const l2 = task.from(fn);

      expect(l1).toBe(l2); // Should return same instance (cached)
      expect(l1.status).toBe("success");
      expect(l1.value).toBe(fn);
    });

    it("should not cache primitive values", () => {
      const l1 = task.from(42);
      const l2 = task.from(42);

      // Primitives are cheap to wrap, so no caching
      expect(l1.status).toBe("success");
      expect(l1.value).toBe(42);
      expect(l2.status).toBe("success");
      expect(l2.value).toBe(42);
    });

    it("should handle null values", () => {
      const l = task.from(null);
      expect(l.status).toBe("success");
      expect(l.value).toBe(null);
    });

    it("should wrap strings in success task", () => {
      const l = task.from("hello");
      expect(l.status).toBe("success");
      expect(l.value).toBe("hello");
    });

    it("should wrap numbers in success task", () => {
      const l = task.from(123);
      expect(l.status).toBe("success");
      expect(l.value).toBe(123);
    });
  });

  describe("task() with signals", () => {
    it("should extract value from signal containing primitive", async () => {
      // Import signal here to avoid circular dependency issues
      const { signal } = await import("../signal");

      const sig = signal(42);
      const l = task.from(sig);

      expect(l.status).toBe("success");
      expect(l.value).toBe(42);
    });

    it("should extract value from signal containing task", async () => {
      const { signal } = await import("../signal");

      const successTask = task.success({ id: 1, name: "Test" });
      const sig = signal(successTask);
      const l = task.from(sig);

      expect(l.status).toBe("success");
      expect(l.value).toEqual({ id: 1, name: "Test" });
    });

    it("should extract loading task from signal", async () => {
      const { signal } = await import("../signal");

      const promise = new Promise(() => {}); // Never resolves
      const loadingTask = task.loading(promise);
      const sig = signal(loadingTask);
      const l = task.from(sig);

      expect(l.status).toBe("loading");
    });
  });
});

// Helper type for tests
type User = {
  id: number;
  name: string;
  email?: string;
};
