import { describe, it, expect, vi } from "vitest";
import { defer } from "./defer";

describe("defer", () => {
  describe("async imports", () => {
    it("should defer loading until first property access", async () => {
      const importFn = vi.fn(() =>
        Promise.resolve({
          default: {
            value: 42,
            method: () => "result",
          },
        })
      );

      const proxy = defer(importFn);

      // Not loaded yet
      expect(importFn).not.toHaveBeenCalled();

      // First access triggers load
      const result = await proxy.method();

      expect(importFn).toHaveBeenCalledTimes(1);
      expect(result).toBe("result");
    });

    it("should cache the loaded module", async () => {
      const importFn = vi.fn(() =>
        Promise.resolve({
          default: {
            value: 42,
          },
        })
      );

      const proxy = defer(importFn);

      await proxy.value();
      await proxy.value();
      await proxy.value();

      // Should only load once
      expect(importFn).toHaveBeenCalledTimes(1);
    });

    it("should handle method calls with arguments", async () => {
      const add = vi.fn((a: number, b: number) => a + b);

      const proxy = defer(() =>
        Promise.resolve({
          default: { add },
        })
      );

      const result = await proxy.add(5, 3);

      expect(result).toBe(8);
      expect(add).toHaveBeenCalledWith(5, 3);
    });

    it("should handle property access", async () => {
      const proxy = defer(() =>
        Promise.resolve({
          default: {
            settings: { theme: "dark", version: "1.0" },
          },
        })
      );

      const settings = await proxy.settings();

      expect(settings).toEqual({ theme: "dark", version: "1.0" });
    });

    it("should handle nested objects", async () => {
      const proxy = defer(() =>
        Promise.resolve({
          default: {
            config: {
              api: { url: "https://api.example.com" },
            },
          },
        })
      );

      const config = await proxy.config();

      expect(config).toEqual({
        api: { url: "https://api.example.com" },
      });
    });

    it("should preserve this context for methods", async () => {
      const proxy = defer(() =>
        Promise.resolve({
          default: {
            name: "Service",
            getName(this: any) {
              return this.name;
            },
          },
        })
      );

      const result = await proxy.getName();

      expect(result).toBe("Service");
    });

    it("should cache proxy for same import function", async () => {
      const importFn = () =>
        Promise.resolve({
          default: { value: 42 },
        });

      const proxy1 = defer(importFn);
      const proxy2 = defer(importFn);

      // Should return the same proxy instance
      expect(proxy1).toBe(proxy2);
    });

    it("should handle errors in import", async () => {
      const proxy = defer(() =>
        Promise.reject(new Error("Import failed"))
      );

      await expect(proxy.method()).rejects.toThrow("Import failed");
    });
  });

  describe("sync imports", () => {
    it("should defer initialization until first property access", () => {
      const initFn = vi.fn(() => ({
        value: 42,
        method: () => "result",
      }));

      const proxy = defer(initFn);

      // Not initialized yet
      expect(initFn).not.toHaveBeenCalled();

      // First access triggers initialization
      const result = proxy.method();

      expect(initFn).toHaveBeenCalledTimes(1);
      expect(result).toBe("result");
    });

    it("should cache the initialized module", () => {
      const initFn = vi.fn(() => ({
        value: 42,
      }));

      const proxy = defer(initFn);

      proxy.value();
      proxy.value();
      proxy.value();

      // Should only initialize once
      expect(initFn).toHaveBeenCalledTimes(1);
    });

    it("should handle method calls with arguments", () => {
      const add = vi.fn((a: number, b: number) => a + b);

      const proxy = defer(() => ({ add }));

      const result = proxy.add(5, 3);

      expect(result).toBe(8);
      expect(add).toHaveBeenCalledWith(5, 3);
    });

    it("should handle property access", () => {
      const proxy = defer(() => ({
        settings: { theme: "dark", version: "1.0" },
      }));

      const settings = proxy.settings();

      expect(settings).toEqual({ theme: "dark", version: "1.0" });
    });

    it("should handle nested objects", () => {
      const proxy = defer(() => ({
        config: {
          api: { url: "https://api.example.com" },
        },
      }));

      const config = proxy.config();

      expect(config).toEqual({
        api: { url: "https://api.example.com" },
      });
    });

    it("should preserve this context for methods", () => {
      const proxy = defer(() => ({
        name: "Service",
        getName(this: any) {
          return this.name;
        },
      }));

      const result = proxy.getName();

      expect(result).toBe("Service");
    });

    it("should cache proxy for same init function", () => {
      const initFn = () => ({ value: 42 });

      const proxy1 = defer(initFn);
      const proxy2 = defer(initFn);

      // Should return the same proxy instance
      expect(proxy1).toBe(proxy2);
    });

    it("should return sync values, not promises", () => {
      const proxy = defer(() => ({
        value: 42,
        method: () => "result",
      }));

      const value = proxy.value();
      const result = proxy.method();

      // Should be sync values, not promises
      expect(value).toBe(42);
      expect(result).toBe("result");
      expect(value).not.toBeInstanceOf(Promise);
      expect(result).not.toBeInstanceOf(Promise);
    });
  });

  describe("mixed usage", () => {
    it("should handle different import functions independently", async () => {
      const asyncImport = vi.fn(() =>
        Promise.resolve({
          default: { value: "async" },
        })
      );

      const syncInit = vi.fn(() => ({
        value: "sync",
      }));

      const asyncProxy = defer(asyncImport);
      const syncProxy = defer(syncInit);

      const asyncResult = await asyncProxy.value();
      const syncResult = syncProxy.value();

      expect(asyncResult).toBe("async");
      expect(syncResult).toBe("sync");
      expect(asyncImport).toHaveBeenCalledTimes(1);
      expect(syncInit).toHaveBeenCalledTimes(1);
    });
  });

  describe("edge cases", () => {
    it("should handle empty objects", () => {
      const proxy = defer(() => ({}));

      const result = (proxy as any).nonExistent();

      expect(result).toBeUndefined();
    });

    it("should handle functions that return undefined properties", () => {
      const proxy = defer(() => ({
        getValue: () => undefined,
      }));

      const result = proxy.getValue();

      expect(result).toBeUndefined();
    });

    it("should handle methods returning null", () => {
      const proxy = defer(() => ({
        getNull: () => null,
      }));

      const result = proxy.getNull();

      expect(result).toBeNull();
    });

    it("should handle boolean properties", () => {
      const proxy = defer(() => ({
        enabled: true,
        disabled: false,
      }));

      expect(proxy.enabled()).toBe(true);
      expect(proxy.disabled()).toBe(false);
    });

    it("should handle array properties", () => {
      const proxy = defer(() => ({
        items: [1, 2, 3],
      }));

      const items = proxy.items();

      expect(items).toEqual([1, 2, 3]);
    });

    it("should handle methods with no arguments", () => {
      const proxy = defer(() => ({
        getRandom: () => Math.random(),
      }));

      const result = proxy.getRandom();

      expect(typeof result).toBe("number");
    });

    it("should handle async methods in sync proxy", async () => {
      const proxy = defer(() => ({
        asyncMethod: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return "done";
        },
      }));

      const resultPromise = proxy.asyncMethod();

      // Should return a Promise
      expect(resultPromise).toBeInstanceOf(Promise);

      const result = await resultPromise;
      expect(result).toBe("done");
    });
  });
});

