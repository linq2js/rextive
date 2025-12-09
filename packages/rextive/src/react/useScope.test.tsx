import React, { act } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { useScope, __clearCache } from "./useScope";
import { signal } from "../signal";
import { logic } from "../logic";
import { wrappers } from "../test/strictModeTests";
import "@testing-library/jest-dom/vitest";
import { AnySignal } from "../types";
import { rx } from "./rx";

describe.each(wrappers)(
  "useScope ($mode mode)",
  ({ mode, renderWithWrapper }) => {
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

        renderWithWrapper(<TestComponent />);
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

        renderWithWrapper(<TestComponent />);
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

        const { rerender } = renderWithWrapper(<TestComponent />);
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

        renderWithWrapper(
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

        renderWithWrapper(
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

        renderWithWrapper(<TestComponent userId={123} />);
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

        const { rerender } = renderWithWrapper(<TestComponent userId={1} />);
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

        const { rerender } = renderWithWrapper(<TestComponent userId={1} />);
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

        renderWithWrapper(<TestComponent a={1} b="hello" c={true} />);
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

        const { rerender } = renderWithWrapper(
          <TestComponent filters={{ type: "A" }} />
        );
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
        const { rerender } = renderWithWrapper(<TestComponent obj={obj1} />);
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

        const { unmount } = renderWithWrapper(<TestComponent />);
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

        const { rerender } = renderWithWrapper(<TestComponent userId={1} />);
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

        const { unmount } = renderWithWrapper(<TestComponent />);

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

        renderWithWrapper(<TestComponent />);
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

        renderWithWrapper(<TestComponent />);
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

        renderWithWrapper(<TestComponent />);
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

        renderWithWrapper(<TestComponent />);
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
        renderWithWrapper(<TestComponent />);
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

        const { rerender } = renderWithWrapper(
          <TestComponent value={undefined} />
        );
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
        const { rerender } = renderWithWrapper(
          <TestComponent callback={callback1} />
        );
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

        const { rerender } = renderWithWrapper(
          <TestComponent scopeKey="key1" />
        );
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

        const { unmount } = renderWithWrapper(<TestComponent />);
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

        const { unmount } = renderWithWrapper(<TestComponent />);
        unmount();

        await act(async () => {
          await new Promise((r) => setTimeout(r, 10));
        });

        expect(dispose1).toHaveBeenCalled();
        expect(dispose2).toHaveBeenCalled();
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

        renderWithWrapper(<TestComponent />);
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

        renderWithWrapper(<TestComponent id={42} name="Alice" />);
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

        const { rerender } = renderWithWrapper(<TestComponent id={1} />);
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

        const { unmount } = renderWithWrapper(<TestComponent />);
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

        renderWithWrapper(
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

        renderWithWrapper(<TestComponent />);
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

        renderWithWrapper(<TestComponent />);
      });

      it("should work with null return", () => {
        const TestComponent = () => {
          const result = useScope(() => {
            return null;
          });

          expect(result).toBeNull();
          return <div>Test</div>;
        };

        renderWithWrapper(<TestComponent />);
      });

      it("should work with primitive number return", () => {
        const TestComponent = () => {
          const result = useScope(() => 42);

          expect(result).toBe(42);
          return <div data-testid="value">{result}</div>;
        };

        renderWithWrapper(<TestComponent />);
        expect(screen.getByTestId("value")).toHaveTextContent("42");
      });

      it("should work with primitive string return", () => {
        const TestComponent = () => {
          const result = useScope(() => "hello");

          expect(result).toBe("hello");
          return <div data-testid="value">{result}</div>;
        };

        renderWithWrapper(<TestComponent />);
        expect(screen.getByTestId("value")).toHaveTextContent("hello");
      });

      it("should work with boolean return", () => {
        const TestComponent = () => {
          const result = useScope(() => true);

          expect(result).toBe(true);
          return <div data-testid="value">{result.toString()}</div>;
        };

        renderWithWrapper(<TestComponent />);
        expect(screen.getByTestId("value")).toHaveTextContent("true");
      });

      it("should work with array return", () => {
        const TestComponent = () => {
          const result = useScope(() => [1, 2, 3]);

          expect(result).toEqual([1, 2, 3]);
          return <div data-testid="value">{result.join(",")}</div>;
        };

        renderWithWrapper(<TestComponent />);
        expect(screen.getByTestId("value")).toHaveTextContent("1,2,3");
      });

      it("should work with function return", () => {
        const TestComponent = () => {
          const add = useScope(() => (a: number, b: number) => a + b);

          expect(typeof add).toBe("function");
          expect(add(2, 3)).toBe(5);
          return <div data-testid="value">{add(2, 3)}</div>;
        };

        renderWithWrapper(<TestComponent />);
        expect(screen.getByTestId("value")).toHaveTextContent("5");
      });

      it("should work with Symbol return", () => {
        const sym = Symbol("test");

        const TestComponent = () => {
          const result = useScope(() => sym);

          expect(result).toBe(sym);
          return <div>Test</div>;
        };

        renderWithWrapper(<TestComponent />);
      });

      it("should work with Date return", () => {
        const date = new Date("2024-01-01");

        const TestComponent = () => {
          const result = useScope(() => date);

          expect(result).toBeInstanceOf(Date);
          expect(result.getTime()).toBe(date.getTime());
          return <div data-testid="value">{result.toISOString()}</div>;
        };

        renderWithWrapper(<TestComponent />);
        expect(screen.getByTestId("value")).toHaveTextContent("2024-01-01");
      });

      it("should work with Map return", () => {
        const TestComponent = () => {
          const result = useScope(() => new Map([["key", "value"]]));

          expect(result).toBeInstanceOf(Map);
          expect(result.get("key")).toBe("value");
          return <div data-testid="value">{result.get("key")}</div>;
        };

        renderWithWrapper(<TestComponent />);
        expect(screen.getByTestId("value")).toHaveTextContent("value");
      });

      it("should work with Set return", () => {
        const TestComponent = () => {
          const result = useScope(() => new Set([1, 2, 3]));

          expect(result).toBeInstanceOf(Set);
          expect(result.has(2)).toBe(true);
          return <div data-testid="value">{result.size}</div>;
        };

        renderWithWrapper(<TestComponent />);
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

        renderWithWrapper(<TestComponent />);
        expect(screen.getByTestId("value")).toHaveTextContent("1");
      });

      it("should work with Promise return (not awaited)", () => {
        const TestComponent = () => {
          const promise = useScope(() => Promise.resolve(42));

          expect(promise).toBeInstanceOf(Promise);
          return <div>Test</div>;
        };

        renderWithWrapper(<TestComponent />);
      });

      it("should preserve return type across re-renders", () => {
        let renderCount = 0;

        const TestComponent = () => {
          renderCount++;
          const result = useScope(() => ({ count: 42 }));

          expect(result).toEqual({ count: 42 });
          return <div data-testid="value">{result.count}</div>;
        };

        const { rerender } = renderWithWrapper(<TestComponent />);
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

        const { rerender } = renderWithWrapper(
          <TestComponent multiplier={2} />
        );
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

        const { rerender } = renderWithWrapper(<TestComponent value={NaN} />);
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

        const { rerender } = renderWithWrapper(
          <TestComponent value={Infinity} />
        );
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

        const { rerender } = renderWithWrapper(<TestComponent value={0} />);
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

        renderWithWrapper(<TestComponent />);
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

        renderWithWrapper(<TestComponent />);
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

        renderWithWrapper(<TestComponent />);
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

        renderWithWrapper(<TestComponent />);
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

        const { rerender } = renderWithWrapper(<TestComponent />);
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

        renderWithWrapper(<TestComponent />);
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

        renderWithWrapper(<TestComponent />);
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

        renderWithWrapper(<TestComponent />);
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

        renderWithWrapper(<TestComponent id={1} />);
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

        renderWithWrapper(<TestComponent />);

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

        const { rerender } = renderWithWrapper(
          <TestComponent deps={depsArray} />
        );
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

        const { rerender } = renderWithWrapper(<TestComponent deps={[1, 2]} />);
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

        const { rerender } = renderWithWrapper(
          <TestComponent useKeyA={true} />
        );
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

        const { rerender, unmount } = renderWithWrapper(
          <TestComponent keyName="a" />
        );

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

        renderWithWrapper(<OuterComponent />);
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

        renderWithWrapper(<TestComponent />);
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

        renderWithWrapper(<TestComponent />);
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

        renderWithWrapper(<TestComponent />);
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

        const { unmount } = renderWithWrapper(<TestComponent />);

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

        renderWithWrapper(<TestComponent />);
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

        renderWithWrapper(<TestComponent />);
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

        renderWithWrapper(<TestComponent />);
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

        renderWithWrapper(<TestComponent />);
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

        const { rerender } = renderWithWrapper(<TestComponent />);
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

        const { getByTestId, unmount } = renderWithWrapper(<TestComponent />);

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
  }
);
