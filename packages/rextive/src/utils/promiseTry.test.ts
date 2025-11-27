import { describe, it, expect } from "vitest";
import { promiseTry } from "./promiseTry";

describe("promiseTry", () => {
  describe("sync values", () => {
    it("should resolve sync value to promise", async () => {
      const result = await promiseTry(() => 42);
      expect(result).toBe(42);
    });

    it("should resolve sync object to promise", async () => {
      const obj = { foo: "bar" };
      const result = await promiseTry(() => obj);
      expect(result).toBe(obj);
    });

    it("should resolve sync null to promise", async () => {
      const result = await promiseTry(() => null);
      expect(result).toBeNull();
    });

    it("should resolve sync undefined to promise", async () => {
      const result = await promiseTry(() => undefined);
      expect(result).toBeUndefined();
    });
  });

  describe("sync errors", () => {
    it("should convert sync error to rejected promise", async () => {
      const error = new Error("sync error");
      await expect(promiseTry(() => { throw error; })).rejects.toBe(error);
    });

    it("should convert sync string throw to rejected promise", async () => {
      await expect(promiseTry(() => { throw "string error"; })).rejects.toBe("string error");
    });
  });

  describe("async values", () => {
    it("should passthrough resolved promise", async () => {
      const result = await promiseTry(() => Promise.resolve(42));
      expect(result).toBe(42);
    });

    it("should passthrough rejected promise", async () => {
      const error = new Error("async error");
      await expect(promiseTry(() => Promise.reject(error))).rejects.toBe(error);
    });

    it("should handle async function", async () => {
      const result = await promiseTry(async () => {
        await Promise.resolve();
        return "async result";
      });
      expect(result).toBe("async result");
    });

    it("should handle async function error", async () => {
      const error = new Error("async throw");
      await expect(promiseTry(async () => {
        throw error;
      })).rejects.toBe(error);
    });
  });

  describe("edge cases", () => {
    it("should handle function returning thenable", async () => {
      const thenable = {
        then(resolve: (value: number) => void) {
          resolve(42);
        },
      };
      const result = await promiseTry(() => thenable as Promise<number>);
      expect(result).toBe(42);
    });

    it("should preserve promise identity for async functions", () => {
      const originalPromise = Promise.resolve(42);
      const result = promiseTry(() => originalPromise);
      // Promise.resolve returns same promise if input is already a promise
      expect(result).toBe(originalPromise);
    });
  });
});

