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
    it("should create abstract logic that throws on function invocation", () => {
      type AuthProvider = {
        getToken: () => Promise<string>;
        logout: () => void;
      };

      const authProvider = logic.abstract<AuthProvider>("authProvider");

      // Can get instance without error
      const instance = authProvider();

      // Can access function property without error (returns cached stub)
      expect(typeof instance.getToken).toBe("function");

      // Error only when function is INVOKED
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
      type Config = { getValue: () => number };
      const config = logic.abstract<Config>("config");

      // AbstractLogic doesn't have create method
      expect((config as any).create).toBeUndefined();
    });

    it("should have LOGIC_TYPE brand", () => {
      const config = logic.abstract<{ getValue: () => number }>("config");
      expect(config[LOGIC_TYPE]).toBe(true);
    });

    it("should have displayName", () => {
      const config = logic.abstract<{ getValue: () => number }>("myConfig");
      expect(config.displayName).toBe("myConfig");
    });

    it("should return same proxy instance (singleton)", () => {
      type Auth = { getToken: () => string };
      const auth = logic.abstract<Auth>("auth");

      const instance1 = auth();
      const instance2 = auth();

      // Should return same proxy instance
      expect(instance1).toBe(instance2);
    });

    it("should cache stub functions", () => {
      type Auth = { getToken: () => string };
      const auth = logic.abstract<Auth>("auth");
      const proxy = auth();

      // Access same property multiple times
      const stub1 = proxy.getToken;
      const stub2 = proxy.getToken;

      // Should return same cached stub function
      expect(stub1).toBe(stub2);
    });

    it("should evaluate override on function invocation (not on access)", () => {
      type Auth = { getToken: () => string };
      const auth = logic.abstract<Auth>("auth");

      // Get proxy first
      const proxy = auth();
      const stub = proxy.getToken; // Access stub

      // Set override
      logic.provide(auth, () => ({ getToken: () => "token-1" }));

      // Stub invocation should use override
      expect(stub()).toBe("token-1");

      // Change override - takes effect on invocation
      logic.provide(auth, () => ({ getToken: () => "token-2" }));
      expect(stub()).toBe("token-2");
    });

    it("should work when override is set AFTER first access", () => {
      type Auth = { getToken: () => string };
      const auth = logic.abstract<Auth>("auth");

      // Access first (returns proxy)
      const proxy = auth();
      expect(() => proxy.getToken()).toThrow(NotImplementedError);

      // Then set override
      logic.provide(auth, () => ({ getToken: () => "later-token" }));

      // Same stub now calls overridden function
      expect(proxy.getToken()).toBe("later-token");
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
      type Config = { getEnv: () => string };
      const config = logic.abstract<Config>("config");
      const proxy = config();

      let currentEnv = "dev";
      logic.provide(config, () => ({ getEnv: () => currentEnv }));

      expect(proxy.getEnv()).toBe("dev");

      currentEnv = "prod";
      expect(proxy.getEnv()).toBe("prod"); // Dynamic!
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

    it("should be readonly (throw on set)", () => {
      type Auth = { getToken: () => string };
      const auth = logic.abstract<Auth>("auth");
      const proxy = auth();

      expect(() => {
        (proxy as any).getToken = () => "hacked";
      }).toThrow(TypeError);
      expect(() => {
        (proxy as any).getToken = () => "hacked";
      }).toThrow('Cannot set property "getToken" on abstract logic "auth"');
    });

    it("should throw on delete property", () => {
      type Auth = { getToken: () => string };
      const auth = logic.abstract<Auth>("auth");
      const proxy = auth();

      expect(() => {
        delete (proxy as any).getToken;
      }).toThrow(TypeError);
    });

    it("should throw on define property", () => {
      type Auth = { getToken: () => string };
      const auth = logic.abstract<Auth>("auth");
      const proxy = auth();

      expect(() => {
        Object.defineProperty(proxy, "newProp", { value: 42 });
      }).toThrow(TypeError);
    });

    it("should only expose function properties from override", () => {
      type Mixed = {
        getValue: () => number;
        name: string; // Non-function, should be excluded
      };

      const mixed = logic.abstract<Mixed>("mixed");
      const proxy = mixed();

      logic.provide(mixed, () => ({
        getValue: () => 42,
        name: "test",
      }));

      // Function property works
      expect(proxy.getValue()).toBe(42);

      // Non-function property returns undefined (excluded from proxy)
      expect((proxy as any).name).toBeUndefined();
    });

    it("should return function keys only from ownKeys", () => {
      type Mixed = {
        getValue: () => number;
        name: string; // Non-function, should be excluded
      };

      const mixed = logic.abstract<Mixed>("mixed");
      const proxy = mixed();

      logic.provide(mixed, () => ({
        getValue: () => 42,
        name: "test",
      }));

      const keys = Object.keys(proxy);
      expect(keys).toContain("getValue");
      expect(keys).not.toContain("name");
    });
  });

  describe("override semantics", () => {
    it("regular logic with override should return consistent values", () => {
      const counter = logic("counter", () => ({
        value: Math.random(), // Different each creation
      }));

      logic.provide(counter, () => ({ value: 42 }));

      const a = counter();
      const b = counter();

      // Values should be consistent (resolver is called each time but returns same value)
      expect(a.value).toBe(42);
      expect(b.value).toBe(42);
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

      const instance = counter.create();

      expect(instance.count()).toBe(100);
      expect(instance.theme).toBe("light");
    });

    it("should support multiple provides", () => {
      const dep1 = logic("dep1", () => ({ a: 1 }));
      const dep2 = logic("dep2", () => ({ b: 2 }));
      const main = logic("main", () => {
        const { a } = dep1();
        const { b } = dep2();
        return { a, b };
      });

      logic.provide(dep1, () => ({ a: 10 }));
      logic.provide(dep2, () => ({ b: 20 }));

      const instance = main.create();
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
      const newInstance = counter.create();
      expect(newInstance.initialValue).toBe(999);
    });

    it("should support full override", () => {
      const config = logic("config", () => ({
        host: "localhost",
        port: 3000,
        timeout: 5000,
      }));
      const consumer = logic("consumer", () => {
        const cfg = config();
        return { url: `http://${cfg.host}:${cfg.port}` };
      });

      // Full override - must provide all used properties
      logic.provide(config, () => ({
        host: "testhost",
        port: 8080,
        timeout: 1000,
      }));

      const instance = consumer.create();
      expect(instance.url).toBe("http://testhost:8080");
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

      const instance = top.create();
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

      // Instances are auto-tracked in dev mode
      const instance1 = counter.create();
      const instance2 = counter.create();

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

    it("should track all instances in dev mode", () => {
      const counter = logic("counter", () => {
        const count = signal(0);
        return { count };
      });

      // All instances are auto-tracked in dev mode
      const instance1 = counter.create();
      const instance2 = counter.create();

      instance1.count.set(10);
      instance2.count.set(20);

      logic.clear();

      // Both should be disposed after logic.clear()
      expect(() => instance1.count.set(1)).toThrow();
      expect(() => instance2.count.set(1)).toThrow();
    });

    it("should remove from tracking when manually disposed", () => {
      const counter = logic("counter", () => {
        const count = signal(0);
        return { count };
      });

      const instance = counter.create();
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

  describe("signal ownership and disposal", () => {
    it("should NOT dispose global signals when child logic is disposed", () => {
      // Global signal - exists outside any logic
      const globalSignal = signal(100, { name: "globalSignal" });

      const childLogic = logic("child", () => {
        const ownSignal = signal(0, { name: "ownSignal" });

        return {
          globalSignal, // Reference to global - should NOT be disposed
          ownSignal, // Created inside - should be disposed
        };
      });

      const child = childLogic.create();

      // Both signals work before dispose
      expect(globalSignal()).toBe(100);
      expect(child.ownSignal()).toBe(0);

      // Dispose the child logic
      child.dispose();

      // CRITICAL: Global signal should NOT be disposed!
      expect(globalSignal.disposed()).toBe(false);
      expect(globalSignal()).toBe(100);

      // Child's own signal should be disposed
      expect(child.ownSignal.disposed()).toBe(true);
    });

    it("should NOT dispose parent logic signals when child logic is disposed", () => {
      const parentLogic = logic("parent", () => {
        const s1 = signal(42, { name: "parentSignal" });
        return { s1 };
      });

      const childLogic = logic("child", () => {
        const { s1 } = parentLogic(); // Access parent singleton
        const s2 = signal(0, { name: "childSignal" });

        return {
          s1, // From parent - should NOT be disposed
          s2, // Created in child - should be disposed
        };
      });

      const child = childLogic.create();

      // Both signals work before dispose
      expect(child.s1()).toBe(42);
      expect(child.s2()).toBe(0);

      // Dispose the child logic
      child.dispose();

      // CRITICAL: Parent's signal should NOT be disposed!
      const parent = parentLogic();
      expect(parent.s1.disposed()).toBe(false);
      expect(parent.s1()).toBe(42);

      // Child's own signal should be disposed
      expect(child.s2.disposed()).toBe(true);
    });

    it("should only dispose signals created within the logic, not external references", () => {
      const childSignals = new Set<ReturnType<typeof signal<number>>>();
      const globalSignal = signal(0, { name: "global" });

      const parentLogic = logic("parent", () => {
        const s1 = signal(0, { name: "parent.s1" });
        return { s1 };
      });

      const childLogic = logic("child", () => {
        const { s1 } = parentLogic();
        const s2 = signal(0, { name: "child.s2" });
        childSignals.add(s2);

        return {
          globalSignal,
          s1,
          s2,
        };
      });

      const child = childLogic.create();

      // Verify all signals work
      expect(child.globalSignal()).toBe(0);
      expect(child.s1()).toBe(0);
      expect(child.s2()).toBe(0);

      // Dispose child logic
      child.dispose();

      // globalSignal should NOT be disposed
      expect(globalSignal.disposed()).toBe(false);
      globalSignal.set(999); // Should still work
      expect(globalSignal()).toBe(999);

      // Parent's s1 should NOT be disposed
      const parent = parentLogic();
      expect(parent.s1.disposed()).toBe(false);
      parent.s1.set(888);
      expect(parent.s1()).toBe(888);

      // Child's s2 should be disposed
      for (const s of childSignals) {
        expect(s.disposed()).toBe(true);
      }
    });

    it("should handle multiple nested logic levels correctly", () => {
      const level1 = logic("level1", () => {
        const a = signal("a", { name: "level1.a" });
        return { a };
      });

      const level2 = logic("level2", () => {
        const { a } = level1();
        const b = signal("b", { name: "level2.b" });
        return { a, b };
      });

      const level3 = logic("level3", () => {
        const { a, b } = level2();
        const c = signal("c", { name: "level3.c" });
        return { a, b, c };
      });

      const instance3 = level3.create();

      expect(instance3.a()).toBe("a");
      expect(instance3.b()).toBe("b");
      expect(instance3.c()).toBe("c");

      // Dispose level3
      instance3.dispose();

      // Level1 and Level2 signals should still work (they're singletons)
      const instance1 = level1();
      const instance2 = level2();

      expect(instance1.a.disposed()).toBe(false);
      expect(instance2.b.disposed()).toBe(false);
      expect(instance1.a()).toBe("a");
      expect(instance2.b()).toBe("b");

      // Only level3's own signal should be disposed
      expect(instance3.c.disposed()).toBe(true);
    });

    it("should dispose computed signals that depend on external signals, but not the external signals", () => {
      const externalSignal = signal(10, { name: "external" });

      const myLogic = logic("myLogic", () => {
        // This computed signal is created inside logic
        const doubled = signal(
          { externalSignal },
          ({ deps }) => deps.externalSignal * 2,
          { name: "doubled" }
        );

        return { externalSignal, doubled };
      });

      const instance = myLogic.create();

      expect(instance.doubled()).toBe(20);

      // Dispose the logic
      instance.dispose();

      // External signal should NOT be disposed
      expect(externalSignal.disposed()).toBe(false);
      externalSignal.set(50);
      expect(externalSignal()).toBe(50);

      // The computed signal created inside should be disposed
      expect(instance.doubled.disposed()).toBe(true);
    });
  });

  describe("logic.provide() - testing patterns", () => {
    it("should provide full override", () => {
      const auth = logic("auth", () => ({
        getUser: () => "original-user",
        getToken: () => "original-token",
        logout: () => {},
      }));

      logic.provide(auth, () => ({
        getUser: () => "mock-user",
        getToken: () => "mock-token",
        logout: () => {},
      }));

      const instance = auth();
      expect(instance.getUser()).toBe("mock-user");
      expect(instance.getToken()).toBe("mock-token");
    });

    it("should work with vi.fn() mocks", () => {
      const api = logic("api", () => ({
        fetchUser: (id: number) => ({ id, name: "Real User" }),
        updateUser: (id: number, data: unknown) => ({ success: true }),
      }));

      const mockFetchUser = vi.fn().mockReturnValue({ id: 1, name: "Mock User" });
      const mockUpdateUser = vi.fn().mockReturnValue({ success: false });

      logic.provide(api, () => ({
        fetchUser: mockFetchUser,
        updateUser: mockUpdateUser,
      }));

      const instance = api();
      
      expect(instance.fetchUser(1)).toEqual({ id: 1, name: "Mock User" });
      expect(mockFetchUser).toHaveBeenCalledWith(1);
      
      expect(instance.updateUser(1, { name: "New" })).toEqual({ success: false });
      expect(mockUpdateUser).toHaveBeenCalledWith(1, { name: "New" });
    });

    it("should call factory fresh each time (no caching)", () => {
      const config = logic("config", () => ({
        value: "original",
      }));

      let callCount = 0;
      logic.provide(config, () => {
        callCount++;
        return { value: `call-${callCount}` };
      });

      // Each call to config() calls the factory
      expect(config().value).toBe("call-1");
      expect(config().value).toBe("call-2");
      expect(config().value).toBe("call-3");
      expect(callCount).toBe(3);
    });

    it("should work with mockReturnValueOnce for sequential calls", () => {
      const api = logic("api", () => ({
        getData: () => "real-data",
      }));

      const mockGetData = vi
        .fn()
        .mockReturnValueOnce("first-call")
        .mockReturnValueOnce("second-call")
        .mockReturnValue("default");

      logic.provide(api, () => ({
        getData: mockGetData,
      }));

      expect(api().getData()).toBe("first-call");
      expect(api().getData()).toBe("second-call");
      expect(api().getData()).toBe("default");
      expect(api().getData()).toBe("default");
    });

    it("should work with abstract logic", () => {
      type AuthApi = {
        getToken: () => string;
        refresh: () => void;
      };

      const authApi = logic.abstract<AuthApi>("authApi");

      logic.provide(authApi, () => ({
        getToken: () => "test-token",
        refresh: () => {},
      }));

      const instance = authApi();
      expect(instance.getToken()).toBe("test-token");
    });

    it("should work with multiple provides", () => {
      const auth = logic("auth", () => ({ user: "original" }));
      const config = logic("config", () => ({ env: "prod" }));

      logic.provide(auth, () => ({ user: "mock-user" }));
      logic.provide(config, () => ({ env: "test" }));

      expect(auth().user).toBe("mock-user");
      expect(config().env).toBe("test");
    });

    it("setup pattern - return writable instance for test manipulation", () => {
      type User = { id: number; name: string };
      
      const authLogic = logic("auth", () => {
        const user = signal<User | null>(null);
        return {
          user,
          getUser: () => user(),
          login: (u: User) => user.set(u),
          logout: () => user.set(null),
        };
      });

      // Setup helper returns writable instance
      const setupAuth = (initial: { user?: User | null } = {}) => {
        const instance = {
          user: signal<User | null>(initial.user ?? null),
          getUser: () => instance.user(),
          login: vi.fn((u: User) => instance.user.set(u)),
          logout: vi.fn(() => instance.user.set(null)),
        };
        logic.provide(authLogic, () => instance);
        return instance;
      };

      // Test 1: Start logged out
      const auth = setupAuth();
      expect(auth.getUser()).toBe(null);

      // Test 2: Manipulate state during test
      auth.user.set({ id: 1, name: "Alice" });
      expect(auth.getUser()).toEqual({ id: 1, name: "Alice" });

      // Test 3: Re-setup with different initial state
      const auth2 = setupAuth({ user: { id: 2, name: "Bob" } });
      expect(auth2.getUser()).toEqual({ id: 2, name: "Bob" });

      // Test 4: Verify mock function calls
      auth2.login({ id: 3, name: "Charlie" });
      expect(auth2.login).toHaveBeenCalledWith({ id: 3, name: "Charlie" });
    });

    it("setup pattern - manipulate state between assertions", () => {
      const counterLogic = logic("counter", () => {
        const count = signal(0);
        return {
          count,
          getCount: () => count(),
          increment: () => count.set((x) => x + 1),
        };
      });

      const setupCounter = (initial = 0) => {
        const instance = {
          count: signal(initial),
          getCount: () => instance.count(),
          increment: vi.fn(() => instance.count.set((x) => x + 1)),
        };
        logic.provide(counterLogic, () => instance);
        return instance;
      };

      const counter = setupCounter(10);
      
      // Assert initial state
      expect(counter.getCount()).toBe(10);

      // Manipulate state
      counter.count.set(50);
      expect(counter.getCount()).toBe(50);

      // Call action
      counter.increment();
      expect(counter.increment).toHaveBeenCalled();
      expect(counter.getCount()).toBe(51);

      // Direct manipulation again
      counter.count.set(100);
      expect(counter.getCount()).toBe(100);
    });
  });

  describe("test isolation patterns", () => {
    it("test 1: instances are automatically isolated", () => {
      const settings = logic("settings", () => ({
        apiUrl: "https://api.example.com",
      }));

      const api = logic("api", () => {
        const { apiUrl } = settings();
        return {
          fetch: () => `Fetching from ${apiUrl}`,
        };
      });

      const instance = api.create();
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

      const instance = api.create();
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
      const instance = api.create();
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

      const instance = counter.create();

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

      const instance = counter.create();
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
      const instance = empty.create();

      expect(instance).toEqual(expect.objectContaining({}));
      expect(typeof instance.dispose).toBe("function");
    });

    it("should handle logic with no dependencies", () => {
      const standalone = logic("standalone", () => ({
        value: 42,
        compute: (x: number) => x * 2,
      }));

      const instance = standalone.create();
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

      const instance = asyncLogic.create();

      expect(instance.data()).toBe(null);
      expect(instance.loading()).toBe(false);

      await instance.fetchData();

      expect(instance.data()).toBe("fetched");
      expect(instance.loading()).toBe(false);
    });
  });
});
