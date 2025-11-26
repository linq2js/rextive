import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { signal } from "../signal";
import { useRx } from "./useRx";
import { getCurrent } from "../contextDispatcher";
import "@testing-library/jest-dom/vitest";

describe("useRx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic functionality", () => {
    it("should return the result of the function", () => {
      const TestComponent = () => {
        const result = useRx(() => "hello world");
        return <div data-testid="result">{result}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("result")).toHaveTextContent("hello world");
    });

    it("should return computed values", () => {
      const TestComponent = () => {
        const result = useRx(() => 2 + 2);
        return <div data-testid="result">{result}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("result")).toHaveTextContent("4");
    });

    it("should execute the function during render", () => {
      const fn = vi.fn(() => "executed");

      const TestComponent = () => {
        const result = useRx(fn);
        return <div>{result}</div>;
      };

      render(<TestComponent />);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe("signal tracking", () => {
    it("should track a single signal and re-render when it changes", async () => {
      const count = signal(0);

      const TestComponent = () => {
        const value = useRx(() => count());
        return <div data-testid="value">{value}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("0");

      // Update the signal
      act(() => {
        count.set(5);
      });

      await waitFor(() => {
        expect(screen.getByTestId("value")).toHaveTextContent("5");
      });

      count.dispose();
    });

    it("should track multiple signals and re-render when any changes", async () => {
      const a = signal(1);
      const b = signal(2);

      const TestComponent = () => {
        const sum = useRx(() => a() + b());
        return <div data-testid="sum">{sum}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("sum")).toHaveTextContent("3");

      // Update signal a
      act(() => {
        a.set(10);
      });

      await waitFor(() => {
        expect(screen.getByTestId("sum")).toHaveTextContent("12");
      });

      // Update signal b
      act(() => {
        b.set(20);
      });

      await waitFor(() => {
        expect(screen.getByTestId("sum")).toHaveTextContent("30");
      });

      a.dispose();
      b.dispose();
    });

    it("should only track signals that are actually accessed", async () => {
      const used = signal(1);
      const unused = signal(100);
      let renderCount = 0;

      const TestComponent = () => {
        renderCount++;
        const value = useRx(() => used());
        return <div data-testid="value">{value}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("1");
      const countAfterFirstRender = renderCount;

      // Update unused signal - should NOT trigger re-render
      act(() => {
        unused.set(200);
      });

      // Wait a bit to ensure no re-render happens
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(renderCount).toBe(countAfterFirstRender);

      // Update used signal - should trigger re-render
      act(() => {
        used.set(5);
      });

      await waitFor(() => {
        expect(screen.getByTestId("value")).toHaveTextContent("5");
      });

      used.dispose();
      unused.dispose();
    });

    it("should handle conditional signal access", async () => {
      const condition = signal(true);
      const valueA = signal("A");
      const valueB = signal("B");

      const TestComponent = () => {
        const result = useRx(() => (condition() ? valueA() : valueB()));
        return <div data-testid="result">{result}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("result")).toHaveTextContent("A");

      // Change condition to access valueB instead
      act(() => {
        condition.set(false);
      });

      await waitFor(() => {
        expect(screen.getByTestId("result")).toHaveTextContent("B");
      });

      // Update valueB
      act(() => {
        valueB.set("B2");
      });

      await waitFor(() => {
        expect(screen.getByTestId("result")).toHaveTextContent("B2");
      });

      condition.dispose();
      valueA.dispose();
      valueB.dispose();
    });
  });

  describe("context dispatcher", () => {
    it("should set up dispatcher context during function execution", () => {
      let capturedDispatcher: any = null;

      const TestComponent = () => {
        useRx(() => {
          capturedDispatcher = getCurrent();
          return "test";
        });
        return <div>Test</div>;
      };

      render(<TestComponent />);

      expect(capturedDispatcher).toBeDefined();
      expect(typeof capturedDispatcher.trackSignal).toBe("function");
      expect(typeof capturedDispatcher.trackLoadable).toBe("function");
    });

    it("should restore previous dispatcher after execution", () => {
      const originalDispatcher = getCurrent();

      const TestComponent = () => {
        useRx(() => "test");
        return <div>Test</div>;
      };

      render(<TestComponent />);

      // After render, dispatcher should be restored
      expect(getCurrent()).toBe(originalDispatcher);
    });
  });

  describe("cleanup and lifecycle", () => {
    it("should clean up subscriptions on unmount", async () => {
      const count = signal(0);
      let renderCount = 0;

      const TestComponent = () => {
        renderCount++;
        const value = useRx(() => count());
        return <div data-testid="value">{value}</div>;
      };

      const { unmount } = render(<TestComponent />);
      const countAfterFirstRender = renderCount;

      // Unmount
      unmount();

      // Update signal after unmount - should not cause issues or re-renders
      act(() => {
        count.set(10);
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(renderCount).toBe(countAfterFirstRender);

      count.dispose();
    });

    it("should re-track signals on each render", async () => {
      const count = signal(0);
      const enabled = signal(true);

      const TestComponent = () => {
        const value = useRx(() => {
          if (enabled()) {
            return count();
          }
          return "disabled";
        });
        return <div data-testid="value">{value}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("0");

      // Disable - now count should not be tracked
      act(() => {
        enabled.set(false);
      });

      await waitFor(() => {
        expect(screen.getByTestId("value")).toHaveTextContent("disabled");
      });

      count.dispose();
      enabled.dispose();
    });
  });

  describe("edge cases", () => {
    it("should handle signal reading without useRx (no tracking)", async () => {
      const count = signal(0);
      let renderCount = 0;

      const TestComponent = () => {
        renderCount++;
        // Direct read without useRx - should not cause re-renders
        const value = count();
        return <div data-testid="value">{value}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("0");
      const countAfterFirstRender = renderCount;

      // Update signal - should NOT trigger re-render (no tracking)
      act(() => {
        count.set(5);
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(renderCount).toBe(countAfterFirstRender);

      count.dispose();
    });

    it("should handle empty function", () => {
      const TestComponent = () => {
        const result = useRx(() => undefined);
        return <div data-testid="result">{String(result)}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("result")).toHaveTextContent("undefined");
    });

    it("should handle nested useRx calls", async () => {
      const outer = signal(1);
      const inner = signal(10);

      const InnerComponent = () => {
        const value = useRx(() => inner());
        return <span data-testid="inner">{value}</span>;
      };

      const OuterComponent = () => {
        const value = useRx(() => outer());
        return (
          <div>
            <span data-testid="outer">{value}</span>
            <InnerComponent />
          </div>
        );
      };

      render(<OuterComponent />);
      expect(screen.getByTestId("outer")).toHaveTextContent("1");
      expect(screen.getByTestId("inner")).toHaveTextContent("10");

      // Update outer
      act(() => {
        outer.set(2);
      });

      await waitFor(() => {
        expect(screen.getByTestId("outer")).toHaveTextContent("2");
      });

      // Update inner
      act(() => {
        inner.set(20);
      });

      await waitFor(() => {
        expect(screen.getByTestId("inner")).toHaveTextContent("20");
      });

      outer.dispose();
      inner.dispose();
    });

    it("should handle rapid signal updates", async () => {
      const count = signal(0);

      const TestComponent = () => {
        const value = useRx(() => count());
        return <div data-testid="value">{value}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId("value")).toHaveTextContent("0");

      // Rapid updates
      act(() => {
        count.set(1);
        count.set(2);
        count.set(3);
        count.set(4);
        count.set(5);
      });

      await waitFor(() => {
        expect(screen.getByTestId("value")).toHaveTextContent("5");
      });

      count.dispose();
    });
  });
});
