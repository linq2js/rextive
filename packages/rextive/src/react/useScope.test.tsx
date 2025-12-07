import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useScope, __clearCache } from "./useScope";
import { signal } from "../signal";
import { logic } from "../logic";
import "@testing-library/jest-dom/vitest";

describe("useScope", () => {
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
          useScope("abstract", abstractLogic as any);
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

      const TestComponent = ({ value }: { value: number | null | undefined }) => {
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

    it("should handle function references in args", () => {
      let createCount = 0;

      const TestComponent = ({ callback }: { callback: () => void }) => {
        const scope = useScope(
          "callback",
          (cb: () => void) => {
            createCount++;
            return { 
              callbackRef: cb,
              counter: signal(createCount) 
            };
          },
          [callback]
        );

        return <div data-testid="count">{scope.counter()}</div>;
      };

      const callback1 = () => {};
      const { rerender } = render(<TestComponent callback={callback1} />);
      expect(createCount).toBe(1);

      // Same function reference - should not recreate
      rerender(<TestComponent callback={callback1} />);
      expect(createCount).toBe(1);

      // Different function reference - should recreate
      const callback2 = () => {};
      rerender(<TestComponent callback={callback2} />);
      expect(createCount).toBe(2);
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
  });
});
