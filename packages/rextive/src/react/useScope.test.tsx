
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useScope } from "./useScope";
import { signal } from "../signal";
import "@testing-library/jest-dom/vitest";

describe("useScope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic functionality", () => {
    it("should create and return disposables", () => {
      const TestComponent = () => {
        const { count } = useScope(() => ({
          count: signal(0),
        }));

        return <div data-testid="value">{count()}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("0");
    });

    it("should create multiple disposables", () => {
      const TestComponent = () => {
        const { a, b, c } = useScope(() => ({
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

    it("should create scope once without watch dependencies", () => {
      let createCount = 0;
      const TestComponent = () => {
        const scope = useScope(() => {
          createCount++;
          return {
            count: signal(createCount),
          };
        });

        return <div data-testid="value">{scope.count()}</div>;
      };

      const { rerender } = render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("1");
      expect(createCount).toBe(1);

      // Re-render parent - scope should not be recreated
      rerender(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("1");
      expect(createCount).toBe(1);
    });
  });

  describe("automatic cleanup", () => {
    it("should dispose all disposables on unmount", async () => {
      const dispose1 = vi.fn();
      const dispose2 = vi.fn();

      const TestComponent = () => {
        useScope(() => ({
          a: { dispose: dispose1 } as any,
          b: { dispose: dispose2 } as any,
          dispose: [{ dispose: dispose1 } as any, { dispose: dispose2 } as any],
        }));

        return <div>Test</div>;
      };

      const { unmount } = render(<TestComponent />);
      expect(dispose1).not.toHaveBeenCalled();
      expect(dispose2).not.toHaveBeenCalled();

      unmount();
      await Promise.resolve(); // Wait for deferred disposal (StrictMode safety)
      // May be called multiple times due to StrictMode double-mounting
      expect(dispose1).toHaveBeenCalled();
      expect(dispose2).toHaveBeenCalled();
    });

    it("should dispose signals on unmount", async () => {
      const disposeSpy = vi.fn();
      const count = { dispose: disposeSpy, value: 0 } as any;

      const TestComponent = () => {
        const scope = useScope(() => ({
          count,
          dispose: [count], // Must explicitly include in dispose array
        }));

        return <div>{JSON.stringify(scope.count)}</div>;
      };

      const { unmount } = render(<TestComponent />);
      expect(disposeSpy).not.toHaveBeenCalled();

      unmount();
      await Promise.resolve(); // Wait for deferred disposal (StrictMode safety)
      // May be called multiple times due to StrictMode double-mounting
      expect(disposeSpy).toHaveBeenCalled();
    });

    it("should handle non-disposable objects in scope", () => {
      const TestComponent = () => {
        const b = signal(0);
        const scope = useScope(() => ({
          a: { noDispose: true } as any, // Non-disposable, not in dispose array
          b,
          dispose: [b], // Only dispose signal b
        }));

        return <div>{scope.b()}</div>;
      };

      // Should not throw - non-disposable objects are fine if not in dispose array
      const { unmount } = render(<TestComponent />);
      unmount();
    });
  });

  describe("watch dependencies", () => {
    it("should recreate scope when watch dependencies change", () => {
      let createCount = 0;
      const TestComponent = ({ userId }: { userId: number }) => {
        const scope = useScope(
          () => {
            createCount++;
            return {
              id: signal(userId),
            };
          },
          { watch: [userId] }
        );

        return <div data-testid="value">{scope.id()}</div>;
      };

      const { rerender } = render(<TestComponent userId={1} />);
      expect(screen.getByTestId("value")).toHaveTextContent("1");
      expect(createCount).toBe(1);

      // Change watch dependency
      rerender(<TestComponent userId={2} />);
      expect(screen.getByTestId("value")).toHaveTextContent("2");
      expect(createCount).toBe(2);
    });

    it("should not recreate scope when watch dependencies are same", () => {
      let createCount = 0;
      const TestComponent = ({ userId }: { userId: number }) => {
        const scope = useScope(
          () => {
            createCount++;
            return {
              id: signal(userId),
            };
          },
          { watch: [userId] }
        );

        return <div data-testid="value">{scope.id()}</div>;
      };

      const { rerender } = render(<TestComponent userId={1} />);
      expect(createCount).toBe(1);

      // Re-render with same userId
      rerender(<TestComponent userId={1} />);
      expect(createCount).toBe(1); // Should not recreate
    });

    it("should handle empty watch array", () => {
      let createCount = 0;
      const TestComponent = () => {
        const scope = useScope(
          () => {
            createCount++;
            return {
              count: signal(0),
            };
          },
          { watch: [] }
        );

        return <div>{scope.count()}</div>;
      };

      const { rerender } = render(<TestComponent />);
      expect(createCount).toBe(1);

      rerender(<TestComponent />);
      expect(createCount).toBe(1); // Should not recreate
    });

    it("should handle multiple watch dependencies", () => {
      let createCount = 0;
      const TestComponent = ({ a, b }: { a: number; b: string }) => {
        const scope = useScope(
          () => {
            createCount++;
            return {
              value: signal(`${a}-${b}`),
            };
          },
          { watch: [a, b] }
        );

        return <div data-testid="value">{scope.value()}</div>;
      };

      const { rerender } = render(<TestComponent a={1} b="hello" />);
      expect(screen.getByTestId("value")).toHaveTextContent("1-hello");
      expect(createCount).toBe(1);

      rerender(<TestComponent a={2} b="hello" />);
      expect(screen.getByTestId("value")).toHaveTextContent("2-hello");
      expect(createCount).toBe(2);

      rerender(<TestComponent a={2} b="world" />);
      expect(screen.getByTestId("value")).toHaveTextContent("2-world");
      expect(createCount).toBe(3);
    });
  });

  describe("integration with signals", () => {
    it("should work with computed signals", () => {
      const TestComponent = () => {
        const { count, doubled } = useScope(() => {
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
      let signalInstance: ReturnType<typeof signal<number>> | undefined;
      const TestComponent = () => {
        const { count } = useScope(() => ({
          count: signal(0),
        }));
        signalInstance = count;

        return (
          <div>
            <div data-testid="value">{count()}</div>
            <button
              data-testid="increment"
              onClick={() => count.set(count() + 1)}
            >
              Increment
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("0");
      expect(signalInstance).toBeDefined();

      // Verify signal can be updated
      act(() => {
        if (signalInstance) {
          signalInstance.set(5);
        }
      });

      // Verify signal value changed (even if component doesn't re-render)
      // This test verifies useScope doesn't interfere with signal functionality
      expect(signalInstance?.()).toBe(5);
    });
  });

  describe("edge cases", () => {
    it("should handle undefined options", () => {
      const TestComponent = () => {
        const scope = useScope(() => ({
          count: signal(0),
        }));

        return <div>{scope.count()}</div>;
      };

      // Should not throw
      render(<TestComponent />);
    });

    it("should handle empty scope object", () => {
      const TestComponent = () => {
        useScope(() => ({}));

        return <div>Empty</div>;
      };

      // Should not throw
      render(<TestComponent />);
    });

    it("should handle watch with undefined values", () => {
      let createCount = 0;
      const TestComponent = ({ value }: { value: number | undefined }) => {
        const scope = useScope(
          () => {
            createCount++;
            return {
              value: signal(value ?? 0),
            };
          },
          { watch: [value] }
        );

        return <div>{scope.value()}</div>;
      };

      const { rerender } = render(<TestComponent value={undefined} />);
      expect(createCount).toBe(1);

      rerender(<TestComponent value={1} />);
      expect(createCount).toBe(2);

      rerender(<TestComponent value={undefined} />);
      expect(createCount).toBe(3);
    });

    it("should handle watch with null values", () => {
      let createCount = 0;
      const TestComponent = ({ value }: { value: number | null }) => {
        const scope = useScope(
          () => {
            createCount++;
            return {
              value: signal(value ?? 0),
            };
          },
          { watch: [value] }
        );

        return <div>{scope.value()}</div>;
      };

      const { rerender } = render(<TestComponent value={null} />);
      expect(createCount).toBe(1);

      rerender(<TestComponent value={1} />);
      expect(createCount).toBe(2);

      rerender(<TestComponent value={null} />);
      expect(createCount).toBe(3);
    });
  });

  describe("complex scenarios", () => {
    it("should handle scope with mixed disposable types", async () => {
      const signalDispose = vi.fn();
      const customDispose = vi.fn();

      const TestComponent = () => {
        const scope = useScope(() => {
          const sig = { dispose: signalDispose, value: 0 } as any;
          const custom = {
            dispose: customDispose,
          } as any;

          return {
            signal: sig,
            custom,
            dispose: [sig, custom], // Explicitly list disposables for performance
          };
        });

        return <div>{JSON.stringify(scope.signal)}</div>;
      };

      const { unmount } = render(<TestComponent />);
      unmount();
      await Promise.resolve(); // Wait for deferred disposal (StrictMode safety)

      // May be called multiple times due to StrictMode double-mounting
      expect(signalDispose).toHaveBeenCalled();
      expect(customDispose).toHaveBeenCalled();
    });

    it("should handle function dependencies in watch array", () => {
      let createCount = 0;
      const TestComponent = ({ callback }: { callback: () => void }) => {
        const scope = useScope(
          () => {
            createCount++;
            return {
              value: signal(0),
            };
          },
          { watch: [callback] }
        );

        return <div>{scope.value()}</div>;
      };

      const callback1 = () => {};
      const { rerender } = render(<TestComponent callback={callback1} />);
      expect(createCount).toBe(1);

      // Same function reference
      rerender(<TestComponent callback={callback1} />);
      expect(createCount).toBe(1);

      // Different function reference
      const callback2 = () => {};
      rerender(<TestComponent callback={callback2} />);
      expect(createCount).toBe(2);
    });

    it("should handle watch being undefined", () => {
      let createCount = 0;
      const TestComponent = () => {
        const scope = useScope(
          () => {
            createCount++;
            return {
              count: signal(0),
            };
          }
          // watch is undefined
        );

        return <div>{scope.count()}</div>;
      };

      const { rerender } = render(<TestComponent />);
      expect(createCount).toBe(1);

      rerender(<TestComponent />);
      expect(createCount).toBe(1); // Should not recreate
    });

    it("should handle scope with no disposables (empty dispose methods)", () => {
      const TestComponent = () => {
        useScope(() => ({
          empty: {
            dispose: () => {},
          },
        }));

        return <div>Test</div>;
      };

      const { unmount } = render(<TestComponent />);
      // Should not throw
      unmount();
    });

    it("should handle dispose as a function", async () => {
      const disposeFn = vi.fn();

      const TestComponent = () => {
        useScope(() => ({
          dispose: disposeFn,
          other: signal(0),
        }));

        return <div>Test</div>;
      };

      const { unmount } = render(<TestComponent />);
      expect(disposeFn).not.toHaveBeenCalled();

      unmount();
      await Promise.resolve(); // Wait for deferred disposal (StrictMode safety)
      // May be called multiple times due to StrictMode double-mounting
      expect(disposeFn).toHaveBeenCalled();
    });

    it("should handle dispose as a single Disposable object", async () => {
      const disposeFn = vi.fn();

      const TestComponent = () => {
        useScope(() => ({
          dispose: { dispose: disposeFn } as any,
          other: signal(0),
        }));

        return <div>Test</div>;
      };

      const { unmount } = render(<TestComponent />);
      expect(disposeFn).not.toHaveBeenCalled();

      unmount();
      await Promise.resolve(); // Wait for deferred disposal (StrictMode safety)
      // May be called multiple times due to StrictMode double-mounting
      expect(disposeFn).toHaveBeenCalled();
    });

    it("should dispose signals listed in dispose property", async () => {
      const disposeSpy1 = vi.fn();
      const disposeSpy2 = vi.fn();

      const TestComponent = () => {
        const scope = useScope(() => {
          const sig1 = { dispose: disposeSpy1 } as any;
          const sig2 = { dispose: disposeSpy2 } as any;

          return {
            mySignal1: sig1,
            mySignal2: sig2,
            dispose: [sig1, sig2], // Explicitly list what to dispose
          };
        });

        return <div data-testid="sig1">{JSON.stringify(scope.mySignal1)}</div>;
      };

      const { unmount } = render(<TestComponent />);
      expect(disposeSpy1).not.toHaveBeenCalled();
      expect(disposeSpy2).not.toHaveBeenCalled();

      unmount();
      await Promise.resolve(); // Wait for deferred disposal (StrictMode safety)
      // May be called multiple times due to StrictMode double-mounting
      expect(disposeSpy1).toHaveBeenCalled();
      expect(disposeSpy2).toHaveBeenCalled();
    });

    it("should only dispose items in dispose property", async () => {
      const signalDispose = vi.fn();
      const regularFn = vi.fn();

      const TestComponent = () => {
        const mySignal = { dispose: signalDispose } as any;
        useScope(() => ({
          mySignal,
          notASignal: { some: "data" },
          myFunction: regularFn,
          dispose: [mySignal], // Only dispose mySignal, not other properties
        }));

        return <div>Test</div>;
      };

      const { unmount } = render(<TestComponent />);
      unmount();
      await Promise.resolve(); // Wait for deferred disposal (StrictMode safety)
      // Only signal's dispose should be called (may be multiple times due to StrictMode)
      expect(signalDispose).toHaveBeenCalled();
      // Regular function should not be called during dispose
      expect(regularFn).not.toHaveBeenCalled();
    });
  });

  describe("lifecycle mode - component callbacks", () => {
    it("should support component lifecycle mode", () => {
      const init = vi.fn();
      const mount = vi.fn();
      const renderCallback = vi.fn();

      const TestComponent = () => {
        const getPhase = useScope({
          init,
          mount,
          render: renderCallback,
        });

        return <div>{getPhase()}</div>;
      };

      render(<TestComponent />);

      expect(init).toHaveBeenCalledTimes(1);
      expect(renderCallback).toHaveBeenCalledTimes(1);
    });

    it("should return getPhase function", () => {
      const TestComponent = () => {
        const getPhase = useScope({
          init: () => {},
        });

        return <div>{getPhase()}</div>;
      };

      const { container } = render(<TestComponent />);
      expect(container.textContent).toMatch(/render|mount/);
    });
  });

  describe("lifecycle mode - object tracking", () => {
    it("should support object lifecycle mode", () => {
      const user = { id: 1, name: "John" };
      const init = vi.fn();
      const mount = vi.fn();

      const TestComponent = () => {
        const getPhase = useScope({
          for: user,
          init,
          mount,
        });

        return (
          <div>
            {user.name} - {getPhase()}
          </div>
        );
      };

      render(<TestComponent />);

      expect(init).toHaveBeenCalledWith(user);
    });

    it("should reinitialize when object reference changes", async () => {
      const user1 = { id: 1, name: "John" };
      const user2 = { id: 2, name: "Jane" };
      const init = vi.fn();
      const dispose = vi.fn();

      const TestComponent = ({ user }: { user: typeof user1 }) => {
        useScope({
          for: user,
          init,
          dispose,
        });

        return <div>{user.name}</div>;
      };

      const { rerender } = render(<TestComponent user={user1} />);

      expect(init).toHaveBeenCalledWith(user1);
      expect(init).toHaveBeenCalledTimes(1);

      rerender(<TestComponent user={user2} />);

      // Should dispose old and init new
      await vi.waitFor(() => {
        expect(dispose).toHaveBeenCalledWith(user1);
        expect(init).toHaveBeenCalledWith(user2);
        expect(init).toHaveBeenCalledTimes(2);
      });
    });
  });
});
