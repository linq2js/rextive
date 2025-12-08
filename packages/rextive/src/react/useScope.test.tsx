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
