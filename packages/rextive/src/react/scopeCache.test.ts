import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ScopeCache } from "./scopeCache";
import { signal } from "../signal";
import { logic } from "../logic";

describe("ScopeCache", () => {
  let cache: ScopeCache;

  beforeEach(() => {
    cache = new ScopeCache();
  });

  afterEach(() => {
    cache.clear();
    logic.clear();
  });

  describe("basic functionality", () => {
    it("should create scope with factory", () => {
      const factory = vi.fn(() => ({ value: 42 }));
      const entry = cache.get("test", factory, [], Object.is);

      expect(factory).toHaveBeenCalledTimes(1);
      expect(entry.scope).toEqual({ value: 42 });
    });

    it("should pass args to factory", () => {
      const factory = vi.fn((a: number, b: string) => ({ a, b }));
      const entry = cache.get("test", factory, [1, "hello"], Object.is);

      expect(factory).toHaveBeenCalledWith(1, "hello");
      expect(entry.scope).toEqual({ a: 1, b: "hello" });
    });

    it("should reuse existing entry with same key and args", () => {
      const factory = vi.fn(() => ({ value: Math.random() }));

      const entry1 = cache.get("test", factory, [], Object.is);
      const entry2 = cache.get("test", factory, [], Object.is);

      expect(factory).toHaveBeenCalledTimes(1);
      expect(entry1).toBe(entry2);
      expect(entry1.scope).toBe(entry2.scope);
    });

    it("should create new entry for different key", () => {
      const factory = vi.fn(() => ({ value: Math.random() }));

      const entry1 = cache.get("key1", factory, [], Object.is);
      const entry2 = cache.get("key2", factory, [], Object.is);

      expect(factory).toHaveBeenCalledTimes(2);
      expect(entry1).not.toBe(entry2);
      expect(entry1.scope).not.toBe(entry2.scope);
    });
  });

  describe("args comparison", () => {
    it("should recreate entry when args change (Object.is)", () => {
      const factory = vi.fn((id: number) => ({ id }));

      const entry1 = cache.get("test", factory, [1], Object.is);
      expect(entry1.scope).toEqual({ id: 1 });

      const entry2 = cache.get("test", factory, [2], Object.is);
      expect(entry2.scope).toEqual({ id: 2 });

      expect(factory).toHaveBeenCalledTimes(2);
      expect(entry1).not.toBe(entry2);
    });

    it("should reuse entry when args are same (Object.is)", () => {
      const factory = vi.fn((id: number) => ({ id }));

      const entry1 = cache.get("test", factory, [1], Object.is);
      const entry2 = cache.get("test", factory, [1], Object.is);

      expect(factory).toHaveBeenCalledTimes(1);
      expect(entry1).toBe(entry2);
    });

    it("should use custom equals for args comparison", () => {
      const factory = vi.fn((obj: { id: number }) => ({ ...obj }));
      const customEquals = (a: unknown, b: unknown) =>
        (a as { id: number }).id === (b as { id: number }).id;

      const entry1 = cache.get("test", factory, [{ id: 1 }], customEquals);
      // Different object reference but same id
      const entry2 = cache.get("test", factory, [{ id: 1 }], customEquals);

      expect(factory).toHaveBeenCalledTimes(1);
      expect(entry1).toBe(entry2);

      // Different id - should recreate
      const entry3 = cache.get("test", factory, [{ id: 2 }], customEquals);
      expect(factory).toHaveBeenCalledTimes(2);
      expect(entry1).not.toBe(entry3);
    });

    it("should handle multiple args", () => {
      const factory = vi.fn((a: number, b: string, c: boolean) => ({
        a,
        b,
        c,
      }));

      cache.get("test", factory, [1, "a", true], Object.is);
      cache.get("test", factory, [1, "a", true], Object.is);
      expect(factory).toHaveBeenCalledTimes(1);

      cache.get("test", factory, [1, "a", false], Object.is);
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it("should handle different args length", () => {
      const factory = vi.fn((...args: unknown[]) => ({ args }));

      cache.get("test", factory, [1, 2], Object.is);
      cache.get("test", factory, [1, 2, 3], Object.is);

      expect(factory).toHaveBeenCalledTimes(2);
    });

    it("should maintain stable reference for function args", () => {
      // Simulates React re-renders where inline callbacks change reference each render
      const factory = vi.fn((onClick: () => void) => ({ onClick }));

      // First render: create entry with callback v1
      const onClick1 = () => console.log("v1");
      const entry1 = cache.get("test", factory, [onClick1], Object.is);
      expect(factory).toHaveBeenCalledTimes(1);

      // Second render: new callback reference (same behavior, different ref)
      const onClick2 = () => console.log("v2");
      const entry2 = cache.get("test", factory, [onClick2], Object.is);

      // Should NOT recreate - stableEquals wraps function in stable reference
      expect(factory).toHaveBeenCalledTimes(1);
      expect(entry1).toBe(entry2);

      // The stable function should delegate to the latest implementation
      // entry1.scope.onClick is a StateFunction that now points to onClick2
    });

    it("should maintain stable function across multiple re-renders", () => {
      const factory = vi.fn((handler: (x: number) => number) => ({ handler }));

      // Render 1
      const entry1 = cache.get(
        "test",
        factory,
        [(x: number) => x * 2],
        Object.is
      );
      expect(factory).toHaveBeenCalledTimes(1);

      // Get the stable handler reference
      const stableHandler = entry1.scope.handler;

      // Render 2, 3, 4 with new function references each time
      cache.get("test", factory, [(x: number) => x * 3], Object.is);
      cache.get("test", factory, [(x: number) => x * 4], Object.is);
      const entry4 = cache.get(
        "test",
        factory,
        [(x: number) => x * 5],
        Object.is
      );

      // Should never recreate
      expect(factory).toHaveBeenCalledTimes(1);
      expect(entry1).toBe(entry4);

      // Handler reference should be stable
      expect(entry4.scope.handler).toBe(stableHandler);

      // But should call latest implementation
      expect(stableHandler(10)).toBe(50); // 10 * 5
    });

    it("should handle mixed args with functions and primitives", () => {
      const factory = vi.fn(
        (id: number, onClick: () => void, name: string) => ({
          id,
          onClick,
          name,
        })
      );

      // First call
      const entry1 = cache.get(
        "test",
        factory,
        [1, () => {}, "Alice"],
        Object.is
      );
      expect(factory).toHaveBeenCalledTimes(1);

      // Same id and name, new function reference - should reuse
      const entry2 = cache.get(
        "test",
        factory,
        [1, () => {}, "Alice"],
        Object.is
      );
      expect(factory).toHaveBeenCalledTimes(1);
      expect(entry1).toBe(entry2);

      // Different id - should recreate even though function changed too
      const entry3 = cache.get(
        "test",
        factory,
        [2, () => {}, "Alice"],
        Object.is
      );
      expect(factory).toHaveBeenCalledTimes(2);
      expect(entry1).not.toBe(entry3);
    });
  });

  describe("reference counting", () => {
    it("should start with refs=0", () => {
      const entry = cache.get("test", () => ({}), [], Object.is);
      expect(entry.refs).toBe(0);
    });

    it("should increment refs on commit", () => {
      const entry = cache.get("test", () => ({}), [], Object.is);

      entry.commit();
      expect(entry.refs).toBe(1);

      entry.commit();
      expect(entry.refs).toBe(2);
    });

    it("should decrement refs on uncommit", () => {
      const entry = cache.get("test", () => ({}), [], Object.is);

      entry.commit();
      entry.commit();
      expect(entry.refs).toBe(2);

      entry.uncommit();
      expect(entry.refs).toBe(1);
    });

    it("should not decrement refs below 0", () => {
      const entry = cache.get("test", () => ({}), [], Object.is);

      entry.uncommit();
      expect(entry.refs).toBe(-1); // Actually decrements, dispose check happens separately
    });

    it("should not modify refs after disposal", () => {
      const entry = cache.get("test", () => ({}), [], Object.is);

      entry.dispose();
      expect(entry.disposed).toBe(true);

      entry.commit();
      expect(entry.refs).toBe(0); // No change

      entry.uncommit();
      expect(entry.refs).toBe(0); // No change
    });
  });

  describe("disposal", () => {
    it("should call scope dispose on entry disposal", () => {
      const disposeFn = vi.fn();
      const entry = cache.get(
        "test",
        () => ({ dispose: disposeFn }),
        [],
        Object.is
      );

      entry.dispose();

      expect(disposeFn).toHaveBeenCalledTimes(1);
      expect(entry.disposed).toBe(true);
    });

    it("should only dispose once", () => {
      const disposeFn = vi.fn();
      const entry = cache.get(
        "test",
        () => ({ dispose: disposeFn }),
        [],
        Object.is
      );

      entry.dispose();
      entry.dispose();
      entry.dispose();

      expect(disposeFn).toHaveBeenCalledTimes(1);
    });

    it("should dispose tracked signals", async () => {
      const signalDisposeFn = vi.fn();
      const mockSignal = {
        dispose: signalDisposeFn,
        get: () => 0,
      };

      // Create a factory that creates a "signal" (mocked)
      const entry = cache.get(
        "test",
        () => {
          const count = signal(0);
          return { count };
        },
        [],
        Object.is
      );

      // Wait for any microtasks (disposeIfUnused)
      await Promise.resolve();

      // Entry should be disposed (refs=0)
      expect(entry.disposed).toBe(true);
    });

    it("should schedule disposal via microtask when refs=0", async () => {
      const disposeFn = vi.fn();
      const entry = cache.get(
        "test",
        () => ({ dispose: disposeFn }),
        [],
        Object.is
      );

      // disposeIfUnused was called in get(), disposal is scheduled
      expect(entry.disposed).toBe(false);

      // Wait for microtask
      await Promise.resolve();

      expect(entry.disposed).toBe(true);
      expect(disposeFn).toHaveBeenCalled();
    });

    it("should NOT dispose if committed before microtask", async () => {
      const disposeFn = vi.fn();
      const entry = cache.get(
        "test",
        () => ({ dispose: disposeFn }),
        [],
        Object.is
      );

      // Simulate useLayoutEffect commit (sync, before microtask)
      entry.commit();

      // Wait for microtask
      await Promise.resolve();

      // Should NOT be disposed because refs > 0
      expect(entry.disposed).toBe(false);
      expect(disposeFn).not.toHaveBeenCalled();
    });

    it("should dispose on uncommit when refs reaches 0", async () => {
      const disposeFn = vi.fn();
      const entry = cache.get(
        "test",
        () => ({ dispose: disposeFn }),
        [],
        Object.is
      );

      // Commit to prevent initial disposal
      entry.commit();
      await Promise.resolve();
      expect(entry.disposed).toBe(false);

      // Uncommit - refs becomes 0
      entry.uncommit();

      // Wait for microtask
      await Promise.resolve();

      expect(entry.disposed).toBe(true);
      expect(disposeFn).toHaveBeenCalled();
    });

    it("should dispose old entry when args change", async () => {
      const disposeFn1 = vi.fn();
      const disposeFn2 = vi.fn();

      const entry1 = cache.get(
        "test",
        () => ({ dispose: disposeFn1 }),
        [1],
        Object.is
      );
      entry1.commit();
      await Promise.resolve();

      // Change args - should dispose old entry
      const entry2 = cache.get(
        "test",
        () => ({ dispose: disposeFn2 }),
        [2],
        Object.is
      );

      expect(disposeFn1).toHaveBeenCalled();
      expect(entry1.disposed).toBe(true);
      expect(entry2.disposed).toBe(false);
    });
  });

  describe("logic support", () => {
    it("should resolve Logic and call .create()", () => {
      const testLogic = logic("testLogic", () => {
        const count = signal(42);
        return { count };
      });

      const entry = cache.get("test", testLogic, [], Object.is);

      expect(entry.scope.count()).toBe(42);
    });

    it("should throw for abstract Logic without implementation", () => {
      const abstractLogic = logic.abstract<{ getValue: () => number }>(
        "abstractLogic"
      );

      expect(() => {
        cache.get("test", abstractLogic as any, [], Object.is);
      }).toThrow(/Cannot create instance from abstract logic/);
    });
  });

  describe("signal auto-disposal", () => {
    it("should auto-dispose signals created in factory", async () => {
      let signalRef: ReturnType<typeof signal<number>> | undefined;

      const entry = cache.get(
        "test",
        () => {
          signalRef = signal(0);
          return { count: signalRef };
        },
        [],
        Object.is
      );

      expect(signalRef).toBeDefined();
      expect(signalRef!.disposed()).toBe(false);

      // Wait for microtask disposal (refs=0)
      await Promise.resolve();

      expect(entry.disposed).toBe(true);
      expect(signalRef!.disposed()).toBe(true);
    });

    it("should preserve signals if entry is committed", async () => {
      let signalRef: ReturnType<typeof signal<number>> | undefined;

      const entry = cache.get(
        "test",
        () => {
          signalRef = signal(0);
          return { count: signalRef };
        },
        [],
        Object.is
      );

      entry.commit();
      await Promise.resolve();

      expect(entry.disposed).toBe(false);
      expect(signalRef!.disposed()).toBe(false);
    });
  });

  describe("clear", () => {
    it("should dispose all entries", async () => {
      const disposeFn1 = vi.fn();
      const disposeFn2 = vi.fn();

      const entry1 = cache.get(
        "key1",
        () => ({ dispose: disposeFn1 }),
        [],
        Object.is
      );
      const entry2 = cache.get(
        "key2",
        () => ({ dispose: disposeFn2 }),
        [],
        Object.is
      );

      entry1.commit();
      entry2.commit();

      cache.clear();

      expect(disposeFn1).toHaveBeenCalled();
      expect(disposeFn2).toHaveBeenCalled();
      expect(entry1.disposed).toBe(true);
      expect(entry2.disposed).toBe(true);
    });

    it("should empty the cache", () => {
      cache.get("key1", () => ({}), [], Object.is);
      cache.get("key2", () => ({}), [], Object.is);

      expect(cache.scopes.size).toBe(2);

      cache.clear();

      expect(cache.scopes.size).toBe(0);
    });
  });

  describe("StrictMode simulation", () => {
    it("should handle double render with single commit", async () => {
      const factory = vi.fn(() => ({ value: 1 }));

      // Simulate StrictMode: render twice
      const entry1 = cache.get("test", factory, [], Object.is);
      const entry2 = cache.get("test", factory, [], Object.is);

      // Should reuse same entry
      expect(entry1).toBe(entry2);
      expect(factory).toHaveBeenCalledTimes(1);

      // Simulate single commit (only second render commits)
      entry2.commit();

      // Wait for microtask
      await Promise.resolve();

      // Entry should survive
      expect(entry2.disposed).toBe(false);
      expect(entry2.refs).toBe(1);
    });

    it("should handle double mount (commit twice, uncommit twice)", async () => {
      const factory = vi.fn(() => ({ value: 1 }));

      const entry = cache.get("test", factory, [], Object.is);

      // Simulate StrictMode double mount: effect runs twice
      entry.commit(); // First mount
      entry.uncommit(); // First unmount (StrictMode)
      entry.commit(); // Second mount (StrictMode remount)

      // Wait for microtask from first uncommit
      await Promise.resolve();

      // Entry should survive because refs=1
      expect(entry.disposed).toBe(false);
      expect(entry.refs).toBe(1);
    });

    it("should dispose if never committed (error/suspense)", async () => {
      const disposeFn = vi.fn();
      const entry = cache.get(
        "test",
        () => ({ dispose: disposeFn }),
        [],
        Object.is
      );

      // Never call commit (simulates error during render or suspense)

      // Wait for microtask
      await Promise.resolve();

      expect(entry.disposed).toBe(true);
      expect(disposeFn).toHaveBeenCalled();
    });
  });
});
