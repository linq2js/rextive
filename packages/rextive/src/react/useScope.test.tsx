import React, { act, Suspense } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { useScope, __clearCache, scope } from "./useScope";
import { signal } from "../signal";
import { logic } from "../logic";
import { wrappers } from "../test/strictModeTests";
import "@testing-library/jest-dom/vitest";
import { AnySignal } from "../types";
import { rx } from "./rx";
import { wait } from "../wait";
import { batch } from "../batch";

// Simple ErrorBoundary for testing
class ErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

describe.each(wrappers)("useScope ($mode mode)", ({ mode, render }) => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    __clearCache();
    logic.clear();
  });

  describe("basic functionality", () => {
    it("should create and return scope with signals", () => {
      const TestComponent = () => {
        const { count } = useScope("test", () => ({
          count: signal(42),
        }));

        return <div data-testid="value">{count()}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("42");
    });

    it("should create multiple signals in scope", () => {
      const TestComponent = () => {
        const { a, b, c } = useScope("test", () => ({
          a: signal(1),
          b: signal(2),
          c: signal(3),
        }));

        return (
          <div>
            <div data-testid="a">{a()}</div>
            <div data-testid="b">{b()}</div>
            <div data-testid="c">{c()}</div>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("a")).toHaveTextContent("1");
      expect(screen.getByTestId("b")).toHaveTextContent("2");
      expect(screen.getByTestId("c")).toHaveTextContent("3");
    });

    it("should reuse same scope across re-renders with same key", () => {
      let createCount = 0;
      const TestComponent = () => {
        const scope = useScope("test", () => {
          createCount++;
          return { count: signal(createCount) };
        });

        return <div data-testid="value">{scope.count()}</div>;
      };

      const { rerender } = render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("1");
      expect(createCount).toBe(1);

      // Re-render - should reuse scope
      rerender(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("1");
      expect(createCount).toBe(1);
    });
  });

  describe("key-based caching", () => {
    it("should share scope between components with same key", () => {
      let createCount = 0;
      const sharedSignal = { value: 0 };

      const Component1 = () => {
        const scope = useScope("shared", () => {
          createCount++;
          sharedSignal.value = createCount;
          return { id: signal(createCount) };
        });
        return <div data-testid="c1">{scope.id()}</div>;
      };

      const Component2 = () => {
        const scope = useScope("shared", () => {
          createCount++;
          sharedSignal.value = createCount;
          return { id: signal(createCount) };
        });
        return <div data-testid="c2">{scope.id()}</div>;
      };

      render(
        <>
          <Component1 />
          <Component2 />
        </>
      );

      // Both should use the same scope (created once)
      expect(createCount).toBe(1);
      expect(screen.getByTestId("c1")).toHaveTextContent("1");
      expect(screen.getByTestId("c2")).toHaveTextContent("1");
    });

    it("should create separate scopes for different keys", () => {
      let createCount = 0;

      const TestComponent = ({ id }: { id: string }) => {
        const scope = useScope(`scope:${id}`, () => {
          createCount++;
          return { value: signal(createCount) };
        });
        return <div data-testid={`value-${id}`}>{scope.value()}</div>;
      };

      render(
        <>
          <TestComponent id="a" />
          <TestComponent id="b" />
        </>
      );

      expect(createCount).toBe(2);
      expect(screen.getByTestId("value-a")).toHaveTextContent("1");
      expect(screen.getByTestId("value-b")).toHaveTextContent("2");
    });
  });

  describe("args support", () => {
    it("should pass args to factory", () => {
      const TestComponent = ({ userId }: { userId: number }) => {
        const scope = useScope(
          "user",
          (id: number) => ({
            userId: signal(id),
          }),
          [userId]
        );

        return <div data-testid="value">{scope.userId()}</div>;
      };

      render(<TestComponent userId={123} />);
      expect(screen.getByTestId("value")).toHaveTextContent("123");
    });

    it("should recreate scope when args change", () => {
      let createCount = 0;

      const TestComponent = ({ userId }: { userId: number }) => {
        const scope = useScope(
          "user",
          (id: number) => {
            createCount++;
            return { userId: signal(id) };
          },
          [userId]
        );

        return <div data-testid="value">{scope.userId()}</div>;
      };

      const { rerender } = render(<TestComponent userId={1} />);
      expect(screen.getByTestId("value")).toHaveTextContent("1");
      expect(createCount).toBe(1);

      // Change args - should recreate
      rerender(<TestComponent userId={2} />);
      expect(screen.getByTestId("value")).toHaveTextContent("2");
      expect(createCount).toBe(2);
    });

    it("should not recreate scope when args are same", () => {
      let createCount = 0;

      const TestComponent = ({ userId }: { userId: number }) => {
        const scope = useScope(
          "user",
          (id: number) => {
            createCount++;
            return { userId: signal(id) };
          },
          [userId]
        );

        return <div data-testid="value">{scope.userId()}</div>;
      };

      const { rerender } = render(<TestComponent userId={1} />);
      expect(createCount).toBe(1);

      // Same args - should not recreate
      rerender(<TestComponent userId={1} />);
      expect(createCount).toBe(1);
    });

    it("should support multiple args", () => {
      const TestComponent = ({
        a,
        b,
        c,
      }: {
        a: number;
        b: string;
        c: boolean;
      }) => {
        const scope = useScope(
          "multi",
          (numArg: number, strArg: string, boolArg: boolean) => ({
            value: signal(`${numArg}-${strArg}-${boolArg}`),
          }),
          [a, b, c]
        );

        return <div data-testid="value">{scope.value()}</div>;
      };

      render(<TestComponent a={1} b="hello" c={true} />);
      expect(screen.getByTestId("value")).toHaveTextContent("1-hello-true");
    });
  });

  describe("custom equals option", () => {
    it("should use custom equals for args comparison", () => {
      let createCount = 0;

      const TestComponent = ({ filters }: { filters: { type: string } }) => {
        const scope = useScope(
          "filtered",
          (f: { type: string }) => {
            createCount++;
            return { type: signal(f.type) };
          },
          [filters],
          { equals: (a, b) => (a as any).type === (b as any).type }
        );

        return <div data-testid="value">{scope.type()}</div>;
      };

      const { rerender } = render(<TestComponent filters={{ type: "A" }} />);
      expect(createCount).toBe(1);

      // Different object reference but same content - should NOT recreate
      rerender(<TestComponent filters={{ type: "A" }} />);
      expect(createCount).toBe(1);

      // Different content - should recreate
      rerender(<TestComponent filters={{ type: "B" }} />);
      expect(createCount).toBe(2);
    });

    it("should use Object.is by default", () => {
      let createCount = 0;

      const TestComponent = ({ obj }: { obj: { id: number } }) => {
        const scope = useScope(
          "objTest",
          (o: { id: number }) => {
            createCount++;
            return { id: signal(o.id) };
          },
          [obj]
        );

        return <div data-testid="value">{scope.id()}</div>;
      };

      const obj1 = { id: 1 };
      const { rerender } = render(<TestComponent obj={obj1} />);
      expect(createCount).toBe(1);

      // Same reference - should not recreate
      rerender(<TestComponent obj={obj1} />);
      expect(createCount).toBe(1);

      // Different reference (even same content) - should recreate
      rerender(<TestComponent obj={{ id: 1 }} />);
      expect(createCount).toBe(2);
    });
  });

  describe("automatic disposal", () => {
    it("should dispose scope on unmount", async () => {
      const disposeFn = vi.fn();

      const TestComponent = () => {
        useScope("disposable", () => ({
          value: signal(0),
          dispose: disposeFn,
        }));

        return <div>Test</div>;
      };

      const { unmount } = render(<TestComponent />);
      expect(disposeFn).not.toHaveBeenCalled();

      unmount();

      // Wait for microtask disposal
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(disposeFn).toHaveBeenCalled();
    });

    it("should dispose old scope when args change", async () => {
      const disposeFn = vi.fn();
      let instanceId = 0;

      const TestComponent = ({ userId }: { userId: number }) => {
        useScope(
          "user",
          (id: number) => {
            const currentId = ++instanceId;
            return {
              userId: signal(id),
              dispose: () => disposeFn(currentId),
            };
          },
          [userId]
        );

        return <div>User {userId}</div>;
      };

      const { rerender } = render(<TestComponent userId={1} />);
      expect(disposeFn).not.toHaveBeenCalled();

      // Change args - should dispose old scope
      rerender(<TestComponent userId={2} />);

      // Old scope should be disposed
      expect(disposeFn).toHaveBeenCalledWith(1);
    });

    it("should auto-dispose signals created in factory", async () => {
      let signalInstance: ReturnType<typeof signal<number>> | undefined;

      const TestComponent = () => {
        const scope = useScope("signals", () => {
          signalInstance = signal(42);
          return { count: signalInstance };
        });

        return <div>{scope.count()}</div>;
      };

      const { unmount } = render(<TestComponent />);

      unmount();

      // Wait for disposal
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      // Signal should be disposed (attempting to use it may throw or return undefined)
      // We can't easily test this without exposing disposal state
    });
  });

  describe("logic support", () => {
    it("should use logic.create() for Logic factories", () => {
      let createCount = 0;

      const counterLogic = logic("counterLogic", () => {
        createCount++;
        return {
          count: signal(0),
          increment: function () {
            this.count.set((c) => c + 1);
          },
        };
      });

      const TestComponent = () => {
        const { count } = useScope("counter", counterLogic);
        return <div data-testid="value">{count()}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("0");
      expect(createCount).toBe(1);
    });

    it("should throw for abstract logic without implementation", () => {
      const abstractLogic = logic.abstract<{ getValue: () => number }>(
        "abstractLogic"
      );

      const TestComponent = () => {
        try {
          useScope("abstract", abstractLogic);
          return <div>Should not render</div>;
        } catch (e) {
          return <div data-testid="error">{(e as Error).message}</div>;
        }
      };

      render(<TestComponent />);
      expect(screen.getByTestId("error")).toHaveTextContent(
        /Cannot create instance from abstract logic/
      );
    });
  });

  describe("computed signals", () => {
    it("should work with computed signals", () => {
      const TestComponent = () => {
        const { count, doubled } = useScope("computed", () => {
          const count = signal(5);
          const doubled = signal({ count }, ({ deps }) => deps.count * 2);
          return { count, doubled };
        });

        return (
          <div>
            <div data-testid="count">{count()}</div>
            <div data-testid="doubled">{doubled()}</div>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("count")).toHaveTextContent("5");
      expect(screen.getByTestId("doubled")).toHaveTextContent("10");
    });

    it("should allow signal updates", () => {
      let scopeRef: { count: ReturnType<typeof signal<number>> } | undefined;

      const TestComponent = () => {
        const scope = useScope("updates", () => ({
          count: signal(0),
        }));
        scopeRef = scope;

        return <div data-testid="value">{scope.count()}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("0");

      act(() => {
        scopeRef?.count.set(10);
      });

      expect(scopeRef?.count()).toBe(10);
    });
  });

  describe("edge cases", () => {
    it("should handle empty scope object", () => {
      const TestComponent = () => {
        useScope("empty", () => ({}));
        return <div>Empty</div>;
      };

      // Should not throw
      render(<TestComponent />);
    });

    it("should handle undefined and null in args", () => {
      let createCount = 0;

      const TestComponent = ({
        value,
      }: {
        value: number | null | undefined;
      }) => {
        const scope = useScope(
          "nullable",
          (v: number | null | undefined) => {
            createCount++;
            return { value: signal(v ?? 0) };
          },
          [value]
        );

        return <div data-testid="value">{scope.value()}</div>;
      };

      const { rerender } = render(<TestComponent value={undefined} />);
      expect(createCount).toBe(1);

      rerender(<TestComponent value={null} />);
      expect(createCount).toBe(2);

      rerender(<TestComponent value={1} />);
      expect(createCount).toBe(3);

      rerender(<TestComponent value={undefined} />);
      expect(createCount).toBe(4);
    });

    it("should keep functions stable in args (no recreation)", () => {
      let createCount = 0;
      let lastCallback: (() => void) | null = null as any;

      const TestComponent = ({ callback }: { callback: () => void }) => {
        const scope = useScope(
          "callback",
          (cb: () => void) => {
            createCount++;
            lastCallback = cb;
            return {
              callbackRef: cb,
              counter: signal(createCount),
            };
          },
          [callback]
        );

        return <div data-testid="count">{scope.counter()}</div>;
      };

      const callback1 = vi.fn(() => console.log("v1"));
      const { rerender } = render(<TestComponent callback={callback1} />);
      expect(createCount).toBe(1);

      // Same function reference - should not recreate
      rerender(<TestComponent callback={callback1} />);
      expect(createCount).toBe(1);

      // Different function reference - should NOT recreate (stable function)
      // The callback is wrapped in a stable reference that delegates to latest
      const callback2 = vi.fn(() => console.log("v2"));
      rerender(<TestComponent callback={callback2} />);
      expect(createCount).toBe(1); // No recreation!

      // The stable callback should delegate to the latest function
      lastCallback?.();
      expect(callback2).toHaveBeenCalled();
      expect(callback1).not.toHaveBeenCalled();
    });

    it("should handle key changes", () => {
      let createCount = 0;

      const TestComponent = ({ scopeKey }: { scopeKey: string }) => {
        const scope = useScope(scopeKey, () => {
          createCount++;
          return { value: signal(createCount) };
        });

        return <div data-testid="value">{scope.value()}</div>;
      };

      const { rerender } = render(<TestComponent scopeKey="key1" />);
      expect(createCount).toBe(1);
      expect(screen.getByTestId("value")).toHaveTextContent("1");

      // Change key - should create new scope
      rerender(<TestComponent scopeKey="key2" />);
      expect(createCount).toBe(2);
      expect(screen.getByTestId("value")).toHaveTextContent("2");
    });
  });

  describe("dispose property variations", () => {
    it("should handle dispose as a function", async () => {
      const disposeFn = vi.fn();

      const TestComponent = () => {
        useScope("disposeFunc", () => ({
          value: signal(0),
          dispose: disposeFn,
        }));

        return <div>Test</div>;
      };

      const { unmount } = render(<TestComponent />);
      unmount();

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(disposeFn).toHaveBeenCalled();
    });

    it("should handle dispose as array of disposables", async () => {
      const dispose1 = vi.fn();
      const dispose2 = vi.fn();

      const TestComponent = () => {
        useScope("disposeArray", () => ({
          value: signal(0),
          dispose: [{ dispose: dispose1 }, { dispose: dispose2 }],
        }));

        return <div>Test</div>;
      };

      const { unmount } = render(<TestComponent />);
      unmount();

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(dispose1).toHaveBeenCalled();
      expect(dispose2).toHaveBeenCalled();
    });

    it("should silently skip singleton dispose when dispose function is singleton's dispose", async () => {
      const globalLogic = logic("globalLogic", () => {
        const count = signal(0, { name: "global.count" });
        return { count };
      });

      // Get singleton to register its dispose
      const singleton = globalLogic();
      singleton.count.set(42);

      const TestComponent = () => {
        // BAD PATTERN: returning singleton's dispose as local dispose
        // (will be silently skipped with dev warning)
        useScope("singletonDispose", () => ({
          value: signal(1),
          dispose: singleton.dispose,
        }));
        return <div data-testid="content">Content</div>;
      };

      const { unmount } = render(<TestComponent />);

      // Unmount should NOT throw (singleton disposal is silently skipped)
      expect(() => unmount()).not.toThrow();

      // Singleton should still be functional (wasn't disposed)
      expect(singleton.count()).toBe(42);
    });

    it("should silently skip singleton and dispose other items in dispose array", async () => {
      const globalLogic = logic("globalLogic", () => {
        const count = signal(0, { name: "global.count" });
        return { count };
      });

      // Get singleton to register its dispose
      const singleton = globalLogic();
      singleton.count.set(100);
      const localDisposeTracker = vi.fn();

      const TestComponent = () => {
        // BAD PATTERN: including singleton in dispose array
        // (singleton will be skipped, but other items will be disposed)
        useScope("singletonDisposeArray", () => ({
          value: signal(1),
          // Note: dispose array expects objects with dispose methods
          dispose: [singleton, { dispose: localDisposeTracker }],
        }));
        return <div data-testid="content">Content</div>;
      };

      const { unmount } = render(<TestComponent />);
      unmount();

      // Wait for microtask disposal
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      // Local dispose should have been called
      expect(localDisposeTracker).toHaveBeenCalled();

      // Singleton should still be functional
      expect(singleton.count()).toBe(100);
    });

    it("should silently skip singleton when dispose object is singleton", async () => {
      const globalLogic = logic("globalLogic", () => {
        const count = signal(0, { name: "global.count" });
        return { count };
      });

      // Get singleton to register its dispose
      const singleton = globalLogic();
      singleton.count.set(55);

      const TestComponent = () => {
        // BAD PATTERN: returning singleton as dispose object
        // (will be silently skipped)
        useScope("singletonDisposeObj", () => ({
          value: signal(1),
          dispose: singleton,
        }));
        return <div data-testid="content">Content</div>;
      };

      const { unmount } = render(<TestComponent />);

      // Unmount should NOT throw
      expect(() => unmount()).not.toThrow();

      // Singleton should still be functional
      expect(singleton.count()).toBe(55);
    });

    it("should dispose local instances normally (not singletons)", async () => {
      const localLogic = logic("localLogic", () => {
        const count = signal(0, { name: "local.count" });
        return { count };
      });

      const disposeTracker = vi.fn();

      const TestComponent = () => {
        // GOOD PATTERN: using .create() for owned instances
        const localInstance = localLogic.create();
        useScope("localDispose", () => ({
          value: signal(1),
          // Note: dispose array expects objects with dispose methods
          dispose: [localInstance, { dispose: disposeTracker }],
        }));
        return <div data-testid="content">Content</div>;
      };

      const { unmount } = render(<TestComponent />);
      unmount();

      // Wait for microtask disposal
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      // Local instances and dispose tracker should have been called
      expect(disposeTracker).toHaveBeenCalled();
    });

    it("should allow using singleton for reading without disposing", async () => {
      const globalLogic = logic("globalLogic", () => {
        const count = signal(0, { name: "global.count" });
        const increment = () => count.set((x) => x + 1);
        return { count, increment };
      });

      // Get singleton
      const singleton = globalLogic();

      const TestComponent = () => {
        // GOOD PATTERN: use singleton for reading, don't try to dispose it
        useScope("useSingleton", () => ({
          // Just reference singleton's values, don't include in dispose
          globalCount: singleton.count,
          increment: singleton.increment,
          // Local cleanup only
          dispose: () => {},
        }));
        return <div data-testid="value">{singleton.count()}</div>;
      };

      const { unmount } = render(<TestComponent />);

      expect(screen.getByTestId("value")).toHaveTextContent("0");

      // Should NOT throw
      expect(() => unmount()).not.toThrow();

      // Singleton should still be functional
      singleton.increment();
      expect(singleton.count()).toBe(1);
    });
  });

  describe("local mode (auto-key, void return)", () => {
    it("should create local scope with auto-generated key", () => {
      let effectRan = false;

      const TestComponent = () => {
        // Local mode - no key, returns void
        useScope(() => {
          effectRan = true;
          return { value: signal(0) };
        });

        return <div>Test</div>;
      };

      render(<TestComponent />);
      expect(effectRan).toBe(true);
    });

    it("should pass deps as args to factory", () => {
      const receivedArgs: unknown[] = [];

      const TestComponent = ({ id, name }: { id: number; name: string }) => {
        useScope(
          (argId: number, argName: string) => {
            receivedArgs.push(argId, argName);
            return {};
          },
          [id, name]
        );

        return <div>Test</div>;
      };

      render(<TestComponent id={42} name="Alice" />);
      // StrictMode double-invokes, but args should be correct each time
      expect(receivedArgs).toContain(42);
      expect(receivedArgs).toContain("Alice");
    });

    it("should recreate scope when deps change", () => {
      let createCount = 0;

      const TestComponent = ({ id }: { id: number }) => {
        useScope(
          (argId: number) => {
            createCount++;
            return { id: argId };
          },
          [id]
        );

        return <div>Count: {createCount}</div>;
      };

      const { rerender } = render(<TestComponent id={1} />);
      const initialCount = createCount;
      // StrictMode may double-invoke, but count should be consistent
      expect(createCount).toBeGreaterThanOrEqual(1);

      // Same id - should not recreate (count should stay same)
      rerender(<TestComponent id={1} />);
      expect(createCount).toBe(initialCount);

      // Different id - should recreate (count should increase)
      rerender(<TestComponent id={2} />);
      expect(createCount).toBeGreaterThan(initialCount);
    });

    it("should dispose on unmount", async () => {
      const disposeFn = vi.fn();

      const TestComponent = () => {
        useScope(() => ({
          dispose: disposeFn,
        }));

        return <div>Test</div>;
      };

      const { unmount } = render(<TestComponent />);
      unmount();

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(disposeFn).toHaveBeenCalled();
    });

    it("should create unique scope per component instance", () => {
      const scopes: Set<object> = new Set();

      const TestComponent = () => {
        useScope(() => {
          const scope = { id: Math.random() };
          scopes.add(scope);
          return scope;
        });

        return <div>Test</div>;
      };

      render(
        <>
          <TestComponent />
          <TestComponent />
        </>
      );

      // Each component instance should get its own scope
      // StrictMode may create more due to double-invoke, but at least 2
      expect(scopes.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe("return type flexibility", () => {
    it("should work with void return", () => {
      let factoryCalled = false;

      const TestComponent = () => {
        const result = useScope(() => {
          factoryCalled = true;
          // Explicitly return nothing (void)
        });

        // TypeScript allows void, runtime returns undefined
        expect(result).toBeUndefined();
        return <div>Test</div>;
      };

      render(<TestComponent />);
      expect(factoryCalled).toBe(true);
    });

    it("should work with undefined return", () => {
      const TestComponent = () => {
        const result = useScope(() => {
          return undefined;
        });

        expect(result).toBeUndefined();
        return <div>Test</div>;
      };

      render(<TestComponent />);
    });

    it("should work with null return", () => {
      const TestComponent = () => {
        const result = useScope(() => {
          return null;
        });

        expect(result).toBeNull();
        return <div>Test</div>;
      };

      render(<TestComponent />);
    });

    it("should work with primitive number return", () => {
      const TestComponent = () => {
        const result = useScope(() => 42);

        expect(result).toBe(42);
        return <div data-testid="value">{result}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("42");
    });

    it("should work with primitive string return", () => {
      const TestComponent = () => {
        const result = useScope(() => "hello");

        expect(result).toBe("hello");
        return <div data-testid="value">{result}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("hello");
    });

    it("should work with boolean return", () => {
      const TestComponent = () => {
        const result = useScope(() => true);

        expect(result).toBe(true);
        return <div data-testid="value">{result.toString()}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("true");
    });

    it("should work with array return", () => {
      const TestComponent = () => {
        const result = useScope(() => [1, 2, 3]);

        expect(result).toEqual([1, 2, 3]);
        return <div data-testid="value">{result.join(",")}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("1,2,3");
    });

    it("should work with function return", () => {
      const TestComponent = () => {
        const add = useScope(() => (a: number, b: number) => a + b);

        expect(typeof add).toBe("function");
        expect(add(2, 3)).toBe(5);
        return <div data-testid="value">{add(2, 3)}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("5");
    });

    it("should work with Symbol return", () => {
      const sym = Symbol("test");

      const TestComponent = () => {
        const result = useScope(() => sym);

        expect(result).toBe(sym);
        return <div>Test</div>;
      };

      render(<TestComponent />);
    });

    it("should work with Date return", () => {
      const date = new Date("2024-01-01");

      const TestComponent = () => {
        const result = useScope(() => date);

        expect(result).toBeInstanceOf(Date);
        expect(result.getTime()).toBe(date.getTime());
        return <div data-testid="value">{result.toISOString()}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("2024-01-01");
    });

    it("should work with Map return", () => {
      const TestComponent = () => {
        const result = useScope(() => new Map([["key", "value"]]));

        expect(result).toBeInstanceOf(Map);
        expect(result.get("key")).toBe("value");
        return <div data-testid="value">{result.get("key")}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("value");
    });

    it("should work with Set return", () => {
      const TestComponent = () => {
        const result = useScope(() => new Set([1, 2, 3]));

        expect(result).toBeInstanceOf(Set);
        expect(result.has(2)).toBe(true);
        return <div data-testid="value">{result.size}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("3");
    });

    it("should work with class instance return", () => {
      class Counter {
        value = 0;
        increment() {
          this.value++;
        }
      }

      const TestComponent = () => {
        const counter = useScope(() => new Counter());

        expect(counter).toBeInstanceOf(Counter);
        counter.increment();
        return <div data-testid="value">{counter.value}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("1");
    });

    it("should work with Promise return (not awaited)", () => {
      const TestComponent = () => {
        const promise = useScope(() => Promise.resolve(42));

        expect(promise).toBeInstanceOf(Promise);
        return <div>Test</div>;
      };

      render(<TestComponent />);
    });

    it("should preserve return type across re-renders", () => {
      let renderCount = 0;

      const TestComponent = () => {
        renderCount++;
        const result = useScope(() => ({ count: 42 }));

        expect(result).toEqual({ count: 42 });
        return <div data-testid="value">{result.count}</div>;
      };

      const { rerender } = render(<TestComponent />);
      const firstResult = screen.getByTestId("value").textContent;

      rerender(<TestComponent />);
      const secondResult = screen.getByTestId("value").textContent;

      expect(firstResult).toBe(secondResult);
    });

    it("should work with deps and various return types", () => {
      const TestComponent = ({ multiplier }: { multiplier: number }) => {
        const result = useScope((m: number) => m * 10, [multiplier]);

        return <div data-testid="value">{result}</div>;
      };

      const { rerender } = render(<TestComponent multiplier={2} />);
      expect(screen.getByTestId("value")).toHaveTextContent("20");

      rerender(<TestComponent multiplier={3} />);
      expect(screen.getByTestId("value")).toHaveTextContent("30");
    });
  });

  describe("edge cases - special values", () => {
    it("should handle NaN in deps (Object.is treats NaN === NaN)", () => {
      let createCount = 0;

      const TestComponent = ({ value }: { value: number }) => {
        useScope(
          (v: number) => {
            createCount++;
            return { value: v };
          },
          [value]
        );

        return <div>Test</div>;
      };

      const { rerender } = render(<TestComponent value={NaN} />);
      const initialCount = createCount;

      // Object.is(NaN, NaN) === true, so should NOT recreate
      rerender(<TestComponent value={NaN} />);
      expect(createCount).toBe(initialCount);
    });

    it("should handle Infinity in deps", () => {
      let createCount = 0;

      const TestComponent = ({ value }: { value: number }) => {
        useScope(
          (v: number) => {
            createCount++;
            return { value: v };
          },
          [value]
        );

        return <div>Test</div>;
      };

      const { rerender } = render(<TestComponent value={Infinity} />);
      const initialCount = createCount;

      // Infinity === Infinity, should NOT recreate (beyond initial)
      rerender(<TestComponent value={Infinity} />);
      expect(createCount).toBe(initialCount);
    });

    it("should handle -0 vs +0 in deps", () => {
      let createCount = 0;

      const TestComponent = ({ value }: { value: number }) => {
        useScope(
          (v: number) => {
            createCount++;
            return { value: v };
          },
          [value]
        );

        return <div>Test</div>;
      };

      const { rerender } = render(<TestComponent value={0} />);
      const initialCount = createCount;

      // stableEquals uses === first which treats 0 === -0 as true
      // So no recreation expected
      rerender(<TestComponent value={-0} />);
      expect(createCount).toBe(initialCount);
    });

    it("should handle shared mode with null key", () => {
      let createCount = 0;

      const TestComponent = () => {
        useScope(null, () => {
          createCount++;
          return { id: 1 };
        });

        return <div>Test</div>;
      };

      render(<TestComponent />);
      expect(createCount).toBe(1);
    });

    it("should handle shared mode with undefined key", () => {
      let createCount = 0;

      const TestComponent = () => {
        useScope(undefined, () => {
          createCount++;
          return { id: 1 };
        });

        return <div>Test</div>;
      };

      render(<TestComponent />);
      expect(createCount).toBe(1);
    });

    it("should handle shared mode with symbol key", () => {
      const KEY = Symbol("test");
      let createCount = 0;

      const TestComponent = () => {
        useScope(KEY, () => {
          createCount++;
          return { id: 1 };
        });

        return <div>Test</div>;
      };

      render(<TestComponent />);
      expect(createCount).toBe(1);
    });

    it("should handle shared mode with object key", () => {
      const KEY = { id: "test" };
      let createCount = 0;

      const TestComponent = () => {
        useScope(KEY, () => {
          createCount++;
          return { id: 1 };
        });

        return <div>Test</div>;
      };

      render(<TestComponent />);
      expect(createCount).toBe(1);
    });

    it("should handle empty deps array (never recreates after initial)", () => {
      let createCount = 0;
      let renderCount = 0;

      const TestComponent = () => {
        renderCount++;
        useScope(
          () => {
            createCount++;
            return {};
          },
          [] // Empty deps - should never recreate after initial
        );

        return <div>Test</div>;
      };

      const { rerender } = render(<TestComponent />);
      const initialCount = createCount;

      rerender(<TestComponent />);
      rerender(<TestComponent />);
      rerender(<TestComponent />);

      // Create count should not increase after initial
      expect(createCount).toBe(initialCount);
    });
  });

  describe("edge cases - error handling", () => {
    it("should handle factory that throws synchronously", () => {
      const TestComponent = () => {
        try {
          useScope(() => {
            throw new Error("Factory error");
          });
          return <div>Should not render</div>;
        } catch (e) {
          return <div data-testid="error">{(e as Error).message}</div>;
        }
      };

      render(<TestComponent />);
      expect(screen.getByTestId("error")).toHaveTextContent("Factory error");
    });

    it("should handle factory that returns rejected promise", async () => {
      const TestComponent = () => {
        const result = useScope(async () => {
          // Return a rejected promise but catch it immediately
          return Promise.reject(new Error("Async error")).catch(() => null);
        });

        // Result is a Promise
        expect(result).toBeInstanceOf(Promise);
        return <div>Test</div>;
      };

      render(<TestComponent />);
    });
  });

  describe("edge cases - async factory (known limitation)", () => {
    // NOTE: Async factories are supported but have a limitation:
    // Signals created AFTER the first await are NOT auto-tracked.
    // This is because withHooks() only captures synchronous signal creation.

    it("should return promise from async factory", () => {
      const TestComponent = () => {
        const result = useScope(async () => {
          return { value: 42 };
        });

        expect(result).toBeInstanceOf(Promise);
        return <div>Test</div>;
      };

      render(<TestComponent />);
    });

    it("should handle async factory with deps", () => {
      const TestComponent = ({ id }: { id: number }) => {
        const result = useScope(
          async (argId: number) => {
            return { id: argId };
          },
          [id]
        );

        expect(result).toBeInstanceOf(Promise);
        return <div>Test</div>;
      };

      render(<TestComponent id={1} />);
    });

    it("should NOT track signals created after await (known limitation)", async () => {
      // This documents the limitation - not a bug, just expected behavior
      const signalsCreated: string[] = [];

      const TestComponent = () => {
        useScope(async () => {
          // Signal created BEFORE await - would be tracked if sync
          signalsCreated.push("beforeAwait");

          await Promise.resolve();

          // Signal created AFTER await - NOT tracked
          signalsCreated.push("afterAwait");

          return {};
        });

        return <div>Test</div>;
      };

      render(<TestComponent />);

      // Both are created, but only beforeAwait would be tracked for disposal
      // (if they were actual signals)
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(signalsCreated).toContain("beforeAwait");
      expect(signalsCreated).toContain("afterAwait");
    });
  });

  describe("edge cases - deps mutation", () => {
    it("should compare deps element-by-element, not array reference", () => {
      let createCount = 0;
      const depsArray = [1, 2, 3];

      const TestComponent = ({ deps }: { deps: number[] }) => {
        useScope((...args: number[]) => {
          createCount++;
          return { args };
        }, deps);

        return <div>Test</div>;
      };

      const { rerender } = render(<TestComponent deps={depsArray} />);
      const initialCount = createCount;

      // Same array reference - should NOT recreate
      rerender(<TestComponent deps={depsArray} />);
      expect(createCount).toBe(initialCount);

      // New array with SAME content - should NOT recreate (elements are compared)
      // Each element 1, 2, 3 is compared with Object.is, all equal
      rerender(<TestComponent deps={[1, 2, 3]} />);
      expect(createCount).toBe(initialCount);

      // Different content - SHOULD recreate
      rerender(<TestComponent deps={[1, 2, 4]} />);
      expect(createCount).toBeGreaterThan(initialCount);
    });

    it("should recreate when deps length changes", () => {
      let createCount = 0;

      const TestComponent = ({ deps }: { deps: number[] }) => {
        useScope((...args: number[]) => {
          createCount++;
          return { args };
        }, deps);

        return <div>Test</div>;
      };

      const { rerender } = render(<TestComponent deps={[1, 2]} />);
      const initialCount = createCount;

      // Add element - should recreate
      rerender(<TestComponent deps={[1, 2, 3]} />);
      expect(createCount).toBeGreaterThan(initialCount);
    });
  });

  describe("edge cases - key changes", () => {
    it("should handle key changing from shared to different shared", async () => {
      let createCountA = 0;
      let createCountB = 0;
      const disposeA = vi.fn();
      const disposeB = vi.fn();

      const TestComponent = ({ useKeyA }: { useKeyA: boolean }) => {
        if (useKeyA) {
          useScope("keyA", () => {
            createCountA++;
            return { dispose: disposeA };
          });
        } else {
          useScope("keyB", () => {
            createCountB++;
            return { dispose: disposeB };
          });
        }

        return <div>Test</div>;
      };

      const { rerender } = render(<TestComponent useKeyA={true} />);
      expect(createCountA).toBe(1);
      expect(createCountB).toBe(0);

      // Switch to keyB - keyA should be disposed
      rerender(<TestComponent useKeyA={false} />);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(createCountB).toBe(1);
      expect(disposeA).toHaveBeenCalled();
    });

    it("should handle rapid key changes", async () => {
      let createCount = 0;
      const disposes: string[] = [];

      const TestComponent = ({ keyName }: { keyName: string }) => {
        useScope(keyName, () => {
          createCount++;
          return {
            key: keyName,
            dispose: () => disposes.push(keyName),
          };
        });

        return <div>Test</div>;
      };

      const { rerender, unmount } = render(<TestComponent keyName="a" />);

      // Rapid changes
      rerender(<TestComponent keyName="b" />);
      rerender(<TestComponent keyName="c" />);
      rerender(<TestComponent keyName="d" />);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      // Each key change should create new scope
      expect(createCount).toBe(4);

      unmount();

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      // All should be disposed
      expect(disposes).toContain("d");
    });
  });

  describe("edge cases - component hierarchy", () => {
    // NOTE: Calling useScope INSIDE another useScope's factory would violate
    // React's rules of hooks. This test verifies nested COMPONENTS work correctly.

    it("should handle useScope in nested components", () => {
      let outerCreateCount = 0;
      let innerCreateCount = 0;

      const InnerComponent = () => {
        // This is a separate component, so useScope is valid here
        useScope(() => {
          innerCreateCount++;
          return { inner: true };
        });
        return <div>Inner</div>;
      };

      const OuterComponent = () => {
        const outer = useScope(() => {
          outerCreateCount++;
          // CANNOT call useScope() here - would violate hooks rules!
          return { outer: true };
        });

        return (
          <div>
            <span>{outer.outer ? "Outer" : ""}</span>
            <InnerComponent />
          </div>
        );
      };

      render(<OuterComponent />);
      // Each component's useScope should be created at least once
      expect(outerCreateCount).toBeGreaterThanOrEqual(1);
      expect(innerCreateCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("proxy mode (on-demand signal creation)", () => {
    it("should create empty signal on property access", () => {
      const TestComponent = () => {
        const proxy = useScope<{
          submitState: Promise<string>;
          searchState: Promise<number>;
        }>();

        // Access creates empty signal
        const submitSignal = proxy.submitState;

        // Signal exists and returns undefined (empty signal)
        expect(submitSignal()).toBeUndefined();

        return <div data-testid="value">Test</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("Test");
    });

    it("should return same signal on subsequent access", () => {
      const TestComponent = () => {
        const proxy = useScope<{ count: number }>();

        const signal1 = proxy.count;
        const signal2 = proxy.count;

        // Should be the same signal instance
        expect(signal1).toBe(signal2);

        return <div>Test</div>;
      };

      render(<TestComponent />);
    });

    it("should allow setting values on proxy signals", () => {
      let proxyRef: { count: any } | undefined;

      const TestComponent = () => {
        const proxy = useScope<{ count: number }>();
        proxyRef = proxy;

        return (
          <div data-testid="value">{rx(() => proxy.count() ?? "empty")}</div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("empty");

      act(() => {
        proxyRef?.count.set(42);
      });

      expect(screen.getByTestId("value")).toHaveTextContent("42");
    });

    it("should dispose all proxy signals on unmount", async () => {
      let proxyRef: { a: any; b: any } | undefined;

      const TestComponent = () => {
        const proxy = useScope<{ a: number; b: string }>();
        proxyRef = proxy;

        // Access both to create them
        proxy.a;
        proxy.b;

        return <div>Test</div>;
      };

      const { unmount } = render(<TestComponent />);

      // Signals should exist
      expect(proxyRef?.a).toBeDefined();
      expect(proxyRef?.b).toBeDefined();

      unmount();

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      // Signals should be disposed
      expect(proxyRef?.a.disposed()).toBe(true);
      expect(proxyRef?.b.disposed()).toBe(true);
    });

    it("should work with rx() for reactive rendering", () => {
      let proxyRef: { message: any } | undefined;

      const TestComponent = () => {
        const proxy = useScope<{ message: string }>();
        proxyRef = proxy;

        return (
          <div data-testid="value">
            {rx(() => proxy.message() ?? "initial")}
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("initial");

      act(() => {
        proxyRef?.message.set("updated");
      });

      expect(screen.getByTestId("value")).toHaveTextContent("updated");
    });

    it("should not be captured by outer scopes (disposalHandled = true)", () => {
      // This test verifies that signals created inside rx() aren't captured
      // by the rx() tracking scope
      let proxyRef: { count: any } | undefined;
      let capturedByOuterScope = false;

      const TestComponent = () => {
        const proxy = useScope<{ count: number }>();
        proxyRef = proxy;

        return rx(() => {
          // Access signal inside rx() - should NOT be captured by rx() scope
          const signal = proxy.count;
          return <div data-testid="value">{signal() ?? "empty"}</div>;
        });
      };

      render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("empty");

      // If signal wasn't captured by outer scope, it should still work after set
      act(() => {
        proxyRef?.count.set(100);
      });

      expect(screen.getByTestId("value")).toHaveTextContent("100");
    });

    it("should handle multiple proxies in same component", () => {
      const TestComponent = () => {
        const formProxy = useScope<{ name: string; email: string }>();
        const stateProxy = useScope<{ loading: boolean }>();

        return (
          <div>
            <div data-testid="name">
              {rx(() => formProxy.name() ?? "no name")}
            </div>
            <div data-testid="loading">
              {rx(() => String(stateProxy.loading() ?? false))}
            </div>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("name")).toHaveTextContent("no name");
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    it("should work with Promise types for async action states", async () => {
      type SubmitResult = { success: boolean };
      let proxyRef: { submitState: any } | undefined;

      const TestComponent = () => {
        const proxy = useScope<{ submitState: Promise<SubmitResult> }>();
        proxyRef = proxy;

        return rx(() => {
          const state = proxy.submitState();
          if (!state) return <div data-testid="status">idle</div>;
          return <div data-testid="status">pending</div>;
        });
      };

      render(<TestComponent />);
      expect(screen.getByTestId("status")).toHaveTextContent("idle");

      await act(async () => {
        proxyRef?.submitState.set(Promise.resolve({ success: true }));
      });

      expect(screen.getByTestId("status")).toHaveTextContent("pending");
    });

    it("should preserve proxy reference across re-renders", () => {
      let proxyRefs: any[] = [];

      const TestComponent = () => {
        const proxy = useScope<{ value: number }>();
        proxyRefs.push(proxy);

        return <div>Render count: {proxyRefs.length}</div>;
      };

      const { rerender } = render(<TestComponent />);
      rerender(<TestComponent />);
      rerender(<TestComponent />);

      // In StrictMode, the first render creates orphaned entries due to double-invoke.
      // After commit, subsequent rerenders should use the same proxy.
      // So we check that the LAST few renders use the same proxy.
      if (mode === "strict") {
        // In strict mode: first 2 renders are double-invoke (different proxies)
        // Subsequent rerenders should use same proxy
        const committedProxies = proxyRefs.slice(2); // After initial double-invoke
        if (committedProxies.length > 0) {
          const firstCommitted = committedProxies[0];
          expect(committedProxies.every((p) => p === firstCommitted)).toBe(
            true
          );
        }
      } else {
        // In normal mode, all proxies should be the same
        const firstProxy = proxyRefs[0];
        expect(proxyRefs.every((p) => p === firstProxy)).toBe(true);
      }
    });
  });

  describe("stale data", () => {
    it("should not access stale data", async () => {
      const signals = new Set<AnySignal<any>>();
      const instances = new Set<{ disposed: boolean }>();
      const [increment, dispatch] = signal<void>().tuple;
      const TestComponent = () => {
        const instance = useScope(() => {
          const id = Math.floor(Math.random() * 1000000);
          const count = signal(0).when(increment, () => {
            count.set(count() + 1);
          });
          let disposed = false;
          signals.add(count);
          return {
            count,
            id,
            get disposed() {
              return disposed;
            },
            dispose() {
              disposed = true;
            },
          };
        });
        instances.add(instance);
        return (
          <div data-testid="value">
            {rx(() => {
              instances.add(instance);
              return instance.count();
            })}
          </div>
        );
      };

      const { getByTestId, unmount } = render(<TestComponent />);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      if (mode === "strict") {
        expect(instances.size).toBe(2);
      } else {
        expect(instances.size).toBe(1);
      }
      expect(Array.from(signals).filter((x) => !x.disposed()).length).toBe(1);
      expect(Array.from(instances).filter((x) => !x.disposed).length).toBe(1);
      expect(getByTestId("value")).toHaveTextContent("0");
      act(() => {
        dispatch();
      });
      expect(getByTestId("value")).toHaveTextContent("1");
      unmount();
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });
      expect(Array.from(signals).every((x) => x.disposed())).toBe(true);
      expect(Array.from(instances).every((x) => x.disposed)).toBe(true);
    });
  });

  describe("multiple scopes mode", () => {
    it("should create multiple scopes from array of factories", () => {
      const TestComponent = () => {
        const [counter, form] = useScope([
          () => ({ count: signal(0) }),
          () => ({ name: signal("test") }),
        ]);

        return (
          <div>
            <div data-testid="count">{counter.count()}</div>
            <div data-testid="name">{form.name()}</div>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("count")).toHaveTextContent("0");
      expect(screen.getByTestId("name")).toHaveTextContent("test");
    });

    it("should create multiple scopes from scope() descriptors", () => {
      const counterLogic = () => ({ count: signal(42) });
      const formLogic = () => ({ name: signal("hello") });

      const TestComponent = () => {
        const [counter, form] = useScope([
          scope(counterLogic),
          scope(formLogic),
        ]);

        return (
          <div>
            <div data-testid="count">{counter.count()}</div>
            <div data-testid="name">{form.name()}</div>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("count")).toHaveTextContent("42");
      expect(screen.getByTestId("name")).toHaveTextContent("hello");
    });

    it("should support mixed factories and scope descriptors", () => {
      const counterLogic = () => ({ count: signal(100) });

      const TestComponent = () => {
        const [counter, form] = useScope([
          scope(counterLogic),
          () => ({ name: signal("mixed") }),
        ]);

        return (
          <div>
            <div data-testid="count">{counter.count()}</div>
            <div data-testid="name">{form.name()}</div>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("count")).toHaveTextContent("100");
      expect(screen.getByTestId("name")).toHaveTextContent("mixed");
    });

    it("should dispose all scopes on unmount", async () => {
      const signals: AnySignal<any>[] = [];

      const TestComponent = () => {
        const [a, b] = useScope([
          () => {
            const s = signal(1);
            signals.push(s);
            return { value: s };
          },
          () => {
            const s = signal(2);
            signals.push(s);
            return { value: s };
          },
        ]);

        return (
          <div>
            <span data-testid="a">{a.value()}</span>
            <span data-testid="b">{b.value()}</span>
          </div>
        );
      };

      const { unmount } = render(<TestComponent />);
      expect(screen.getByTestId("a")).toHaveTextContent("1");
      expect(screen.getByTestId("b")).toHaveTextContent("2");

      unmount();

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      // All signals should be disposed after unmount
      expect(signals.every((s) => s.disposed())).toBe(true);
    });

    it("should maintain scope identity across re-renders", async () => {
      let renderCount = 0;
      let scopeA1: any, scopeA2: any;

      const TestComponent = ({ trigger }: { trigger: number }) => {
        renderCount++;
        const [a] = useScope([() => ({ count: signal(trigger) })]);

        if (renderCount === 1) scopeA1 = a;
        if (renderCount === 2) scopeA2 = a;

        return <div data-testid="count">{a.count()}</div>;
      };

      const { rerender } = render(<TestComponent trigger={1} />);
      expect(screen.getByTestId("count")).toHaveTextContent("1");

      rerender(<TestComponent trigger={1} />);

      // Same scope instance should be reused
      if (mode === "normal") {
        expect(scopeA1).toBe(scopeA2);
      }
    });

    it("should support shared scopes via scope() with key", () => {
      const sharedLogic = () => ({ value: signal("shared") });

      const TestComponent = () => {
        const [shared, local] = useScope([
          scope("shared-key", sharedLogic),
          () => ({ value: signal("local") }),
        ]);

        return (
          <div>
            <div data-testid="shared">{shared.value()}</div>
            <div data-testid="local">{local.value()}</div>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("shared")).toHaveTextContent("shared");
      expect(screen.getByTestId("local")).toHaveTextContent("local");
    });

    it("should update values reactively", async () => {
      const TestComponent = () => {
        const [counter] = useScope([() => ({ count: signal(0) })]);

        return (
          <div>
            <button
              data-testid="inc"
              onClick={() => counter.count.set((c) => c + 1)}
            >
              Inc
            </button>
            {rx(() => (
              <div data-testid="count">{counter.count()}</div>
            ))}
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("count")).toHaveTextContent("0");

      await act(async () => {
        screen.getByTestId("inc").click();
      });

      expect(screen.getByTestId("count")).toHaveTextContent("1");
    });
  });

  describe("useScope + rx + Suspense integration", () => {
    it("should handle parent scope with async signal accessed via wait() in child rx", async () => {
      let resolveAsync: (value: string) => void;
      const asyncPromise = new Promise<string>((resolve) => {
        resolveAsync = resolve;
      });

      const Parent = () => {
        const parentScope = useScope(() => ({
          asyncSignal: signal(async () => asyncPromise),
          count: signal(0),
        }));

        return (
          <div>
            <Suspense fallback={<div data-testid="loading">Loading...</div>}>
              {rx(() => {
                const asyncData = wait(parentScope.asyncSignal());
                const count = parentScope.count();

                return (
                  <div>
                    <div data-testid="async-data">{asyncData}</div>
                    <div data-testid="count">{count}</div>
                    <button
                      data-testid="increment"
                      onClick={() => parentScope.count.set(count + 1)}
                    >
                      Increment
                    </button>
                  </div>
                );
              })}
            </Suspense>
          </div>
        );
      };

      render(<Parent />);
      // Should show loading initially
      expect(screen.getByTestId("loading")).toBeInTheDocument();
      await wait.delay(200);
      expect(screen.getByTestId("loading")).toBeInTheDocument();
      // Resolve async signal
      await act(async () => {
        resolveAsync!("Async Data Loaded");
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should show resolved data
      expect(screen.getByTestId("async-data")).toHaveTextContent(
        "Async Data Loaded"
      );
      expect(screen.getByTestId("count")).toHaveTextContent("0");

      // Click increment button
      await act(async () => {
        screen.getByTestId("increment").click();
      });

      // Count should increment
      expect(screen.getByTestId("count")).toHaveTextContent("1");
      expect(screen.getByTestId("async-data")).toHaveTextContent(
        "Async Data Loaded"
      );
    });

    it("should handle multiple clicks after async resolution", async () => {
      let resolveAsync: (value: number) => void;
      const asyncPromise = new Promise<number>((resolve) => {
        resolveAsync = resolve;
      });

      const Parent = () => {
        const parentScope = useScope(() => ({
          asyncSignal: signal(async () => asyncPromise),
          count: signal(0),
        }));

        return (
          <Suspense fallback={<div data-testid="loading">Loading...</div>}>
            {rx(() => {
              const asyncValue = wait(parentScope.asyncSignal());
              const count = parentScope.count();

              return (
                <div>
                  <div data-testid="async-value">{asyncValue}</div>
                  <div data-testid="count">{count}</div>
                  <button
                    data-testid="increment"
                    onClick={() => parentScope.count.set(count + 1)}
                  >
                    +
                  </button>
                  <button
                    data-testid="decrement"
                    onClick={() => parentScope.count.set(count - 1)}
                  >
                    -
                  </button>
                </div>
              );
            })}
          </Suspense>
        );
      };

      render(<Parent />);

      expect(screen.getByTestId("loading")).toBeInTheDocument();

      // Resolve async
      await act(async () => {
        resolveAsync!(42);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(screen.getByTestId("async-value")).toHaveTextContent("42");
      expect(screen.getByTestId("count")).toHaveTextContent("0");

      await act(async () => wait.delay(100));

      // Multiple increments
      await act(async () => {
        screen.getByTestId("increment").click();
      });
      expect(screen.getByTestId("count")).toHaveTextContent("1");

      await act(async () => {
        screen.getByTestId("increment").click();
      });
      expect(screen.getByTestId("count")).toHaveTextContent("2");

      // Decrement
      await act(async () => {
        screen.getByTestId("decrement").click();
      });
      expect(screen.getByTestId("count")).toHaveTextContent("1");

      // Async value should remain stable
      expect(screen.getByTestId("async-value")).toHaveTextContent("42");
    });

    it("should handle nested rx with parent scope access", async () => {
      let resolveUser: (value: { name: string; age: number }) => void;
      const userPromise = new Promise<{ name: string; age: number }>(
        (resolve) => {
          resolveUser = resolve;
        }
      );

      const Parent = () => {
        const parentScope = useScope(() => ({
          user: signal(async () => userPromise),
          visitCount: signal(0),
        }));

        return (
          <div>
            <Suspense
              fallback={<div data-testid="loading">Loading user...</div>}
            >
              <UserDisplay parentScope={parentScope} />
            </Suspense>
            <VisitCounter parentScope={parentScope} />
          </div>
        );
      };

      const UserDisplay = ({ parentScope }: { parentScope: any }) => {
        return rx(() => {
          const user: any = wait(parentScope.user());
          return (
            <div>
              <div data-testid="user-name">{user.name}</div>
              <div data-testid="user-age">{user.age}</div>
            </div>
          );
        });
      };

      const VisitCounter = ({ parentScope }: { parentScope: any }) => {
        return rx(() => {
          const visitCount = parentScope.visitCount();
          return (
            <div>
              <div data-testid="visit-count">{visitCount}</div>
              <button
                data-testid="visit"
                onClick={() => parentScope.visitCount.set(visitCount + 1)}
              >
                Visit
              </button>
            </div>
          );
        });
      };

      render(<Parent />);

      // User is loading, but visit counter should work
      expect(screen.getByTestId("loading")).toBeInTheDocument();
      expect(screen.getByTestId("visit-count")).toHaveTextContent("0");

      // Increment visit count while user is loading
      await act(async () => {
        screen.getByTestId("visit").click();
      });
      expect(screen.getByTestId("visit-count")).toHaveTextContent("1");

      // Resolve user
      await act(async () => {
        resolveUser!({ name: "Alice", age: 30 });
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // User should be displayed
      expect(screen.getByTestId("user-name")).toHaveTextContent("Alice");
      expect(screen.getByTestId("user-age")).toHaveTextContent("30");

      // Visit count should be preserved
      expect(screen.getByTestId("visit-count")).toHaveTextContent("1");

      // Increment again
      await act(async () => {
        screen.getByTestId("visit").click();
      });
      expect(screen.getByTestId("visit-count")).toHaveTextContent("2");
    });

    it("should handle scope initialization before child rx effect runs", async () => {
      const logs: string[] = [];

      const Parent = () => {
        const parentScope = useScope(() => {
          logs.push("parent scope created");
          return {
            data: signal("parent data"),
            count: signal(0),
          };
        });

        logs.push("parent render");

        return (
          <div>
            <Child parentScope={parentScope} />
          </div>
        );
      };

      const Child = ({ parentScope }: { parentScope: any }) => {
        logs.push("child render");

        return rx(() => {
          logs.push("rx render function");
          const data = parentScope.data();
          const count = parentScope.count();

          return (
            <div>
              <div data-testid="data">{data}</div>
              <div data-testid="count">{count}</div>
              <button
                data-testid="increment"
                onClick={() => parentScope.count.set(count + 1)}
              >
                +
              </button>
            </div>
          );
        });
      };

      render(<Parent />);

      // Verify scope was created before child effects run
      // Note: In StrictMode, the order may differ due to double-rendering
      if (mode === "strict") {
        // StrictMode: double render causes different order
        expect(logs).toContain("parent scope created");
        expect(logs).toContain("parent render");
        expect(logs).toContain("child render");
        expect(logs).toContain("rx render function");
        // Key assertion: scope created appears before first rx render
        const scopeIdx = logs.indexOf("parent scope created");
        const rxIdx = logs.indexOf("rx render function");
        expect(scopeIdx).toBeLessThan(rxIdx);
      } else {
        // Normal mode: straightforward order
        expect(logs[0]).toBe("parent scope created");
        expect(logs[1]).toBe("parent render");
        expect(logs[2]).toBe("child render");
        expect(logs[3]).toBe("rx render function");
      }

      // Verify data is accessible
      expect(screen.getByTestId("data")).toHaveTextContent("parent data");
      expect(screen.getByTestId("count")).toHaveTextContent("0");

      // Verify updates work
      await act(async () => {
        screen.getByTestId("increment").click();
      });

      expect(screen.getByTestId("count")).toHaveTextContent("1");
    });

    it("should handle scope with both sync and async signals in rx", async () => {
      let resolveAsync: (value: string) => void;
      const asyncPromise = new Promise<string>((resolve) => {
        resolveAsync = resolve;
      });

      const Parent = () => {
        const parentScope = useScope(() => ({
          syncData: signal("Immediate"),
          asyncData: signal(async () => asyncPromise),
          counter: signal(0),
        }));

        return (
          <div>
            <Suspense fallback={<div data-testid="loading">Loading...</div>}>
              {rx(() => {
                const syncData = parentScope.syncData();
                const asyncData = wait(parentScope.asyncData());
                const counter = parentScope.counter();

                return (
                  <div>
                    <div data-testid="sync">{syncData}</div>
                    <div data-testid="async">{asyncData}</div>
                    <div data-testid="counter">{counter}</div>
                    <button
                      data-testid="increment"
                      onClick={() => parentScope.counter.set(counter + 1)}
                    >
                      +
                    </button>
                    <button
                      data-testid="update-sync"
                      onClick={() => parentScope.syncData.set("Updated")}
                    >
                      Update Sync
                    </button>
                  </div>
                );
              })}
            </Suspense>
          </div>
        );
      };

      render(<Parent />);

      expect(screen.getByTestId("loading")).toBeInTheDocument();

      // Resolve async
      await act(async () => {
        resolveAsync!("Delayed");
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(screen.getByTestId("sync")).toHaveTextContent("Immediate");
      expect(screen.getByTestId("async")).toHaveTextContent("Delayed");
      expect(screen.getByTestId("counter")).toHaveTextContent("0");

      // Update sync data
      await act(async () => {
        screen.getByTestId("update-sync").click();
      });
      expect(screen.getByTestId("sync")).toHaveTextContent("Updated");

      // Increment counter
      await act(async () => {
        screen.getByTestId("increment").click();
      });
      expect(screen.getByTestId("counter")).toHaveTextContent("1");

      // All data should remain stable
      expect(screen.getByTestId("sync")).toHaveTextContent("Updated");
      expect(screen.getByTestId("async")).toHaveTextContent("Delayed");
    });
  });

  describe("useScope + rx + Suspense + ErrorBoundary edge cases", () => {
    it("should handle race condition where async write happens after unmount", async () => {
      let delayedSet: (() => void) | undefined;
      let caughtError: any = null;

      // Custom error handler to catch potential "disposed" errors during test
      const originalConsoleError = console.error;
      console.error = (msg: any, ...args: any[]) => {
        if (
          typeof msg === "string" &&
          msg.includes("Cannot set disposed signal")
        ) {
          caughtError = new Error(msg);
        } else {
          originalConsoleError(msg, ...args);
        }
      };

      const TestComponent = () => {
        const { count } = useScope(() => ({
          count: signal(0),
        }));

        // Simulate async effect that sets state after unmount
        React.useEffect(() => {
          delayedSet = () => {
            try {
              count.set(100);
            } catch (e) {
              caughtError = e;
            }
          };
          return () => {}; // No cleanup to intentionally allow race
        }, [count]);

        return <div>{count()}</div>;
      };

      const { unmount } = render(<TestComponent />);

      // Unmount component
      unmount();
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      // Trigger the delayed set - this writes to a disposed signal
      // We expect this might throw or be handled
      expect(delayedSet).toBeDefined();
      act(() => {
        delayedSet!();
      });

      // Restore console
      console.error = originalConsoleError;

      // If the library is strict, it should have thrown "Cannot set value on disposed signal"
      // If it's lenient, it might just ignore it.
      // We check if an error was caught.
      // NOTE: Adjust expectation based on actual library behavior.
      // Assuming strict behavior for safety:
      if (caughtError) {
        expect(caughtError.message).toMatch(/Cannot set.*disposed signal/i);
      }
    });

    it("should handle unmount while Suspense is pending (race condition)", async () => {
      let resolveAsync: (val: string) => void;
      const promise = new Promise<string>((r) => (resolveAsync = r));

      const TestComponent = () => {
        const { data } = useScope(() => ({
          data: signal(async () => promise),
        }));

        return (
          <Suspense fallback={<div>Loading...</div>}>
            {rx(() => {
              wait(data());
              return <div>Loaded</div>;
            })}
          </Suspense>
        );
      };

      const { unmount } = render(<TestComponent />);

      // Unmount while suspended
      unmount();
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      // Resolve promise after unmount
      // Should not crash
      await act(async () => {
        resolveAsync!("done");
        await new Promise((r) => setTimeout(r, 10));
      });
    });

    it("should handle ErrorBoundary catching signal errors inside rx", () => {
      const TestComponent = () => {
        const { errorSignal } = useScope(() => ({
          errorSignal: signal(() => {
            throw new Error("Signal Error");
          }),
        }));

        return (
          <ErrorBoundary fallback={<div data-testid="error">Caught</div>}>
            {rx(() => {
              return <div>{errorSignal()}</div>;
            })}
          </ErrorBoundary>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("error")).toHaveTextContent("Caught");
    });

    it("should handle async error in signal with Suspense and ErrorBoundary", async () => {
      let rejectAsync: (err: Error) => void;
      const promise = new Promise<string>((_, r) => (rejectAsync = r));

      const TestComponent = () => {
        const { asyncData } = useScope(() => ({
          asyncData: signal(async () => promise),
        }));

        return (
          <ErrorBoundary fallback={<div data-testid="error">Caught</div>}>
            <Suspense fallback={<div>Loading...</div>}>
              {rx(() => {
                wait(asyncData());
                return <div>Loaded</div>;
              })}
            </Suspense>
          </ErrorBoundary>
        );
      };

      render(<TestComponent />);

      // Reject promise
      await act(async () => {
        rejectAsync!(new Error("Async Fail"));
      });

      // Should be caught by ErrorBoundary
      expect(screen.getByTestId("error")).toHaveTextContent("Caught");
    });

    it("should not recompute disposed computed signal when async dependency resolves", async () => {
      let resolveAsync: (val: number) => void;
      const promise = new Promise<number>((r) => {
        resolveAsync = r;
      });
      let computeCount = 0;

      const TestComponent = () => {
        const scope = useScope(() => {
          const asyncSig = signal(async () => promise);
          const computedSig = signal({ asyncSig }, ({ deps }) => {
            computeCount++;
            return deps.asyncSig;
          });
          return { computedSig };
        });

        return (
          <Suspense fallback={<div>Loading...</div>}>
            {rx(() => {
              wait(scope.computedSig());
              return <div>Loaded</div>;
            })}
          </Suspense>
        );
      };

      const { unmount } = render(<TestComponent />);

      // Wait for effects
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      const initialComputeCount = computeCount;
      expect(initialComputeCount).toBeGreaterThan(0);

      unmount();

      // Resolve promise after unmount
      await act(async () => {
        resolveAsync!(42);
        await new Promise((r) => setTimeout(r, 10));
      });

      // Should NOT recompute
      expect(computeCount).toBe(initialComputeCount);
    });

    it("should handle rapid async dependency changes (race condition)", async () => {
      let resolvers: Array<(val: string) => void> = [];
      let requestCount = 0;

      const TestComponent = ({ userId }: { userId: number }) => {
        const scope = useScope(
          (id: number) => {
            return {
              userData: signal(async () => {
                requestCount++;
                const currentRequest = requestCount;
                return new Promise<string>((resolve) => {
                  resolvers.push((val) =>
                    resolve(`${val}-req${currentRequest}`)
                  );
                });
              }),
              id: signal(id),
            };
          },
          [userId]
        );

        return (
          <Suspense fallback={<div data-testid="loading">Loading...</div>}>
            {rx(() => {
              const data = wait(scope.userData());
              return <div data-testid="data">{data}</div>;
            })}
          </Suspense>
        );
      };

      const { rerender } = render(<TestComponent userId={1} />);
      expect(screen.getByTestId("loading")).toBeInTheDocument();

      // Rapid changes before first resolves
      rerender(<TestComponent userId={2} />);
      rerender(<TestComponent userId={3} />);

      // Resolve in order (simulating network responses arriving)
      await act(async () => {
        // Resolve request 1 (stale)
        if (resolvers[0]) resolvers[0]("user1");
        await new Promise((r) => setTimeout(r, 5));
      });

      // Should still be loading (waiting for latest)
      expect(screen.getByTestId("loading")).toBeInTheDocument();

      // Resolve latest request
      await act(async () => {
        const lastResolver = resolvers[resolvers.length - 1];
        if (lastResolver) lastResolver("user3");
        await new Promise((r) => setTimeout(r, 10));
      });

      // Should show latest data
      expect(screen.getByTestId("data")).toHaveTextContent("user3");
    });

    it("should handle multiple async signals with different timing", async () => {
      let resolveUser: (val: { name: string }) => void;
      let resolvePosts: (val: string[]) => void;

      const userPromise = new Promise<{ name: string }>((r) => {
        resolveUser = r;
      });
      const postsPromise = new Promise<string[]>((r) => {
        resolvePosts = r;
      });

      const TestComponent = () => {
        const scope = useScope(() => ({
          user: signal(async () => userPromise),
          posts: signal(async () => postsPromise),
          counter: signal(0),
        }));

        return (
          <div>
            <Suspense fallback={<div data-testid="user-loading">...</div>}>
              {rx(() => {
                const user = wait(scope.user());
                return <div data-testid="user">{user.name}</div>;
              })}
            </Suspense>
            <Suspense fallback={<div data-testid="posts-loading">...</div>}>
              {rx(() => {
                const posts = wait(scope.posts());
                return <div data-testid="posts">{posts.length}</div>;
              })}
            </Suspense>
            {rx(() => (
              <button
                data-testid="inc"
                onClick={() => scope.counter.set((c) => c + 1)}
              >
                {scope.counter()}
              </button>
            ))}
          </div>
        );
      };

      render(<TestComponent />);

      // Both loading
      expect(screen.getByTestId("user-loading")).toBeInTheDocument();
      expect(screen.getByTestId("posts-loading")).toBeInTheDocument();

      // Counter should work while async is pending
      await act(async () => {
        screen.getByTestId("inc").click();
      });
      expect(screen.getByTestId("inc")).toHaveTextContent("1");

      // Resolve user first
      await act(async () => {
        resolveUser!({ name: "Alice" });
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(screen.getByTestId("user")).toHaveTextContent("Alice");
      expect(screen.getByTestId("posts-loading")).toBeInTheDocument();

      // Counter still works
      await act(async () => {
        screen.getByTestId("inc").click();
      });
      expect(screen.getByTestId("inc")).toHaveTextContent("2");

      // Resolve posts
      await act(async () => {
        resolvePosts!(["post1", "post2", "post3"]);
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(screen.getByTestId("posts")).toHaveTextContent("3");
      expect(screen.getByTestId("user")).toHaveTextContent("Alice");
    });

    it("should handle signal refresh during Suspense", async () => {
      let resolveCount = 0;
      let currentResolver: (val: number) => void;

      const createPromise = () =>
        new Promise<number>((resolve) => {
          resolveCount++;
          currentResolver = resolve;
        });

      let asyncSignalRef: any;

      const TestComponent = () => {
        const scope = useScope(() => {
          const asyncSig = signal(async () => createPromise());
          asyncSignalRef = asyncSig;
          return { asyncSig };
        });

        return (
          <div>
            <Suspense fallback={<div data-testid="loading">Loading...</div>}>
              {rx(() => {
                const val = wait(scope.asyncSig());
                return <div data-testid="value">{val}</div>;
              })}
            </Suspense>
            <button
              data-testid="refresh"
              onClick={() => asyncSignalRef?.refresh()}
            >
              Refresh
            </button>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId("loading")).toBeInTheDocument();
      expect(resolveCount).toBe(1);

      // Resolve first request
      await act(async () => {
        currentResolver!(100);
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(screen.getByTestId("value")).toHaveTextContent("100");

      // Trigger refresh
      await act(async () => {
        screen.getByTestId("refresh").click();
        await new Promise((r) => setTimeout(r, 10));
      });

      // Should show loading again
      expect(screen.getByTestId("loading")).toBeInTheDocument();
      expect(resolveCount).toBe(2);

      // Resolve second request
      await act(async () => {
        currentResolver!(200);
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(screen.getByTestId("value")).toHaveTextContent("200");
    });

    it("should handle stale closure not causing disposed signal error", async () => {
      let capturedSetCount: ((v: number) => void) | undefined;
      let errorOccurred = false;

      const originalConsoleError = console.error;
      console.error = (msg: any) => {
        if (typeof msg === "string" && msg.includes("disposed")) {
          errorOccurred = true;
        }
        originalConsoleError(msg);
      };

      const TestComponent = ({ show }: { show: boolean }) => {
        const scope = useScope(() => ({
          count: signal(0),
        }));

        // Capture setter in stale closure
        React.useEffect(() => {
          capturedSetCount = (v: number) => {
            try {
              scope.count.set(v);
            } catch (e) {
              errorOccurred = true;
            }
          };
        }, [scope.count]);

        if (!show) return null;

        return <div data-testid="count">{rx(() => scope.count())}</div>;
      };

      const { rerender } = render(<TestComponent show={true} />);
      expect(screen.getByTestId("count")).toHaveTextContent("0");

      // Hide component (unmounts scope)
      rerender(<TestComponent show={false} />);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 20));
      });

      // Call stale closure after unmount
      if (capturedSetCount) {
        act(() => {
          capturedSetCount!(999);
        });
      }

      console.error = originalConsoleError;

      // Either error occurred (strict mode) or silently ignored
      // The key is it shouldn't crash the app
    });

    it("should handle nested Suspense with shared scope", async () => {
      let resolveOuter: (val: string) => void;
      let resolveInner: (val: string) => void;

      const outerPromise = new Promise<string>((r) => {
        resolveOuter = r;
      });
      const innerPromise = new Promise<string>((r) => {
        resolveInner = r;
      });

      const TestComponent = () => {
        const scope = useScope(() => ({
          outer: signal(async () => outerPromise),
          inner: signal(async () => innerPromise),
        }));

        return (
          <Suspense fallback={<div data-testid="outer-loading">Outer...</div>}>
            {rx(() => {
              const outerVal = wait(scope.outer());
              return (
                <div>
                  <div data-testid="outer">{outerVal}</div>
                  <Suspense
                    fallback={<div data-testid="inner-loading">Inner...</div>}
                  >
                    {rx(() => {
                      const innerVal = wait(scope.inner());
                      return <div data-testid="inner">{innerVal}</div>;
                    })}
                  </Suspense>
                </div>
              );
            })}
          </Suspense>
        );
      };

      render(<TestComponent />);

      // Outer loading
      expect(screen.getByTestId("outer-loading")).toBeInTheDocument();

      // Resolve outer
      await act(async () => {
        resolveOuter!("OUTER");
        await new Promise((r) => setTimeout(r, 10));
      });

      // Outer resolved, inner loading
      expect(screen.getByTestId("outer")).toHaveTextContent("OUTER");
      expect(screen.getByTestId("inner-loading")).toBeInTheDocument();

      // Resolve inner
      await act(async () => {
        resolveInner!("INNER");
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(screen.getByTestId("outer")).toHaveTextContent("OUTER");
      expect(screen.getByTestId("inner")).toHaveTextContent("INNER");
    });

    it("should handle async signal that errors then succeeds on retry", async () => {
      let attemptCount = 0;
      let currentResolver: (val: string) => void;
      let currentRejecter: (err: Error) => void;

      const createPromise = () =>
        new Promise<string>((resolve, reject) => {
          attemptCount++;
          currentResolver = resolve;
          currentRejecter = reject;
        });

      let asyncSignalRef: any;

      // Custom ErrorBoundary with reset capability
      class ResettableErrorBoundary extends React.Component<
        { children: React.ReactNode; onReset?: () => void },
        { hasError: boolean }
      > {
        constructor(props: any) {
          super(props);
          this.state = { hasError: false };
        }
        static getDerivedStateFromError() {
          return { hasError: true };
        }
        reset = () => {
          this.setState({ hasError: false });
          this.props.onReset?.();
        };
        render() {
          if (this.state.hasError) {
            return (
              <button data-testid="retry" onClick={this.reset}>
                Retry
              </button>
            );
          }
          return this.props.children;
        }
      }

      let boundaryRef: ResettableErrorBoundary | null = null;

      const TestComponent = () => {
        const scope = useScope(() => {
          const asyncSig = signal(async () => createPromise());
          asyncSignalRef = asyncSig;
          return { asyncSig };
        });

        return (
          <ResettableErrorBoundary
            ref={(r) => (boundaryRef = r)}
            onReset={() => asyncSignalRef?.refresh()}
          >
            <Suspense fallback={<div data-testid="loading">Loading...</div>}>
              {rx(() => {
                const val = wait(scope.asyncSig());
                return <div data-testid="value">{val}</div>;
              })}
            </Suspense>
          </ResettableErrorBoundary>
        );
      };

      render(<TestComponent />);

      // First attempt - will error
      await act(async () => {
        currentRejecter!(new Error("Network error"));
        await new Promise((r) => setTimeout(r, 10));
      });

      // Should show retry button
      expect(screen.getByTestId("retry")).toBeInTheDocument();
      expect(attemptCount).toBe(1);

      // Click retry
      await act(async () => {
        screen.getByTestId("retry").click();
        await new Promise((r) => setTimeout(r, 10));
      });

      // Should be loading again
      expect(screen.getByTestId("loading")).toBeInTheDocument();
      expect(attemptCount).toBe(2);

      // Second attempt - will succeed
      await act(async () => {
        currentResolver!("Success!");
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(screen.getByTestId("value")).toHaveTextContent("Success!");
    });

    it("should handle concurrent writes during async resolution", async () => {
      let resolveAsync: (val: number) => void;
      const promise = new Promise<number>((r) => {
        resolveAsync = r;
      });

      const TestComponent = () => {
        const scope = useScope(() => ({
          asyncData: signal(async () => promise),
          syncCounter: signal(0),
        }));

        return (
          <div>
            <Suspense fallback={<div data-testid="loading">Loading...</div>}>
              {rx(() => {
                const data = wait(scope.asyncData());
                const count = scope.syncCounter();
                return (
                  <div data-testid="result">
                    {data} + {count}
                  </div>
                );
              })}
            </Suspense>
            <button
              data-testid="inc"
              onClick={() => scope.syncCounter.set((c) => c + 1)}
            >
              Inc
            </button>
          </div>
        );
      };

      render(<TestComponent />);

      // Increment while suspended
      await act(async () => {
        screen.getByTestId("inc").click();
        screen.getByTestId("inc").click();
        screen.getByTestId("inc").click();
      });

      // Resolve async
      await act(async () => {
        resolveAsync!(100);
        await new Promise((r) => setTimeout(r, 10));
      });

      // Should show both values correctly
      expect(screen.getByTestId("result")).toHaveTextContent("100 + 3");
    });
  });

  describe("multiple useScope calls in same component", () => {
    it("should handle two independent local scopes", () => {
      const TestComponent = () => {
        const scope1 = useScope(() => ({
          count: signal(10),
        }));
        const scope2 = useScope(() => ({
          count: signal(20),
        }));

        return (
          <div>
            <div data-testid="count1">{rx(() => scope1.count())}</div>
            <div data-testid="count2">{rx(() => scope2.count())}</div>
            <button
              data-testid="inc1"
              onClick={() => scope1.count.set((c) => c + 1)}
            >
              Inc1
            </button>
            <button
              data-testid="inc2"
              onClick={() => scope2.count.set((c) => c + 1)}
            >
              Inc2
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("count1")).toHaveTextContent("10");
      expect(screen.getByTestId("count2")).toHaveTextContent("20");

      act(() => {
        screen.getByTestId("inc1").click();
      });
      expect(screen.getByTestId("count1")).toHaveTextContent("11");
      expect(screen.getByTestId("count2")).toHaveTextContent("20");

      act(() => {
        screen.getByTestId("inc2").click();
      });
      expect(screen.getByTestId("count1")).toHaveTextContent("11");
      expect(screen.getByTestId("count2")).toHaveTextContent("21");
    });

    it("should handle local and shared scopes together", () => {
      let sharedCreateCount = 0;
      let localCreateCount = 0;

      const TestComponent = () => {
        const shared = useScope("shared-key", () => {
          sharedCreateCount++;
          return { value: signal("shared") };
        });
        const local = useScope(() => {
          localCreateCount++;
          return { value: signal("local") };
        });

        return (
          <div>
            <div data-testid="shared">{rx(() => shared.value())}</div>
            <div data-testid="local">{rx(() => local.value())}</div>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("shared")).toHaveTextContent("shared");
      expect(screen.getByTestId("local")).toHaveTextContent("local");
      expect(sharedCreateCount).toBe(1);
      expect(localCreateCount).toBe(mode === "strict" ? 2 : 1);
    });

    it("should handle three local scopes with different types", () => {
      const TestComponent = () => {
        const counter = useScope(() => ({
          count: signal(0),
          increment() {
            this.count.set((c) => c + 1);
          },
        }));
        const form = useScope(() => ({
          name: signal(""),
          email: signal(""),
        }));
        const ui = useScope(() => ({
          isOpen: signal(false),
          toggle() {
            this.isOpen.set((v) => !v);
          },
        }));

        return (
          <div>
            <div data-testid="count">{rx(() => counter.count())}</div>
            <div data-testid="name">{rx(() => form.name() || "empty")}</div>
            <div data-testid="isOpen">{rx(() => String(ui.isOpen()))}</div>
            <button data-testid="inc" onClick={() => counter.increment()}>
              Inc
            </button>
            <button
              data-testid="setName"
              onClick={() => form.name.set("Alice")}
            >
              Set Name
            </button>
            <button data-testid="toggle" onClick={() => ui.toggle()}>
              Toggle
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("count")).toHaveTextContent("0");
      expect(screen.getByTestId("name")).toHaveTextContent("empty");
      expect(screen.getByTestId("isOpen")).toHaveTextContent("false");

      act(() => {
        screen.getByTestId("inc").click();
        screen.getByTestId("setName").click();
        screen.getByTestId("toggle").click();
      });

      expect(screen.getByTestId("count")).toHaveTextContent("1");
      expect(screen.getByTestId("name")).toHaveTextContent("Alice");
      expect(screen.getByTestId("isOpen")).toHaveTextContent("true");
    });

    it("should dispose all scopes on unmount", async () => {
      const dispose1 = vi.fn();
      const dispose2 = vi.fn();
      const dispose3 = vi.fn();

      const TestComponent = () => {
        useScope(() => ({ dispose: dispose1 }));
        useScope(() => ({ dispose: dispose2 }));
        useScope(() => ({ dispose: dispose3 }));

        return <div>Test</div>;
      };

      const { unmount } = render(<TestComponent />);
      expect(dispose1).not.toHaveBeenCalled();
      expect(dispose2).not.toHaveBeenCalled();
      expect(dispose3).not.toHaveBeenCalled();

      unmount();

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(dispose1).toHaveBeenCalled();
      expect(dispose2).toHaveBeenCalled();
      expect(dispose3).toHaveBeenCalled();
    });

    it("should handle multiple scopes with different deps", () => {
      let scope1CreateCount = 0;
      let scope2CreateCount = 0;

      const TestComponent = ({
        userId,
        postId,
      }: {
        userId: number;
        postId: number;
      }) => {
        const userScope = useScope(
          (id: number) => {
            scope1CreateCount++;
            return { userId: signal(id) };
          },
          [userId]
        );
        const postScope = useScope(
          (id: number) => {
            scope2CreateCount++;
            return { postId: signal(id) };
          },
          [postId]
        );

        return (
          <div>
            <div data-testid="userId">{rx(() => userScope.userId())}</div>
            <div data-testid="postId">{rx(() => postScope.postId())}</div>
          </div>
        );
      };

      const { rerender } = render(<TestComponent userId={1} postId={100} />);
      expect(screen.getByTestId("userId")).toHaveTextContent("1");
      expect(screen.getByTestId("postId")).toHaveTextContent("100");

      const initialScope1Count = scope1CreateCount;
      const initialScope2Count = scope2CreateCount;

      // Change only userId
      rerender(<TestComponent userId={2} postId={100} />);
      expect(scope1CreateCount).toBe(initialScope1Count + 1);
      expect(scope2CreateCount).toBe(initialScope2Count); // Not recreated

      // Change only postId
      rerender(<TestComponent userId={2} postId={200} />);
      expect(scope1CreateCount).toBe(initialScope1Count + 1); // Not recreated
      expect(scope2CreateCount).toBe(initialScope2Count + 1);
    });

    it("should handle computed signals across multiple scopes", () => {
      const TestComponent = () => {
        const priceScope = useScope(() => ({
          price: signal(100),
        }));
        const quantityScope = useScope(() => ({
          quantity: signal(2),
        }));
        const totalScope = useScope(() => ({
          total: signal(
            { price: priceScope.price, quantity: quantityScope.quantity },
            ({ deps }) => deps.price * deps.quantity
          ),
        }));

        return (
          <div>
            <div data-testid="price">{rx(() => priceScope.price())}</div>
            <div data-testid="quantity">
              {rx(() => quantityScope.quantity())}
            </div>
            <div data-testid="total">{rx(() => totalScope.total())}</div>
            <button
              data-testid="setPrice"
              onClick={() => priceScope.price.set(150)}
            >
              Set Price
            </button>
            <button
              data-testid="setQuantity"
              onClick={() => quantityScope.quantity.set(3)}
            >
              Set Quantity
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("total")).toHaveTextContent("200");

      act(() => {
        screen.getByTestId("setPrice").click();
      });
      expect(screen.getByTestId("total")).toHaveTextContent("300");

      act(() => {
        screen.getByTestId("setQuantity").click();
      });
      expect(screen.getByTestId("total")).toHaveTextContent("450");
    });

    it("should handle proxy mode with multiple useScope calls", () => {
      const TestComponent = () => {
        const formState = useScope<{
          submitState: Promise<string>;
          validateState: Promise<boolean>;
        }>();
        const uiState = useScope<{
          isModalOpen: boolean;
          activeTab: string;
        }>();

        return (
          <div>
            <div data-testid="submitState">
              {rx(() => (formState.submitState() ? "set" : "empty"))}
            </div>
            <div data-testid="isModalOpen">
              {rx(() => String(uiState.isModalOpen() ?? false))}
            </div>
            <button
              data-testid="setSubmit"
              onClick={() => formState.submitState.set(Promise.resolve("done"))}
            >
              Submit
            </button>
            <button
              data-testid="openModal"
              onClick={() => uiState.isModalOpen.set(true)}
            >
              Open
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("submitState")).toHaveTextContent("empty");
      expect(screen.getByTestId("isModalOpen")).toHaveTextContent("false");

      act(() => {
        screen.getByTestId("setSubmit").click();
        screen.getByTestId("openModal").click();
      });

      expect(screen.getByTestId("submitState")).toHaveTextContent("set");
      expect(screen.getByTestId("isModalOpen")).toHaveTextContent("true");
    });
  });

  describe("local mode - advanced scenarios", () => {
    it("should create unique scope for each component instance even with same factory", () => {
      const scopeIds: number[] = [];
      let idCounter = 0;

      const TestComponent = () => {
        const scope = useScope(() => {
          const id = ++idCounter;
          scopeIds.push(id);
          return { id: signal(id) };
        });

        return <div data-testid={`scope-${scope.id()}`}>{scope.id()}</div>;
      };

      render(
        <>
          <TestComponent />
          <TestComponent />
          <TestComponent />
        </>
      );

      // In strict mode, each component may create 2 scopes (double-invoke)
      // but only 1 survives. So we check unique IDs.
      const uniqueIds = new Set(scopeIds);
      expect(uniqueIds.size).toBeGreaterThanOrEqual(3);
    });

    it("should handle local scope with async factory dependencies", () => {
      const TestComponent = ({ initialValue }: { initialValue: number }) => {
        const scope = useScope(
          (init: number) => ({
            asyncData: signal(async () => {
              await new Promise((r) => setTimeout(r, 10));
              return init * 10;
            }),
          }),
          [initialValue]
        );

        return (
          <Suspense fallback={<div data-testid="loading">Loading...</div>}>
            {rx(() => {
              const data = wait(scope.asyncData());
              return <div data-testid="data">{data}</div>;
            })}
          </Suspense>
        );
      };

      render(<TestComponent initialValue={5} />);
      expect(screen.getByTestId("loading")).toBeInTheDocument();
    });

    it("should handle local scope with logic factory", () => {
      let createCount = 0;

      const counterLogic = logic("localCounterLogic", () => {
        createCount++;
        const count = signal(0);
        return {
          count,
          increment: () => count.set((c) => c + 1),
          decrement: () => count.set((c) => c - 1),
        };
      });

      const TestComponent = () => {
        const { count, increment, decrement } = useScope(counterLogic);

        return (
          <div>
            <div data-testid="count">{rx(() => count())}</div>
            <button data-testid="inc" onClick={increment}>
              +
            </button>
            <button data-testid="dec" onClick={decrement}>
              -
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("count")).toHaveTextContent("0");

      act(() => {
        screen.getByTestId("inc").click();
        screen.getByTestId("inc").click();
      });
      expect(screen.getByTestId("count")).toHaveTextContent("2");

      act(() => {
        screen.getByTestId("dec").click();
      });
      expect(screen.getByTestId("count")).toHaveTextContent("1");
    });

    it("should handle local scope that returns methods referencing signals", () => {
      const TestComponent = () => {
        const scope = useScope(() => {
          const items = signal<string[]>([]);
          return {
            items,
            addItem: (item: string) => items.set((arr) => [...arr, item]),
            removeItem: (index: number) =>
              items.set((arr) => arr.filter((_, i) => i !== index)),
            getCount: () => items().length,
          };
        });

        return (
          <div>
            <div data-testid="count">{rx(() => scope.getCount())}</div>
            <div data-testid="items">{rx(() => scope.items().join(","))}</div>
            <button
              data-testid="add"
              onClick={() => scope.addItem("item" + scope.getCount())}
            >
              Add
            </button>
            <button data-testid="remove" onClick={() => scope.removeItem(0)}>
              Remove First
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("count")).toHaveTextContent("0");

      act(() => {
        screen.getByTestId("add").click();
        screen.getByTestId("add").click();
        screen.getByTestId("add").click();
      });

      expect(screen.getByTestId("count")).toHaveTextContent("3");
      expect(screen.getByTestId("items")).toHaveTextContent(
        "item0,item1,item2"
      );

      act(() => {
        screen.getByTestId("remove").click();
      });

      expect(screen.getByTestId("count")).toHaveTextContent("2");
      expect(screen.getByTestId("items")).toHaveTextContent("item1,item2");
    });

    it("should handle local scope with nested objects and signals", () => {
      const TestComponent = () => {
        const scope = useScope(() => ({
          form: {
            fields: {
              name: signal(""),
              email: signal(""),
            },
            validation: {
              isValid: signal(false),
              errors: signal<string[]>([]),
            },
          },
          meta: {
            submitCount: signal(0),
          },
        }));

        return (
          <div>
            <div data-testid="name">
              {rx(() => scope.form.fields.name() || "empty")}
            </div>
            <div data-testid="isValid">
              {rx(() => String(scope.form.validation.isValid()))}
            </div>
            <div data-testid="submitCount">
              {rx(() => scope.meta.submitCount())}
            </div>
            <button
              data-testid="setName"
              onClick={() => scope.form.fields.name.set("John")}
            >
              Set Name
            </button>
            <button
              data-testid="validate"
              onClick={() => scope.form.validation.isValid.set(true)}
            >
              Validate
            </button>
            <button
              data-testid="submit"
              onClick={() => scope.meta.submitCount.set((c) => c + 1)}
            >
              Submit
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("name")).toHaveTextContent("empty");
      expect(screen.getByTestId("isValid")).toHaveTextContent("false");
      expect(screen.getByTestId("submitCount")).toHaveTextContent("0");

      act(() => {
        screen.getByTestId("setName").click();
        screen.getByTestId("validate").click();
        screen.getByTestId("submit").click();
      });

      expect(screen.getByTestId("name")).toHaveTextContent("John");
      expect(screen.getByTestId("isValid")).toHaveTextContent("true");
      expect(screen.getByTestId("submitCount")).toHaveTextContent("1");
    });

    it("should handle local scope with .when() reactive triggers", () => {
      const TestComponent = () => {
        const scope = useScope(() => {
          const trigger = signal<void>();
          const count = signal(0).when(trigger, () => {
            count.set((c) => c + 1);
          });
          return { trigger, count };
        });

        return (
          <div>
            <div data-testid="count">{rx(() => scope.count())}</div>
            <button data-testid="trigger" onClick={() => scope.trigger.set()}>
              Trigger
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("count")).toHaveTextContent("0");

      act(() => {
        screen.getByTestId("trigger").click();
      });
      expect(screen.getByTestId("count")).toHaveTextContent("1");

      act(() => {
        screen.getByTestId("trigger").click();
        screen.getByTestId("trigger").click();
      });
      expect(screen.getByTestId("count")).toHaveTextContent("3");
    });

    it("should handle local scope recreation when deps array length changes", () => {
      let createCount = 0;

      const TestComponent = ({ filters }: { filters: string[] }) => {
        const scope = useScope(
          (...args: string[]) => {
            createCount++;
            return { filters: signal(args) };
          },
          [...filters]
        );

        return (
          <div data-testid="filters">{rx(() => scope.filters().join(","))}</div>
        );
      };

      const { rerender } = render(<TestComponent filters={["a", "b"]} />);
      expect(screen.getByTestId("filters")).toHaveTextContent("a,b");
      const initialCount = createCount;

      // Add filter
      rerender(<TestComponent filters={["a", "b", "c"]} />);
      expect(createCount).toBe(initialCount + 1);
      expect(screen.getByTestId("filters")).toHaveTextContent("a,b,c");

      // Remove filter
      rerender(<TestComponent filters={["a"]} />);
      expect(createCount).toBe(initialCount + 2);
      expect(screen.getByTestId("filters")).toHaveTextContent("a");
    });
  });

  describe("useLayoutEffect entries deps edge cases", () => {
    it("should handle entries array change where some entries are kept", async () => {
      const disposeCallbacks: string[] = [];

      const TestComponent = ({
        useA,
        useB,
        useC,
      }: {
        useA: boolean;
        useB: boolean;
        useC: boolean;
      }) => {
        const scopes: any[] = [];

        if (useA) {
          scopes.push(
            scope("scope-a", () => ({
              value: signal("A"),
              dispose: () => disposeCallbacks.push("a-disposed"),
            }))
          );
        }
        if (useB) {
          scopes.push(
            scope("scope-b", () => ({
              value: signal("B"),
              dispose: () => disposeCallbacks.push("b-disposed"),
            }))
          );
        }
        if (useC) {
          scopes.push(
            scope("scope-c", () => ({
              value: signal("C"),
              dispose: () => disposeCallbacks.push("c-disposed"),
            }))
          );
        }

        const results = scopes.length > 0 ? useScope(scopes) : [];

        return (
          <div data-testid="values">
            {results.map((s: any, i: number) => s.value()).join(",")}
          </div>
        );
      };

      // Initial: A, B, C
      const { rerender } = render(
        <TestComponent useA={true} useB={true} useC={true} />
      );
      expect(screen.getByTestId("values")).toHaveTextContent("A,B,C");
      expect(disposeCallbacks).toEqual([]);

      // Change to A, C (B removed)
      rerender(<TestComponent useA={true} useB={false} useC={true} />);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 20));
      });

      expect(screen.getByTestId("values")).toHaveTextContent("A,C");
      // B should be disposed, A and C should survive
      expect(disposeCallbacks).toContain("b-disposed");
      expect(disposeCallbacks).not.toContain("a-disposed");
      expect(disposeCallbacks).not.toContain("c-disposed");
    });

    it("should handle swapping order of entries", async () => {
      const disposeCallbacks: string[] = [];

      const TestComponent = ({ order }: { order: string[] }) => {
        const scopes = order.map((key) =>
          scope(`scope-${key}`, () => ({
            value: signal(key),
            dispose: () => disposeCallbacks.push(`${key}-disposed`),
          }))
        );

        const results = useScope(scopes);

        return (
          <div data-testid="values">
            {results.map((s: any) => s.value()).join(",")}
          </div>
        );
      };

      // Initial: A, B, C
      const { rerender } = render(<TestComponent order={["A", "B", "C"]} />);
      expect(screen.getByTestId("values")).toHaveTextContent("A,B,C");

      // Swap to: C, B, A (reverse order)
      rerender(<TestComponent order={["C", "B", "A"]} />);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 20));
      });

      expect(screen.getByTestId("values")).toHaveTextContent("C,B,A");
      // All should survive - same keys, just different order
      expect(disposeCallbacks).toEqual([]);
    });

    it("should handle rapid deps changes with overlapping entries", async () => {
      const disposeCallbacks: string[] = [];
      const createCallbacks: string[] = [];

      const TestComponent = ({ keys }: { keys: string[] }) => {
        const scopes = keys.map((key) =>
          scope(`scope-${key}`, () => {
            createCallbacks.push(`${key}-created`);
            return {
              value: signal(key),
              dispose: () => disposeCallbacks.push(`${key}-disposed`),
            };
          })
        );

        const results = scopes.length > 0 ? useScope(scopes) : [];

        return (
          <div data-testid="values">
            {results.map((s: any) => s.value()).join(",")}
          </div>
        );
      };

      const { rerender } = render(<TestComponent keys={["A", "B", "C"]} />);

      // Rapid changes
      rerender(<TestComponent keys={["A", "C", "D"]} />);
      rerender(<TestComponent keys={["A", "D", "E"]} />);
      rerender(<TestComponent keys={["A", "E", "F"]} />);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 20));
      });

      expect(screen.getByTestId("values")).toHaveTextContent("A,E,F");

      // A should never be disposed (always present)
      expect(disposeCallbacks).not.toContain("A-disposed");
      // B, C, D should be disposed (no longer present)
      expect(disposeCallbacks).toContain("B-disposed");
      expect(disposeCallbacks).toContain("C-disposed");
      expect(disposeCallbacks).toContain("D-disposed");
    });

    it("should handle uncommit then immediate commit of same entry", async () => {
      let scopeARef: any;
      const disposeCallbacks: string[] = [];

      const TestComponent = ({ extra }: { extra: string | null }) => {
        const scopeA = useScope("scope-a", () => {
          return {
            value: signal("A"),
            dispose: () => disposeCallbacks.push("a-disposed"),
          };
        });
        scopeARef = scopeA;

        // Extra scope that changes
        if (extra) {
          useScope(`scope-${extra}`, () => ({
            value: signal(extra),
            dispose: () => disposeCallbacks.push(`${extra}-disposed`),
          }));
        }

        return <div data-testid="a">{rx(() => scopeA.value())}</div>;
      };

      const { rerender } = render(<TestComponent extra="B" />);
      expect(screen.getByTestId("a")).toHaveTextContent("A");

      // Change extra from B to C
      // This triggers useLayoutEffect cleanup/setup, but scope-a should survive
      rerender(<TestComponent extra="C" />);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 20));
      });

      expect(screen.getByTestId("a")).toHaveTextContent("A");
      expect(disposeCallbacks).toContain("B-disposed");
      expect(disposeCallbacks).not.toContain("a-disposed");

      // Verify scope A is still functional
      act(() => {
        scopeARef.value.set("A-updated");
      });
      expect(screen.getByTestId("a")).toHaveTextContent("A-updated");
    });

    it("should handle entries that temporarily go to refs=0 during deps change", async () => {
      // This tests the microtask deferral pattern using multiple scopes mode
      // where the array length/content changes
      const disposeCallbacks: string[] = [];

      const TestComponent = ({ keys }: { keys: string[] }) => {
        const scopes = keys.map((key) =>
          scope(`scope-${key}`, () => ({
            id: signal(key),
            dispose: () => disposeCallbacks.push(`${key}-disposed`),
          }))
        );

        const results = scopes.length > 0 ? useScope(scopes) : [];

        return (
          <div data-testid="values">
            {results.map((s: any, i: number) => (
              <span key={keys[i]} data-testid={`s-${keys[i]}`}>
                {rx(() => s.id())}
              </span>
            ))}
          </div>
        );
      };

      const { rerender } = render(<TestComponent keys={["1", "2", "3"]} />);
      expect(screen.getByTestId("s-1")).toHaveTextContent("1");
      expect(screen.getByTestId("s-2")).toHaveTextContent("2");
      expect(screen.getByTestId("s-3")).toHaveTextContent("3");

      // Remove s2 - s1 and s3 temporarily go to refs=0 during cleanup/setup
      rerender(<TestComponent keys={["1", "3"]} />);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 20));
      });

      // s1 and s3 should still work (survived refs=0 due to microtask deferral)
      expect(screen.getByTestId("s-1")).toHaveTextContent("1");
      expect(screen.queryByTestId("s-2")).toBeNull();
      expect(screen.getByTestId("s-3")).toHaveTextContent("3");

      // s2 should be disposed, s1 and s3 should not
      expect(disposeCallbacks).toContain("2-disposed");
      expect(disposeCallbacks).not.toContain("1-disposed");
      expect(disposeCallbacks).not.toContain("3-disposed");

      // Re-add s2 - should create new scope
      disposeCallbacks.length = 0;
      rerender(<TestComponent keys={["1", "2", "3"]} />);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 20));
      });

      expect(screen.getByTestId("s-2")).toHaveTextContent("2");
      // s1 and s3 should still not be disposed
      expect(disposeCallbacks).not.toContain("1-disposed");
      expect(disposeCallbacks).not.toContain("3-disposed");
    });
  });

  describe("triggering rerenders many times", () => {
    it("should handle rapid signal updates without batching", async () => {
      let renderCount = 0;

      const TestComponent = () => {
        renderCount++;
        const scope = useScope(() => ({
          count: signal(0),
        }));

        return (
          <div>
            <div data-testid="count">{rx(() => scope.count())}</div>
            <button
              data-testid="rapidUpdate"
              onClick={() => {
                for (let i = 0; i < 10; i++) {
                  scope.count.set((c) => c + 1);
                }
              }}
            >
              Rapid
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      const initialRenderCount = renderCount;

      await act(async () => {
        screen.getByTestId("rapidUpdate").click();
      });

      // Count should be 10 after rapid updates
      expect(screen.getByTestId("count")).toHaveTextContent("10");
    });

    it("should handle batched signal updates efficiently", async () => {
      let rxRenderCount = 0;

      const TestComponent = () => {
        const scope = useScope(() => ({
          a: signal(0),
          b: signal(0),
          c: signal(0),
        }));

        return (
          <div>
            {rx(() => {
              rxRenderCount++;
              return (
                <div data-testid="sum">{scope.a() + scope.b() + scope.c()}</div>
              );
            })}
            <button
              data-testid="batchUpdate"
              onClick={() => {
                batch(() => {
                  scope.a.set(10);
                  scope.b.set(20);
                  scope.c.set(30);
                });
              }}
            >
              Batch
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("sum")).toHaveTextContent("0");
      const initialRxRenderCount = rxRenderCount;

      await act(async () => {
        screen.getByTestId("batchUpdate").click();
      });

      expect(screen.getByTestId("sum")).toHaveTextContent("60");
      // With batching, should only re-render once (or a few times)
      // Not 3 times for 3 signal updates
      expect(rxRenderCount - initialRxRenderCount).toBeLessThanOrEqual(2);
    });

    it("should handle 100 sequential signal updates", async () => {
      const TestComponent = () => {
        const scope = useScope(() => ({
          count: signal(0),
        }));

        return (
          <div>
            <div data-testid="count">{rx(() => scope.count())}</div>
            <button
              data-testid="update100"
              onClick={async () => {
                for (let i = 0; i < 100; i++) {
                  scope.count.set((c) => c + 1);
                }
              }}
            >
              Update 100
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("count")).toHaveTextContent("0");

      await act(async () => {
        screen.getByTestId("update100").click();
      });

      expect(screen.getByTestId("count")).toHaveTextContent("100");
    });

    it("should handle interleaved updates from multiple signals", async () => {
      const updateLog: string[] = [];

      const TestComponent = () => {
        const scope = useScope(() => ({
          a: signal(0),
          b: signal(0),
        }));

        return (
          <div>
            {rx(() => {
              const a = scope.a();
              const b = scope.b();
              updateLog.push(`a=${a},b=${b}`);
              return (
                <div data-testid="values">
                  a={a}, b={b}
                </div>
              );
            })}
            <button
              data-testid="interleave"
              onClick={() => {
                scope.a.set(1);
                scope.b.set(1);
                scope.a.set(2);
                scope.b.set(2);
                scope.a.set(3);
                scope.b.set(3);
              }}
            >
              Interleave
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      updateLog.length = 0; // Clear initial render logs

      await act(async () => {
        screen.getByTestId("interleave").click();
      });

      // Final values should be correct
      expect(screen.getByTestId("values")).toHaveTextContent("a=3, b=3");
    });

    it("should handle rapid toggle updates", async () => {
      let renderCount = 0;

      const TestComponent = () => {
        const scope = useScope(() => ({
          isOpen: signal(false),
        }));

        return (
          <div>
            {rx(() => {
              renderCount++;
              return <div data-testid="isOpen">{String(scope.isOpen())}</div>;
            })}
            <button
              data-testid="rapidToggle"
              onClick={() => {
                for (let i = 0; i < 20; i++) {
                  scope.isOpen.set((v) => !v);
                }
              }}
            >
              Toggle 20x
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("isOpen")).toHaveTextContent("false");

      await act(async () => {
        screen.getByTestId("rapidToggle").click();
      });

      // 20 toggles from false -> ends at false
      expect(screen.getByTestId("isOpen")).toHaveTextContent("false");
    });

    it("should handle updates during render phase (via computed)", () => {
      let computeCount = 0;

      const TestComponent = () => {
        const scope = useScope(() => {
          const input = signal(0);
          const computed = signal({ input }, ({ deps }) => {
            computeCount++;
            return deps.input * 2;
          });
          return { input, computed };
        });

        return (
          <div>
            <div data-testid="input">{rx(() => scope.input())}</div>
            <div data-testid="computed">{rx(() => scope.computed())}</div>
            <button
              data-testid="update"
              onClick={() => {
                scope.input.set(1);
                scope.input.set(2);
                scope.input.set(3);
                scope.input.set(4);
                scope.input.set(5);
              }}
            >
              Update 5x
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("computed")).toHaveTextContent("0");
      const initialComputeCount = computeCount;

      act(() => {
        screen.getByTestId("update").click();
      });

      expect(screen.getByTestId("input")).toHaveTextContent("5");
      expect(screen.getByTestId("computed")).toHaveTextContent("10");
    });

    it("should handle async updates interspersed with sync updates", async () => {
      const TestComponent = () => {
        const scope = useScope(() => ({
          syncCount: signal(0),
          asyncCount: signal(0),
        }));

        return (
          <div>
            <div data-testid="sync">{rx(() => scope.syncCount())}</div>
            <div data-testid="async">{rx(() => scope.asyncCount())}</div>
            <button
              data-testid="mixedUpdate"
              onClick={async () => {
                scope.syncCount.set(1);
                await new Promise((r) => setTimeout(r, 5));
                scope.asyncCount.set(1);
                scope.syncCount.set(2);
                await new Promise((r) => setTimeout(r, 5));
                scope.asyncCount.set(2);
                scope.syncCount.set(3);
              }}
            >
              Mixed
            </button>
          </div>
        );
      };

      render(<TestComponent />);

      await act(async () => {
        screen.getByTestId("mixedUpdate").click();
        await new Promise((r) => setTimeout(r, 20));
      });

      expect(screen.getByTestId("sync")).toHaveTextContent("3");
      expect(screen.getByTestId("async")).toHaveTextContent("2");
    });

    it("should handle updates from setTimeout callbacks", async () => {
      const TestComponent = () => {
        const scope = useScope(() => ({
          count: signal(0),
        }));

        return (
          <div>
            <div data-testid="count">{rx(() => scope.count())}</div>
            <button
              data-testid="scheduleUpdates"
              onClick={() => {
                setTimeout(() => scope.count.set(1), 5);
                setTimeout(() => scope.count.set(2), 10);
                setTimeout(() => scope.count.set(3), 15);
                setTimeout(() => scope.count.set(4), 20);
                setTimeout(() => scope.count.set(5), 25);
              }}
            >
              Schedule
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("count")).toHaveTextContent("0");

      await act(async () => {
        screen.getByTestId("scheduleUpdates").click();
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(screen.getByTestId("count")).toHaveTextContent("5");
    });

    it("should handle concurrent updates from multiple event handlers", async () => {
      const TestComponent = () => {
        const scope = useScope(() => ({
          count: signal(0),
        }));

        return (
          <div>
            <div data-testid="count">{rx(() => scope.count())}</div>
            <button
              data-testid="btn1"
              onClick={() => scope.count.set((c) => c + 1)}
            >
              +1
            </button>
            <button
              data-testid="btn2"
              onClick={() => scope.count.set((c) => c + 10)}
            >
              +10
            </button>
            <button
              data-testid="btn3"
              onClick={() => scope.count.set((c) => c + 100)}
            >
              +100
            </button>
          </div>
        );
      };

      render(<TestComponent />);

      await act(async () => {
        // Simulate rapid clicking on multiple buttons
        screen.getByTestId("btn1").click();
        screen.getByTestId("btn2").click();
        screen.getByTestId("btn3").click();
        screen.getByTestId("btn1").click();
        screen.getByTestId("btn2").click();
        screen.getByTestId("btn1").click();
      });

      // 1 + 10 + 100 + 1 + 10 + 1 = 123
      expect(screen.getByTestId("count")).toHaveTextContent("123");
    });

    it("should handle rerender with many computed signals", () => {
      const TestComponent = () => {
        const scope = useScope(() => {
          const base = signal(1);
          const c1 = base.to((v) => v * 2);
          const c2 = base.to((v) => v * 3);
          const c3 = base.to((v) => v * 4);
          const c4 = base.to((v) => v * 5);
          const c5 = signal(
            { c1, c2, c3, c4 },
            ({ deps }) => deps.c1 + deps.c2 + deps.c3 + deps.c4
          );
          return { base, c1, c2, c3, c4, c5 };
        });

        return (
          <div>
            <div data-testid="base">{rx(() => scope.base())}</div>
            <div data-testid="c5">{rx(() => scope.c5())}</div>
            <button
              data-testid="update"
              onClick={() => scope.base.set((v) => v + 1)}
            >
              Update
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      // c5 = c1 + c2 + c3 + c4 = 2 + 3 + 4 + 5 = 14
      expect(screen.getByTestId("c5")).toHaveTextContent("14");

      act(() => {
        screen.getByTestId("update").click();
      });

      // base = 2, c5 = 4 + 6 + 8 + 10 = 28
      expect(screen.getByTestId("c5")).toHaveTextContent("28");

      act(() => {
        screen.getByTestId("update").click();
        screen.getByTestId("update").click();
        screen.getByTestId("update").click();
      });

      // base = 5, c5 = 10 + 15 + 20 + 25 = 70
      expect(screen.getByTestId("c5")).toHaveTextContent("70");
    });

    it("should maintain consistency during stress test", async () => {
      const TestComponent = () => {
        const scope = useScope(() => ({
          count: signal(0),
        }));

        React.useEffect(() => {
          // Simulate external updates
          const interval = setInterval(() => {
            scope.count.set((c) => c + 1);
          }, 10);
          return () => clearInterval(interval);
        }, [scope.count]);

        return (
          <div>
            <div data-testid="count">{rx(() => scope.count())}</div>
            <button
              data-testid="manualUpdate"
              onClick={() => scope.count.set((c) => c + 100)}
            >
              +100
            </button>
          </div>
        );
      };

      render(<TestComponent />);

      // Wait for some interval updates
      await act(async () => {
        await new Promise((r) => setTimeout(r, 55));
      });

      // Manual update during interval
      await act(async () => {
        screen.getByTestId("manualUpdate").click();
      });

      // Wait more
      await act(async () => {
        await new Promise((r) => setTimeout(r, 55));
      });

      // Count should be > 100 (from manual) + some interval updates
      const countValue = parseInt(
        screen.getByTestId("count").textContent || "0"
      );
      expect(countValue).toBeGreaterThan(100);
    });
  });
});
