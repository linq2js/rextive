import React, { StrictMode, Fragment } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, renderHook } from "@testing-library/react";
import { useScope } from "./useScope";
import { useSafeFactory } from "./useSafeFactory";
import { signal } from "../signal";
import { logic } from "../logic";
import "@testing-library/jest-dom/vitest";

// Test modes: normal and StrictMode
const testModes = [
  { name: "normal", wrapper: Fragment, isStrictMode: false },
  { name: "StrictMode", wrapper: StrictMode, isStrictMode: true },
] as const;

describe.each(testModes)(
  "useScope with logic ($name mode)",
  ({ wrapper, isStrictMode }) => {
    beforeEach(() => {
      logic.clear();
      vi.useFakeTimers();
    });

    afterEach(() => {
      logic.clear();
      vi.useRealTimers();
    });

    describe("with Logic (concrete)", () => {
      it("should create instance from logic using .create()", async () => {
        const counterLogic = logic("counterLogic", () => {
          const count = signal(0, { name: "counter.count" });
          const increment = () => count.set((x) => x + 1);
          return { count, increment };
        });

        const TestComponent = () => {
          // useScope should detect logic and call .create()
          const scope = useScope(() => counterLogic.create());
          return <div data-testid="value">{scope.count()}</div>;
        };

        render(<TestComponent />, { wrapper });

        await act(async () => {
          await Promise.resolve();
        });

        expect(screen.getByTestId("value")).toHaveTextContent("0");
      });

      it("should auto-dispose logic instance on unmount", async () => {
        const disposeTracker = vi.fn();
        const counterLogic = logic("counterLogic", () => {
          const count = signal(0, { name: "counter.count" });
          return {
            count,
            dispose: disposeTracker,
          };
        });

        const TestComponent = () => {
          const scope = useScope(() => counterLogic.create());
          return <div>{scope.count()}</div>;
        };

        const { unmount } = render(<TestComponent />, { wrapper });

        await act(async () => {
          await Promise.resolve();
        });

        // Clear any StrictMode orphan dispose calls
        disposeTracker.mockClear();

        unmount();

        await act(async () => {
          await Promise.resolve();
        });

        // Should dispose on unmount
        expect(disposeTracker).toHaveBeenCalledTimes(1);
      });

      it("should create fresh instances when using .create()", async () => {
        let createCount = 0;
        const counterLogic = logic("counterLogic", () => {
          createCount++;
          const count = signal(createCount, { name: "counter.count" });
          return { count };
        });

        const TestComponent = ({ id }: { id: number }) => {
          const scope = useScope(() => counterLogic.create(), { watch: [id] });
          return <div data-testid="value">{scope.count()}</div>;
        };

        const { rerender } = render(<TestComponent id={1} />, { wrapper });

        await act(async () => {
          await Promise.resolve();
        });

        // Clear create count from StrictMode
        const initialCount = createCount;

        // Change id - should create new instance
        rerender(<TestComponent id={2} />);

        await act(async () => {
          await Promise.resolve();
        });

        expect(createCount).toBeGreaterThan(initialCount);
      });

      it("should work with logic that has signals", async () => {
        const todoLogic = logic("todoLogic", () => {
          const items = signal<string[]>([], { name: "todo.items" });
          const count = items.to((x) => x.length, { name: "todo.count" });
          const add = (item: string) => items.set((prev) => [...prev, item]);
          return { items, count, add };
        });

        let scopeRef: ReturnType<typeof todoLogic.create> | null = null;

        const TestComponent = () => {
          const scope = useScope(() => todoLogic.create());
          scopeRef = scope;
          return (
            <div>
              <div data-testid="count">{scope.count()}</div>
              <button data-testid="add" onClick={() => scope.add("test")}>
                Add
              </button>
            </div>
          );
        };

        render(<TestComponent />, { wrapper });

        await act(async () => {
          await Promise.resolve();
        });

        expect(screen.getByTestId("count")).toHaveTextContent("0");

        // Add item
        act(() => {
          scopeRef?.add("item1");
        });

        // Signal should be reactive
        expect(scopeRef?.count()).toBe(1);
      });
    });

  }
);

describe.each(testModes)(
  "useSafeFactory with logic ($name mode)",
  ({ wrapper, isStrictMode }) => {
    beforeEach(() => {
      logic.clear();
      vi.useFakeTimers();
    });

    afterEach(() => {
      logic.clear();
      vi.useRealTimers();
    });

    describe("with Logic (concrete)", () => {
      it("should detect logic and use .create() method", async () => {
        const counterLogic = logic("counterLogic", () => {
          const count = signal(0, { name: "counter.count" });
          return { count };
        });

        const { result } = renderHook(
          () => {
            const controller = useSafeFactory(counterLogic.create, []);

            React.useEffect(() => {
              controller.commit();
              return () => controller.scheduleDispose();
            }, [controller]);

            return controller;
          },
          { wrapper }
        );

        await act(async () => {
          await Promise.resolve();
        });

        expect(result.current.result.count()).toBe(0);
      });

      it("should auto-dispose logic instance signals on unmount", async () => {
        let countSignal: ReturnType<typeof signal<number>> | null = null;

        const counterLogic = logic("counterLogic", () => {
          countSignal = signal(0, { name: "counter.count" });
          return { count: countSignal };
        });

        const { unmount } = renderHook(
          () => {
            const controller = useSafeFactory(counterLogic.create, []);

            React.useEffect(() => {
              controller.commit();
              return () => controller.scheduleDispose();
            }, [controller]);

            return controller;
          },
          { wrapper }
        );

        await act(async () => {
          await Promise.resolve();
        });

        expect(countSignal).not.toBeNull();
        expect(countSignal!.disposed()).toBe(false);

        unmount();

        await act(async () => {
          await Promise.resolve();
        });

        expect(countSignal!.disposed()).toBe(true);
      });

      it("should call logic's dispose method on unmount", async () => {
        const disposeTracker = vi.fn();

        const counterLogic = logic("counterLogic", () => {
          const count = signal(0);
          return {
            count,
            dispose: disposeTracker,
          };
        });

        const { unmount } = renderHook(
          () => {
            const controller = useSafeFactory(counterLogic.create, []);

            React.useEffect(() => {
              controller.commit();
              return () => controller.scheduleDispose();
            }, [controller]);

            return controller;
          },
          { wrapper }
        );

        await act(async () => {
          await Promise.resolve();
        });

        // Clear any StrictMode orphan dispose calls
        disposeTracker.mockClear();

        unmount();

        await act(async () => {
          await Promise.resolve();
        });

        expect(disposeTracker).toHaveBeenCalledTimes(1);
      });

      it("should handle logic passed directly (detected via is())", async () => {
        const counterLogic = logic("counterLogic", () => {
          const count = signal(100, { name: "counter.count" });
          return { count };
        });

        const { result } = renderHook(
          () => {
            // Pass logic directly - useSafeFactory should detect and use .create()
            const controller = useSafeFactory(counterLogic, []);

            React.useEffect(() => {
              controller.commit();
              return () => controller.scheduleDispose();
            }, [controller]);

            return controller;
          },
          { wrapper }
        );

        await act(async () => {
          await Promise.resolve();
        });

        expect(result.current.result.count()).toBe(100);
      });

      it("should dispose old instance when deps change", async () => {
        const disposeTracker = vi.fn();
        let instanceCount = 0;

        const counterLogic = logic("counterLogic", () => {
          const id = ++instanceCount;
          const count = signal(id);
          return {
            id,
            count,
            dispose: () => disposeTracker(id),
          };
        });

        const { result, rerender } = renderHook(
          ({ dep }) => {
            const controller = useSafeFactory(counterLogic.create, [dep]);

            React.useEffect(() => {
              controller.commit();
              return () => controller.scheduleDispose();
            }, [controller]);

            return controller;
          },
          { initialProps: { dep: 1 }, wrapper }
        );

        await act(async () => {
          await Promise.resolve();
        });

        const firstId = result.current.result.id;

        // Clear any StrictMode dispose calls
        disposeTracker.mockClear();

        // Change dep - should create new instance and dispose old
        rerender({ dep: 2 });

        await act(async () => {
          await Promise.resolve();
        });

        expect(result.current.result.id).not.toBe(firstId);
        expect(disposeTracker).toHaveBeenCalledWith(firstId);
      });
    });

    describe("with AbstractLogic", () => {
      it("should throw when abstract logic is passed without override", () => {
        interface IApi {
          fetch(): Promise<string>;
        }

        const apiAbstract = logic.abstract<IApi>("apiAbstract");

        expect(() => {
          renderHook(
            () => {
              // useSafeFactory should detect abstract logic and throw
              return useSafeFactory(apiAbstract as any, []);
            },
            { wrapper }
          );
        }).toThrow(/Cannot create instance from abstract logic/);
      });
    });

    (isStrictMode ? describe : describe.skip)(
      "StrictMode orphan handling with logic",
      () => {
        it("should dispose orphaned logic instances in StrictMode", async () => {
          const disposeTracker = vi.fn();

          const counterLogic = logic("counterLogic", () => {
            const count = signal(0);
            return {
              count,
              dispose: disposeTracker,
            };
          });

          const { result } = renderHook(
            () => {
              const controller = useSafeFactory(counterLogic.create, []);

              React.useEffect(() => {
                controller.commit();
                return () => controller.scheduleDispose();
              }, [controller]);

              return controller;
            },
            { wrapper }
          );

          await act(async () => {
            await Promise.resolve();
          });

          // In StrictMode, first instance (orphan) should be disposed
          // The committed instance should still work
          expect(result.current.result.count()).toBe(0);
          expect(result.current.result.count.disposed()).toBe(false);

          // disposeTracker should have been called once for the orphan
          expect(disposeTracker).toHaveBeenCalledTimes(1);
        });
      }
    );
  }
);

describe("useScope error handling with logic", () => {
  beforeEach(() => {
    logic.clear();
  });

  afterEach(() => {
    logic.clear();
  });

  it("should propagate errors from logic factory", () => {
    const failingLogic = logic("failingLogic", () => {
      throw new Error("Logic creation failed");
    });

    const TestComponent = () => {
      try {
        useScope(() => failingLogic.create());
        return <div>Should not render</div>;
      } catch (error) {
        return (
          <div data-testid="error">
            {error instanceof Error ? error.message : "Unknown"}
          </div>
        );
      }
    };

    render(<TestComponent />);

    expect(screen.getByTestId("error")).toHaveTextContent(
      /Logic creation failed/
    );
  });

  it("should handle logic with async signals", async () => {
    const asyncLogic = logic("asyncLogic", () => {
      const data = signal(
        {},
        async () => {
          await new Promise((r) => setTimeout(r, 100));
          return { value: "loaded" };
        },
        { name: "async.data" }
      );

      return { data };
    });

    const TestComponent = () => {
      const scope = useScope(() => asyncLogic.create());
      return <div data-testid="value">Has data signal</div>;
    };

    render(<TestComponent />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("value")).toHaveTextContent("Has data signal");
  });
});

