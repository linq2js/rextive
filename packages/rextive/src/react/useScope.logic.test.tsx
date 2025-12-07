import React, { StrictMode, Fragment } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useScope, __clearCache } from "./useScope";
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
      __clearCache();
    });

    afterEach(() => {
      logic.clear();
      __clearCache();
    });

    describe("with Logic (concrete)", () => {
      it("should create instance from logic using logic.create()", async () => {
        const counterLogic = logic("counterLogic", () => {
          const count = signal(0, { name: "counter.count" });
          const increment = () => count.set((x) => x + 1);
          return { count, increment };
        });

        const TestComponent = () => {
          // Pass logic directly - useScope detects and calls .create()
          const scope = useScope("counter", counterLogic);
          return <div data-testid="value">{scope.count()}</div>;
        };

        render(<TestComponent />, { wrapper });

        await act(async () => {
          await new Promise((r) => setTimeout(r, 10));
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
          const scope = useScope("counter", counterLogic);
          return <div>{scope.count()}</div>;
        };

        const { unmount } = render(<TestComponent />, { wrapper });

        await act(async () => {
          await new Promise((r) => setTimeout(r, 10));
        });

        // Clear any StrictMode orphan dispose calls
        disposeTracker.mockClear();

        unmount();

        await act(async () => {
          await new Promise((r) => setTimeout(r, 10));
        });

        // Should dispose on unmount
        expect(disposeTracker).toHaveBeenCalledTimes(1);
      });

      it("should create fresh instances with different keys", async () => {
        let createCount = 0;
        const counterLogic = logic("counterLogic", () => {
          createCount++;
          const count = signal(createCount, { name: "counter.count" });
          return { count };
        });

        const TestComponent = ({ id }: { id: number }) => {
          // Different keys = different instances
          const scope = useScope(`counter:${id}`, counterLogic);
          return <div data-testid="value">{scope.count()}</div>;
        };

        render(
          <>
            <TestComponent id={1} />
            <TestComponent id={2} />
          </>,
          { wrapper }
        );

        await act(async () => {
          await new Promise((r) => setTimeout(r, 10));
        });

        // Two different keys = two instances (may be doubled in StrictMode)
        expect(createCount).toBeGreaterThanOrEqual(2);
      });

      it("should work with logic that has signals", async () => {
        const todoLogic = logic("todoLogic", () => {
          const items = signal<string[]>([], { name: "todo.items" });
          const count = items.to((x) => x.length, { name: "todo.count" });
          const add = (item: string) => items.set((prev) => [...prev, item]);
          return { items, count, add };
        });

        let scopeRef: ReturnType<typeof todoLogic.create> | null = null as any;

        const TestComponent = () => {
          const scope = useScope("todo", todoLogic);
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
          await new Promise((r) => setTimeout(r, 10));
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

    describe("with AbstractLogic", () => {
      it("should throw when abstract logic is passed without override", () => {
        interface IApi {
          fetch(): Promise<string>;
        }

        const apiAbstract = logic.abstract<IApi>("apiAbstract");

        const TestComponent = () => {
          try {
            // Abstract logic without implementation should throw
            useScope("api", apiAbstract as any);
            return <div>Should not render</div>;
          } catch (error) {
            return (
              <div data-testid="error">
                {error instanceof Error ? error.message : "Unknown"}
              </div>
            );
          }
        };

        render(<TestComponent />, { wrapper });

        expect(screen.getByTestId("error")).toHaveTextContent(
          /Cannot create instance from abstract logic/
        );
      });
    });
  }
);

describe("useScope error handling with logic", () => {
  beforeEach(() => {
    logic.clear();
    __clearCache();
  });

  afterEach(() => {
    logic.clear();
    __clearCache();
  });

  it("should propagate errors from logic factory", () => {
    const failingLogic = logic("failingLogic", () => {
      throw new Error("Logic creation failed");
    });

    const TestComponent = () => {
      try {
        useScope("failing", failingLogic);
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
      const scope = useScope("async", asyncLogic);
      return <div data-testid="value">Has data signal</div>;
    };

    render(<TestComponent />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("value")).toHaveTextContent("Has data signal");
  });
});
