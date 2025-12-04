import { describe, it, expect, vi, afterEach } from "vitest";
import { logic, LogicCreateError, NotImplementedError } from "./logic";
import { signal } from "./signal";
import { LOGIC_TYPE } from "./types";

describe("logic", () => {
  // Clear overrides and dispose tracked instances after each test
  afterEach(() => {
    logic.clear();
  });

  describe("basic functionality", () => {
    it("should create a logic with name and factory function", () => {
      const counter = logic("counter", () => {
        const count = signal(0);
        return { count };
      });

      expect(counter).toBeDefined();
      expect(typeof counter).toBe("function");
      expect(counter.create).toBeDefined();
      expect(counter.displayName).toBe("counter");
    });

    it("should have LOGIC_TYPE brand", () => {
      const counter = logic("counter", () => ({ value: 1 }));
      expect(counter[LOGIC_TYPE]).toBe(true);
    });

    it("should have displayName from first argument", () => {
      const counter = logic("myCounter", () => ({ value: 1 }));
      expect(counter.displayName).toBe("myCounter");
    });

    it("should return object with dispose method", () => {
      const counter = logic("counter", () => ({ value: 1 }));
      const instance = counter.create();

      expect(instance.value).toBe(1);
      expect(typeof instance.dispose).toBe("function");

      instance.dispose();
    });
  });

  describe("singleton behavior", () => {
    it("should return same instance on multiple calls", () => {
      const counter = logic("counter", () => {
        const count = signal(0);
        return { count };
      });

      const instance1 = counter();
      const instance2 = counter();

      expect(instance1).toBe(instance2);
    });

    it("should maintain state across calls", () => {
      const counter = logic("counter", () => {
        const count = signal(0);
        return { count };
      });

      const instance1 = counter();
      instance1.count.set(5);

      const instance2 = counter();
      expect(instance2.count()).toBe(5);
    });

    it("should create singleton lazily", () => {
      const factory = vi.fn(() => ({ value: 1 }));
      const lazy = logic("lazy", factory);

      expect(factory).not.toHaveBeenCalled();

      lazy();
      expect(factory).toHaveBeenCalledTimes(1);

      lazy();
      expect(factory).toHaveBeenCalledTimes(1); // Still 1
    });

    it("singleton persists", () => {
      const counter = logic("counter", () => {
        const count = signal(0);
        return { count };
      });

      const instance = counter();
      instance.count.set(100);

      // Singleton persists - same instance
      expect(counter().count()).toBe(100);
    });
  });

  describe("create() - instance creation", () => {
    it("should create new instance each time", () => {
      const counter = logic("counter", () => {
        const count = signal(0);
        return { count };
      });

      const instance1 = counter.create();
      const instance2 = counter.create();

      expect(instance1).not.toBe(instance2);

      instance1.dispose();
      instance2.dispose();
    });

    it("should have independent state per instance", () => {
      const counter = logic("counter", () => {
        const count = signal(0);
        return { count };
      });

      const instance1 = counter.create();
      const instance2 = counter.create();

      instance1.count.set(10);
      instance2.count.set(20);

      expect(instance1.count()).toBe(10);
      expect(instance2.count()).toBe(20);

      instance1.dispose();
      instance2.dispose();
    });

    it("should not affect singleton", () => {
      const counter = logic("counter", () => {
        const count = signal(0);
        return { count };
      });

      const singleton = counter();
      singleton.count.set(5);

      const instance = counter.create();
      expect(instance.count()).toBe(0); // Fresh instance

      instance.dispose();
    });
  });

  describe("logic.abstract() - abstract logics", () => {
    it("should create abstract logic that throws on property access", () => {
      type AuthProvider = {
        getToken: () => Promise<string>;
        logout: () => void;
      };

      const authProvider = logic.abstract<AuthProvider>("authProvider");

      // Can get instance without error
      const instance = authProvider();

      // Error only on property access
      expect(() => instance.getToken()).toThrow(NotImplementedError);
      expect(() => instance.getToken()).toThrow(
        '"authProvider.getToken" is not implemented'
      );
    });

    it("should include logic and property name in error", () => {
      type MyApi = {
        fetchData: (id: string) => Promise<any>;
      };

      const myApi = logic.abstract<MyApi>("myApi");
      const instance = myApi();

      try {
        instance.fetchData("123");
      } catch (e) {
        expect(e).toBeInstanceOf(NotImplementedError);
        expect((e as Error).message).toContain("myApi.fetchData");
        expect((e as Error).message).toContain("logic.provide(myApi");
      }
    });

    it("should work when overridden", () => {
      type AuthProvider = {
        getToken: () => string;
        refreshToken: () => void;
      };

      const authProvider = logic.abstract<AuthProvider>("authProvider");

      logic.provide(authProvider, () => ({
        getToken: () => "test-token",
        refreshToken: () => {},
      }));

      const instance = authProvider();

      expect(instance.getToken()).toBe("test-token");
      expect(() => instance.refreshToken()).not.toThrow();
    });

    it("should not have create() method", () => {
      type Config = { value: number };
      const config = logic.abstract<Config>("config");

      // AbstractLogic doesn't have create method
      expect((config as any).create).toBeUndefined();
    });

    it("should have LOGIC_TYPE brand", () => {
      const config = logic.abstract<{ value: number }>("config");
      expect(config[LOGIC_TYPE]).toBe(true);
    });

    it("should have displayName", () => {
      const config = logic.abstract<{ value: number }>("myConfig");
      expect(config.displayName).toBe("myConfig");
    });

    it("should allow dispose() without error", () => {
      const config = logic.abstract<{ value: number }>("config");
      const instance = config();

      // dispose() should not throw
      expect(() => instance.dispose()).not.toThrow();
    });

    it("should return same proxy instance (singleton)", () => {
      type Auth = { token: string };
      const auth = logic.abstract<Auth>("auth");

      const instance1 = auth();
      const instance2 = auth();

      // Should return same proxy instance
      expect(instance1).toBe(instance2);
    });

    it("should evaluate override on each property access (no caching)", () => {
      type Auth = { token: string };
      const auth = logic.abstract<Auth>("auth");

      // Get proxy first
      const proxy = auth();

      // Set first override
      logic.provide(auth, () => ({ token: "value-1" }));
      expect(proxy.token).toBe("value-1");

      // Change override - takes effect immediately on same instance!
      logic.provide(auth, () => ({ token: "value-2" }));
      expect(proxy.token).toBe("value-2");
    });

    it("should work when override is set AFTER first access", () => {
      type Auth = { token: string };
      const auth = logic.abstract<Auth>("auth");

      // Access first (returns proxy)
      const proxy = auth();
      expect(() => proxy.token).toThrow(NotImplementedError);

      // Then set override
      logic.provide(auth, () => ({ token: "later-token" }));

      // Same proxy now returns overridden value
      expect(proxy.token).toBe("later-token");
    });

    it("should call methods on overridden implementation", () => {
      type Calculator = {
        add: (a: number, b: number) => number;
        multiply: (a: number, b: number) => number;
      };

      const calculator = logic.abstract<Calculator>("calculator");
      const proxy = calculator();

      logic.provide(calculator, () => ({
        add: (a, b) => a + b,
        multiply: (a, b) => a * b,
      }));

      expect(proxy.add(2, 3)).toBe(5);
      expect(proxy.multiply(4, 5)).toBe(20);
    });

    it("should support dynamic overrides (different impl per call)", () => {
      type Config = { env: string };
      const config = logic.abstract<Config>("config");
      const proxy = config();

      let currentEnv = "dev";
      logic.provide(config, () => ({ env: currentEnv }));

      expect(proxy.env).toBe("dev");

      currentEnv = "prod";
      expect(proxy.env).toBe("prod"); // Dynamic!
    });

    it("should revert to throwing after logic.clear()", () => {
      type Api = { fetch: () => string };
      const api = logic.abstract<Api>("api");
      const proxy = api();

      logic.provide(api, () => ({ fetch: () => "data" }));
      expect(proxy.fetch()).toBe("data");

      logic.clear();

      // Now throws again
      expect(() => proxy.fetch()).toThrow(NotImplementedError);
    });

    it("should work with signals inside override", () => {
      type Store = {
        count: { (): number; set: (v: number) => void };
      };

      const store = logic.abstract<Store>("store");
      const proxy = store();

      const countSignal = signal(0);
      logic.provide(store, () => ({
        count: Object.assign(() => countSignal(), {
          set: (v: number) => countSignal.set(v),
        }),
      }));

      expect(proxy.count()).toBe(0);
      proxy.count.set(42);
      expect(proxy.count()).toBe(42);
    });
  });

  describe("singleton semantics with override", () => {
    it("regular logic with override should return same instance", () => {
      const counter = logic("counter", () => ({
        value: Math.random(), // Different each creation
      }));

      logic.provide(counter, () => ({ value: 42 }));

      const a = counter();
      const b = counter();

      // Should be same instance (singleton semantics)
      expect(a).toBe(b);
      expect(a.value).toBe(42);
    });

    it("should use original singleton in override", () => {
      const counter = logic("counter", () => ({
        base: 10,
      }));

      // Access singleton first
      const original = counter();
      expect(original.base).toBe(10);

      // Override using original
      logic.provide(counter, (getOriginal) => ({
        base: getOriginal().base + 5,
      }));

      const overridden = counter();
      expect(overridden.base).toBe(15);
    });

    it("logic.create() should work with AbstractLogic", () => {
      type Api = { fetch: () => string };
      const api = logic.abstract<Api>("api");

      // Without override - returns proxy
      const proxy = logic.create(api);
      expect(() => proxy.fetch()).toThrow(NotImplementedError);

      logic.clear();

      // With override - returns implementation
      logic.provide(api, () => ({ fetch: () => "data" }));
      const instance = logic.create(api);
      expect(instance.fetch()).toBe("data");
    });
  });

  describe("LogicCreateError - error wrapping", () => {
    it("should wrap errors during creation", () => {
      const failing = logic("failing", () => {
        throw new Error("Factory failed");
      });

      expect(() => failing.create()).toThrow(LogicCreateError);
      expect(() => failing.create()).toThrow(
        'Failed to create logic "failing"'
      );
    });

    it("should include original error message", () => {
      const failing = logic("myLogic", () => {
        throw new Error("Something went wrong");
      });

      try {
        failing.create();
      } catch (e) {
        expect(e).toBeInstanceOf(LogicCreateError);
        expect((e as LogicCreateError).cause).toBeInstanceOf(Error);
        expect((e as Error).message).toContain("Something went wrong");
      }
    });

    it("should wrap circular dependency errors", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let a: any, b: any;

      a = logic("a", () => {
        b();
        return { value: 1 };
      });

      b = logic("b", () => {
        a();
        return { value: 2 };
      });

      expect(() => a.create()).toThrow(LogicCreateError);
      expect(() => a.create()).toThrow("Circular dependency");
    });

    it("should not double-wrap LogicCreateError", () => {
      const inner = logic("inner", () => {
        throw new Error("Inner error");
      });

      const outer = logic("outer", () => {
        inner(); // This will throw LogicCreateError
        return { value: 1 };
      });

      try {
        outer.create();
      } catch (e) {
        // Inner's LogicCreateError should propagate without re-wrapping
        expect(e).toBeInstanceOf(LogicCreateError);
        // Should mention inner (the original error source)
        expect((e as Error).message).toContain("inner");
        // Should contain the original error message
        expect((e as Error).message).toContain("Inner error");
      }
    });
  });

  describe("global logic.provide() - dependency overrides", () => {
    it("should override dependency globally", () => {
      const settings = logic("settings", () => ({
        initialValue: 0,
        theme: "dark",
      }));

      const counter = logic("counter", () => {
        const { initialValue, theme } = settings();
        const count = signal(initialValue);
        return { count, theme };
      });

      logic.provide(settings, () => ({
        initialValue: 100,
        theme: "light",
      }));

      const instance = logic.create(counter);

      expect(instance.count()).toBe(100);
      expect(instance.theme).toBe("light");
    });

    it("should be chainable", () => {
      const dep1 = logic("dep1", () => ({ a: 1 }));
      const dep2 = logic("dep2", () => ({ b: 2 }));
      const main = logic("main", () => {
        const { a } = dep1();
        const { b } = dep2();
        return { a, b };
      });

      const result = logic
        .provide(dep1, () => ({ a: 10 }))
        .provide(dep2, () => ({ b: 20 }));

      expect(result).toBe(logic); // Returns logic for chaining

      const instance = logic.create(main);
      expect(instance.a).toBe(10);
      expect(instance.b).toBe(20);
    });

    it("should only affect new instances, not existing singleton", () => {
      const settings = logic("settings", () => ({ value: 1 }));
      const counter = logic("counter", () => {
        const { value } = settings();
        return { initialValue: value };
      });

      const singleton = counter();
      expect(singleton.initialValue).toBe(1);

      logic.provide(settings, () => ({ value: 999 }));

      // Existing singleton unchanged
      expect(singleton.initialValue).toBe(1);

      // New instances use override
      const newInstance = logic.create(counter);
      expect(newInstance.initialValue).toBe(999);
    });

    it("should support partial override with original", () => {
      const config = logic("config", () => ({
        host: "localhost",
        port: 3000,
        timeout: 5000,
      }));
      const consumer = logic("consumer", () => {
        const cfg = config();
        return { url: `http://${cfg.host}:${cfg.port}` };
      });

      // Partial override - only change port
      logic.provide(config, (original) => ({
        ...original(),
        port: 8080,
      }));

      const instance = logic.create(consumer);
      expect(instance.url).toBe("http://localhost:8080");
    });

    it("should work with nested dependencies", () => {
      const base = logic("base", () => ({ value: 1 }));
      const middle = logic("middle", () => {
        const { value } = base();
        return { doubled: value * 2 };
      });
      const top = logic("top", () => {
        const { doubled } = middle();
        return { result: doubled + 10 };
      });

      // Global override on base affects all
      logic.provide(base, () => ({ value: 50 }));

      const instance = logic.create(top);
      expect(instance.result).toBe(110); // (50 * 2) + 10
    });
  });

  describe("logic.clear() - cleanup", () => {
    it("should clear all global overrides", () => {
      const config = logic("config", () => ({ value: 1 }));
      const consumer = logic("consumer", () => {
        const { value } = config();
        return { result: value };
      });

      logic.provide(config, () => ({ value: 100 }));

      const instance1 = consumer.create();
      expect(instance1.result).toBe(100);
      instance1.dispose();

      // Clear global overrides
      logic.clear();

      const instance2 = consumer.create();
      expect(instance2.result).toBe(1); // Back to original
      instance2.dispose();
    });

    it("should apply to all consumers after clear", () => {
      const config = logic("config", () => ({ value: 1 }));
      const consumerA = logic("consumerA", () => {
        const { value } = config();
        return { result: value * 2 };
      });
      const consumerB = logic("consumerB", () => {
        const { value } = config();
        return { result: value + 10 };
      });

      logic.provide(config, () => ({ value: 100 }));

      const a1 = consumerA.create();
      const b1 = consumerB.create();
      expect(a1.result).toBe(200);
      expect(b1.result).toBe(110);
      a1.dispose();
      b1.dispose();

      logic.clear();

      const a2 = consumerA.create();
      const b2 = consumerB.create();
      expect(a2.result).toBe(2); // 1 * 2
      expect(b2.result).toBe(11); // 1 + 10
      a2.dispose();
      b2.dispose();
    });

    it("should dispose all tracked instances", () => {
      const counter = logic("counter", () => {
        const count = signal(0);
        return { count };
      });

      // Create tracked instances via logic.create()
      const instance1 = logic.create(counter);
      const instance2 = logic.create(counter);

      instance1.count.set(10);
      instance2.count.set(20);

      expect(instance1.count()).toBe(10);
      expect(instance2.count()).toBe(20);

      // Clear should dispose all tracked instances
      logic.clear();

      // Signals should be disposed
      expect(() => instance1.count.set(1)).toThrow();
      expect(() => instance2.count.set(1)).toThrow();
    });

    it("should not track instances created via myLogic.create()", () => {
      const counter = logic("counter", () => {
        const count = signal(0);
        return { count };
      });

      // Create untracked instance via myLogic.create()
      const untracked = counter.create();

      // Create tracked instance via logic.create()
      const tracked = logic.create(counter);

      logic.clear();

      // Tracked should be disposed
      expect(() => tracked.count.set(1)).toThrow();

      // Untracked should still work
      untracked.count.set(5);
      expect(untracked.count()).toBe(5);

      // Manual cleanup
      untracked.dispose();
    });

    it("should remove from tracking when manually disposed", () => {
      const counter = logic("counter", () => {
        const count = signal(0);
        return { count };
      });

      const instance = logic.create(counter);
      instance.count.set(10);

      // Manually dispose
      instance.dispose();

      // Should not throw on logic.clear()
      logic.clear();

      // Confirm it was disposed
      expect(() => instance.count.set(1)).toThrow();
    });
  });

  describe("circular dependency detection", () => {
    it("should detect direct circular dependency", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let a: any, b: any;

      a = logic("a", () => {
        b();
        return { value: 1 };
      });

      b = logic("b", () => {
        a();
        return { value: 2 };
      });

      expect(() => a.create()).toThrow(LogicCreateError);
      expect(() => a.create()).toThrow(/Circular dependency/);
    });

    it("should detect indirect circular dependency", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let a: any, b: any, c: any;

      a = logic("a", () => {
        b();
        return { value: 1 };
      });

      b = logic("b", () => {
        c();
        return { value: 2 };
      });

      c = logic("c", () => {
        a();
        return { value: 3 };
      });

      expect(() => a.create()).toThrow(LogicCreateError);
    });

    it("should include logic name in error message", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let selfRef: any;

      selfRef = logic("selfRef", () => {
        selfRef();
        return { value: 1 };
      });

      expect(() => selfRef.create()).toThrow("selfRef");
    });
  });

  describe("dispose behavior", () => {
    it("should dispose signals within instance", () => {
      const counter = logic("counter", () => {
        const count = signal(0);
        return { count };
      });

      const instance = counter.create();
      const countSignal = instance.count;

      instance.dispose();

      // Signal should be disposed
      expect(() => countSignal.set(1)).toThrow();
    });

    it("should not affect other instances when one is disposed", () => {
      const counter = logic("counter", () => {
        const count = signal(0);
        return { count };
      });

      const instance1 = counter.create();
      const instance2 = counter.create();

      instance1.count.set(10);
      instance2.count.set(20);

      instance1.dispose();

      // instance2 still works
      expect(instance2.count()).toBe(20);
      instance2.count.set(30);
      expect(instance2.count()).toBe(30);

      instance2.dispose();
    });

    it("should call custom dispose function on dispose", () => {
      const cleanupSpy = vi.fn();

      const myLogic = logic("myLogic", () => ({
        value: 1,
        dispose: cleanupSpy,
      }));

      const instance = myLogic.create();
      instance.dispose();

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe("nested logic creation", () => {
    it("should handle logic creating other logic instances", () => {
      const inner = logic("inner", () => ({ value: signal(42) }));

      const outer = logic("outer", () => {
        const innerInstance = inner.create();
        return {
          inner: innerInstance,
          getValue: () => innerInstance.value(),
        };
      });

      const outerInstance = outer.create();
      expect(outerInstance.getValue()).toBe(42);

      outerInstance.dispose();
    });
  });

  describe("test isolation patterns", () => {
    it("test 1: using logic.create() for tracked isolation", () => {
      const settings = logic("settings", () => ({
        apiUrl: "https://api.example.com",
      }));

      const api = logic("api", () => {
        const { apiUrl } = settings();
        return {
          fetch: () => `Fetching from ${apiUrl}`,
        };
      });

      const instance = logic.create(api);
      expect(instance.fetch()).toBe("Fetching from https://api.example.com");
    });

    it("test 2: using global override", () => {
      const settings = logic("settings", () => ({
        apiUrl: "https://api.example.com",
      }));

      const api = logic("api", () => {
        const { apiUrl } = settings();
        return {
          fetch: () => `Fetching from ${apiUrl}`,
        };
      });

      logic.provide(settings, () => ({ apiUrl: "http://localhost:3000" }));

      const instance = logic.create(api);
      expect(instance.fetch()).toBe("Fetching from http://localhost:3000");
    });

    it("test 3: should be isolated from test 2 (afterEach clears)", () => {
      const settings = logic("settings", () => ({
        apiUrl: "https://api.example.com",
      }));

      const api = logic("api", () => {
        const { apiUrl } = settings();
        return {
          fetch: () => `Fetching from ${apiUrl}`,
        };
      });

      // No override - afterEach cleared it
      const instance = logic.create(api);
      expect(instance.fetch()).toBe("Fetching from https://api.example.com");
    });
  });

  describe("with signals", () => {
    it("should work with signal-based state", () => {
      const counter = logic("counter", () => {
        const count = signal(0);
        const doubled = signal({ count }, ({ deps }) => deps.count * 2);

        return {
          count,
          doubled,
          increment: () => count.set((x) => x + 1),
          decrement: () => count.set((x) => x - 1),
        };
      });

      const instance = logic.create(counter);

      expect(instance.count()).toBe(0);
      expect(instance.doubled()).toBe(0);

      instance.increment();
      expect(instance.count()).toBe(1);
      expect(instance.doubled()).toBe(2);

      instance.increment();
      instance.increment();
      expect(instance.count()).toBe(3);
      expect(instance.doubled()).toBe(6);

      instance.decrement();
      expect(instance.count()).toBe(2);
      expect(instance.doubled()).toBe(4);
    });

    it("should dispose all signals on instance dispose", () => {
      const counter = logic("counter", () => {
        const count = signal(0);
        const doubled = signal({ count }, ({ deps }) => deps.count * 2);
        return { count, doubled };
      });

      const instance = logic.create(counter);
      const countRef = instance.count;
      const doubledRef = instance.doubled;

      instance.dispose();

      // Both signals should be disposed
      expect(() => countRef.set(1)).toThrow();
      expect(() => doubledRef()).toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle empty object return", () => {
      const empty = logic("empty", () => ({}));
      const instance = logic.create(empty);

      expect(instance).toEqual(expect.objectContaining({}));
      expect(typeof instance.dispose).toBe("function");
    });

    it("should handle logic with no dependencies", () => {
      const standalone = logic("standalone", () => ({
        value: 42,
        compute: (x: number) => x * 2,
      }));

      const instance = logic.create(standalone);
      expect(instance.value).toBe(42);
      expect(instance.compute(5)).toBe(10);
    });

    it("should handle async operations within logic", async () => {
      const asyncLogic = logic("asyncLogic", () => {
        const data = signal<string | null>(null);
        const loading = signal(false);

        const fetchData = async () => {
          loading.set(true);
          await new Promise((r) => setTimeout(r, 10));
          data.set("fetched");
          loading.set(false);
        };

        return { data, loading, fetchData };
      });

      const instance = logic.create(asyncLogic);

      expect(instance.data()).toBe(null);
      expect(instance.loading()).toBe(false);

      await instance.fetchData();

      expect(instance.data()).toBe("fetched");
      expect(instance.loading()).toBe(false);
    });
  });
});
