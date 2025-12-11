import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { act, Suspense } from "react";
import { rx } from "./rx";
import { signal } from "../signal";
import "@testing-library/jest-dom/vitest";
import { wrappers } from "../test/strictModeTests";

describe.each(wrappers)("rx ($mode mode)", ({ render }) => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Overload 1: Single signal - rx(signal)", () => {
    it("should render sync signal value directly", () => {
      const count = signal(42);
      const TestComponent = () => <div>{rx(count)}</div>;

      render(<TestComponent />);
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("should update when signal changes", async () => {
      const count = signal(1);
      const TestComponent = () => <div>{rx(count)}</div>;

      render(<TestComponent />);
      expect(screen.getByText("1")).toBeInTheDocument();

      act(() => {
        count.set(2);
      });

      await waitFor(() => {
        expect(screen.getByText("2")).toBeInTheDocument();
      });
    });

    it("should work with async signals and Suspense", async () => {
      const asyncValue = signal(Promise.resolve(100));
      const TestComponent = () => (
        <Suspense fallback={<div data-testid="loading">Loading...</div>}>
          <div>{rx(asyncValue)}</div>
        </Suspense>
      );

      render(<TestComponent />);
      expect(screen.getByTestId("loading")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("100")).toBeInTheDocument();
      });
    });

    it("should render string values", () => {
      const message = signal("Hello World");
      const TestComponent = () => <div>{rx(message)}</div>;

      render(<TestComponent />);
      expect(screen.getByText("Hello World")).toBeInTheDocument();
    });

    it("should render JSX elements", () => {
      const content = signal(<span data-testid="jsx">JSX Content</span>);
      const TestComponent = () => <div>{rx(content)}</div>;

      render(<TestComponent />);
      expect(screen.getByTestId("jsx")).toHaveTextContent("JSX Content");
    });

    it("should handle null/undefined values", () => {
      const nullValue = signal<string | null>(null);
      const TestComponent = () => (
        <div data-testid="container">{rx(nullValue)}</div>
      );

      render(<TestComponent />);
      expect(screen.getByTestId("container")).toBeEmptyDOMElement();
    });
  });

  describe("Overload 2: Single signal with selector - rx(signal, selector)", () => {
    it("should render specific property of signal value", () => {
      const user = signal({ name: "Alice", age: 30 });
      const TestComponent = () => <div>{rx(user, "name")}</div>;

      render(<TestComponent />);
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    it("should update when property value changes", async () => {
      const user = signal({ name: "Alice", age: 30 });
      const TestComponent = () => <div>{rx(user, "name")}</div>;

      render(<TestComponent />);
      expect(screen.getByText("Alice")).toBeInTheDocument();

      act(() => {
        user.set({ name: "Bob", age: 35 });
      });

      await waitFor(() => {
        expect(screen.getByText("Bob")).toBeInTheDocument();
      });
    });

    it("should work with selector function", () => {
      const user = signal({ name: "Alice", age: 30 });
      const TestComponent = () => (
        <div>{rx(user, (u) => u.name.toUpperCase())}</div>
      );

      render(<TestComponent />);
      expect(screen.getByText("ALICE")).toBeInTheDocument();
    });

    it("should update when selector function result changes", async () => {
      const count = signal(5);
      const TestComponent = () => <div>{rx(count, (c) => c * 2)}</div>;

      render(<TestComponent />);
      expect(screen.getByText("10")).toBeInTheDocument();

      act(() => {
        count.set(10);
      });

      await waitFor(() => {
        expect(screen.getByText("20")).toBeInTheDocument();
      });
    });

    it("should work with properties from awaited values", async () => {
      const data = signal(Promise.resolve({ title: "Hello World", count: 42 }));
      const TestComponent = () => (
        <Suspense fallback={<div data-testid="loading">Loading...</div>}>
          <div>{rx(data, "title")}</div>
        </Suspense>
      );

      render(<TestComponent />);
      expect(screen.getByTestId("loading")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("Hello World")).toBeInTheDocument();
      });
    });

    it("should handle undefined properties gracefully", () => {
      const data = signal<{ value?: string }>({});
      const TestComponent = () => (
        <div data-testid="container">{rx(data, "value")}</div>
      );

      render(<TestComponent />);
      expect(screen.getByTestId("container")).toBeEmptyDOMElement();
    });
  });

  describe("Overload 3: Reactive function - rx(fn)", () => {
    it("should render result of function", () => {
      const TestComponent = () => <div>{rx(() => "Hello World")}</div>;

      render(<TestComponent />);
      expect(screen.getByText("Hello World")).toBeInTheDocument();
    });

    it("should track signals accessed in function", async () => {
      const count = signal(42);
      const TestComponent = () => <div>{rx(() => `Count: ${count()}`)}</div>;

      render(<TestComponent />);
      expect(screen.getByText("Count: 42")).toBeInTheDocument();

      act(() => {
        count.set(100);
      });

      await waitFor(() => {
        expect(screen.getByText("Count: 100")).toBeInTheDocument();
      });
    });

    it("should track multiple signals", async () => {
      const firstName = signal("John");
      const lastName = signal("Doe");
      const TestComponent = () => (
        <div>{rx(() => `${firstName()} ${lastName()}`)}</div>
      );

      render(<TestComponent />);
      expect(screen.getByText("John Doe")).toBeInTheDocument();

      act(() => {
        firstName.set("Jane");
      });

      await waitFor(() => {
        expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      });

      act(() => {
        lastName.set("Smith");
      });

      await waitFor(() => {
        expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      });
    });

    it("should render JSX from function", async () => {
      const user = signal({ name: "Alice", age: 30 });
      const TestComponent = () => (
        <div>
          {rx(() => (
            <span data-testid="user">
              {user().name} ({user().age})
            </span>
          ))}
        </div>
      );

      render(<TestComponent />);
      expect(screen.getByTestId("user")).toHaveTextContent("Alice (30)");

      act(() => {
        user.set({ name: "Bob", age: 25 });
      });

      await waitFor(() => {
        expect(screen.getByTestId("user")).toHaveTextContent("Bob (25)");
      });
    });

    it("should only track accessed signals (lazy tracking)", async () => {
      const tracked = signal(1);
      const untracked = signal(100);
      let renderCount = 0;

      const TestComponent = () => (
        <div>
          {rx(() => {
            renderCount++;
            return `Tracked: ${tracked()}`;
          })}
        </div>
      );

      render(<TestComponent />);
      expect(screen.getByText("Tracked: 1")).toBeInTheDocument();
      const initialCount = renderCount;

      // Changing untracked should NOT cause re-render
      act(() => {
        untracked.set(200);
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(renderCount).toBe(initialCount);

      // Changing tracked should cause re-render
      act(() => {
        tracked.set(2);
      });

      await waitFor(() => {
        expect(screen.getByText("Tracked: 2")).toBeInTheDocument();
      });
    });

    it("should handle conditional signal access", async () => {
      const showDetails = signal(false);
      const details = signal({ bio: "Developer" });
      let accessedDetails = false;

      const TestComponent = () => (
        <div>
          {rx(() => {
            if (showDetails()) {
              accessedDetails = true;
              return details().bio;
            }
            return "Hidden";
          })}
        </div>
      );

      render(<TestComponent />);
      expect(screen.getByText("Hidden")).toBeInTheDocument();
      expect(accessedDetails).toBe(false);

      // Change showDetails to true
      act(() => {
        showDetails.set(true);
      });

      await waitFor(() => {
        expect(screen.getByText("Developer")).toBeInTheDocument();
      });
      expect(accessedDetails).toBe(true);
    });

    it("should handle rapid signal updates", async () => {
      const count = signal(0);
      const TestComponent = () => <div>{rx(() => `Count: ${count()}`)}</div>;

      render(<TestComponent />);
      expect(screen.getByText("Count: 0")).toBeInTheDocument();

      // Rapid changes
      act(() => {
        count.set(1);
        count.set(2);
        count.set(3);
      });

      await waitFor(() => {
        expect(screen.getByText("Count: 3")).toBeInTheDocument();
      });
    });

    it("should cleanup subscriptions on unmount", async () => {
      const count = signal(0);
      let subscriptionCount = 0;

      const originalOn = count.on.bind(count);
      count.on = vi.fn((listener) => {
        subscriptionCount++;
        const unsubscribe = originalOn(listener);
        return () => {
          subscriptionCount--;
          unsubscribe();
        };
      });

      const TestComponent = () => <div>{rx(() => count())}</div>;

      const { unmount } = render(<TestComponent />);
      await waitFor(() => {
        expect(subscriptionCount).toBeGreaterThan(0);
      });

      unmount();
      expect(subscriptionCount).toBe(0);
    });
  });

  describe("Edge cases", () => {
    it("should throw error for invalid arguments", () => {
      expect(() => {
        // @ts-expect-error - intentionally passing invalid argument
        rx(123);
      }).toThrow();
    });

    it("should handle nested rx calls", async () => {
      const outer = signal("Outer");
      const inner = signal("Inner");

      const TestComponent = () => (
        <div>
          {rx(() => (
            <span>
              {outer()} - {rx(inner)}
            </span>
          ))}
        </div>
      );

      render(<TestComponent />);
      expect(screen.getByText("Outer - Inner")).toBeInTheDocument();

      act(() => {
        inner.set("Updated Inner");
      });

      await waitFor(() => {
        expect(screen.getByText("Outer - Updated Inner")).toBeInTheDocument();
      });
    });
  });

  describe("Overload 4: Component with reactive props - rx(Component, props)", () => {
    it("should render HTML element with signal props", async () => {
      const content = signal("Hello");

      const TestComponent = () => (
        <div data-testid="container">{rx("span", { children: content })}</div>
      );

      render(<TestComponent />);
      expect(screen.getByText("Hello")).toBeInTheDocument();

      act(() => {
        content.set("World");
      });

      await waitFor(() => {
        expect(screen.getByText("World")).toBeInTheDocument();
      });
    });

    it("should render HTML element with mixed signal and static props", async () => {
      const dynamicClass = signal("active");

      const TestComponent = () => (
        <div>
          {rx("span", {
            className: dynamicClass,
            "data-testid": "target",
            children: "Content",
          })}
        </div>
      );

      render(<TestComponent />);
      expect(screen.getByTestId("target")).toHaveClass("active");

      act(() => {
        dynamicClass.set("inactive");
      });

      await waitFor(() => {
        expect(screen.getByTestId("target")).toHaveClass("inactive");
      });
    });

    it("should render custom component with signal props", async () => {
      const count = signal(0);

      const Counter = ({ value }: { value: number }) => (
        <span data-testid="counter">{value}</span>
      );

      const TestComponent = () => <div>{rx(Counter, { value: count })}</div>;

      render(<TestComponent />);
      expect(screen.getByTestId("counter")).toHaveTextContent("0");

      act(() => {
        count.set(42);
      });

      await waitFor(() => {
        expect(screen.getByTestId("counter")).toHaveTextContent("42");
      });
    });

    it("should handle multiple signal props", async () => {
      const firstName = signal("John");
      const lastName = signal("Doe");

      const FullName = ({ first, last }: { first: string; last: string }) => (
        <span data-testid="fullname">
          {first} {last}
        </span>
      );

      const TestComponent = () => (
        <div>{rx(FullName, { first: firstName, last: lastName })}</div>
      );

      render(<TestComponent />);
      expect(screen.getByTestId("fullname")).toHaveTextContent("John Doe");

      act(() => {
        firstName.set("Jane");
      });

      await waitFor(() => {
        expect(screen.getByTestId("fullname")).toHaveTextContent("Jane Doe");
      });

      act(() => {
        lastName.set("Smith");
      });

      await waitFor(() => {
        expect(screen.getByTestId("fullname")).toHaveTextContent("Jane Smith");
      });
    });

    it("should handle static callback props alongside signal props", async () => {
      const count = signal(0);
      const handleClick = vi.fn();

      const Button = ({
        onClick,
        children,
      }: {
        onClick: () => void;
        children: number;
      }) => (
        <button data-testid="btn" onClick={onClick}>
          {children}
        </button>
      );

      const TestComponent = () => (
        <div>{rx(Button, { onClick: handleClick, children: count })}</div>
      );

      render(<TestComponent />);
      expect(screen.getByTestId("btn")).toHaveTextContent("0");

      fireEvent.click(screen.getByTestId("btn"));
      expect(handleClick).toHaveBeenCalledTimes(1);

      act(() => {
        count.set(5);
      });

      await waitFor(() => {
        expect(screen.getByTestId("btn")).toHaveTextContent("5");
      });
    });

    it("should handle async signal props with Suspense", async () => {
      let resolvePromise: (value: string) => void;
      const asyncValue = signal(
        new Promise<string>((resolve) => {
          resolvePromise = resolve;
        })
      );

      const Display = ({ text }: { text: string }) => (
        <span data-testid="display">{text}</span>
      );

      const TestComponent = () => (
        <Suspense fallback={<div data-testid="loading">Loading...</div>}>
          {rx(Display, { text: asyncValue })}
        </Suspense>
      );

      render(<TestComponent />);
      expect(screen.getByTestId("loading")).toBeInTheDocument();

      await act(async () => {
        resolvePromise!("Loaded!");
      });

      await waitFor(() => {
        expect(screen.getByTestId("display")).toHaveTextContent("Loaded!");
      });
    });
  });
});
