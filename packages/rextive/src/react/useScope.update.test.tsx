import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { act, useState } from "react";
import { useScope } from "./useScope";
import { signal } from "../index";

describe("useScope update callback", () => {
  it("should call update after every render when no deps provided", () => {
    const updateFn = vi.fn();
    let renderCount = 0;

    function TestComponent() {
      const [count, setCount] = useState(0);
      renderCount++;

      useScope({
        update: () => {
          updateFn(renderCount);
        },
      });

      return (
        <div>
          <button onClick={() => setCount(count + 1)}>Increment</button>
          <span>{count}</span>
        </div>
      );
    }

    const { rerender } = render(<TestComponent />);

    // Initial render + mount
    expect(updateFn).toHaveBeenCalledTimes(1);
    expect(updateFn).toHaveBeenLastCalledWith(1);

    // Trigger re-render
    act(() => {
      screen.getByRole("button").click();
    });
    expect(updateFn).toHaveBeenCalledTimes(2);
    expect(updateFn).toHaveBeenLastCalledWith(2);

    // Force another re-render
    rerender(<TestComponent />);
    expect(updateFn).toHaveBeenCalledTimes(3);
  });

  it("should call update only when deps change", () => {
    const updateFn = vi.fn();

    function TestComponent({ userId }: { userId: number }) {
      const [otherState, setOtherState] = useState(0);

      useScope({
        update: [(scope) => updateFn(userId), userId],
      });

      return (
        <div>
          <button onClick={() => setOtherState(otherState + 1)}>
            Update Other State
          </button>
          <span>User: {userId}</span>
        </div>
      );
    }

    const { rerender } = render(<TestComponent userId={1} />);

    // Initial render
    expect(updateFn).toHaveBeenCalledTimes(1);
    expect(updateFn).toHaveBeenLastCalledWith(1);

    // Change other state (should NOT trigger update)
    act(() => {
      screen.getByRole("button").click();
    });
    expect(updateFn).toHaveBeenCalledTimes(1); // Still 1

    // Change userId (SHOULD trigger update)
    rerender(<TestComponent userId={2} />);
    expect(updateFn).toHaveBeenCalledTimes(2);
    expect(updateFn).toHaveBeenLastCalledWith(2);
  });

  it("should work in factory mode with scope object", () => {
    const measurements: Array<{ width: number; height: number }> = [];

    function TestComponent({ width }: { width: number }) {
      const scope = useScope(
        () => {
          const size = signal({ width: 0, height: 0 });
          return { size };
        },
        {
          update: (scope) => {
            // Simulate DOM measurement
            const newSize = { width: width * 10, height: 100 };
            scope.size.set(newSize);
            measurements.push(newSize);
          },
        }
      );

      return <div>Size: {scope.size().width}</div>;
    }

    const { rerender } = render(<TestComponent width={5} />);

    // Initial render
    expect(measurements).toHaveLength(1);
    expect(measurements[0]).toEqual({ width: 50, height: 100 });

    // Re-render (should call update again)
    rerender(<TestComponent width={5} />);
    expect(measurements).toHaveLength(2);

    // Re-render with different width
    rerender(<TestComponent width={10} />);
    expect(measurements).toHaveLength(3);
    expect(measurements[2]).toEqual({ width: 100, height: 100 });
  });

  it("should work in factory mode with deps array", () => {
    const updateFn = vi.fn();

    function TestComponent({ userId }: { userId: number }) {
      const [localState, setLocalState] = useState(0);

      const scope = useScope(
        () => {
          const data = signal(null);
          return { data };
        },
        {
          update: [(scope) => updateFn(userId, localState), userId],
        }
      );

      return (
        <div>
          <button onClick={() => setLocalState(localState + 1)}>
            Local Update
          </button>
        </div>
      );
    }

    const { rerender } = render(<TestComponent userId={1} />);

    // Initial render
    expect(updateFn).toHaveBeenCalledTimes(1);
    expect(updateFn).toHaveBeenLastCalledWith(1, 0);

    // Update local state (should NOT trigger update because userId didn't change)
    act(() => {
      screen.getByRole("button").click();
    });
    expect(updateFn).toHaveBeenCalledTimes(1);

    // Change userId (SHOULD trigger update)
    rerender(<TestComponent userId={2} />);
    expect(updateFn).toHaveBeenCalledTimes(2);
    expect(updateFn).toHaveBeenLastCalledWith(2, 1); // localState is 1 from click
  });

  it("should work with empty deps array (run only once after mount)", () => {
    const updateFn = vi.fn();

    function TestComponent() {
      const [count, setCount] = useState(0);

      useScope({
        update: [() => updateFn(), /* empty deps */],
      });

      return (
        <div>
          <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
      );
    }

    render(<TestComponent />);

    // Should run once after mount
    expect(updateFn).toHaveBeenCalledTimes(1);

    // Re-render should NOT call update (empty deps)
    act(() => {
      screen.getByRole("button").click();
    });
    expect(updateFn).toHaveBeenCalledTimes(1); // Still 1
  });

  it("should work in object lifecycle mode", () => {
    const updateFn = vi.fn();

    function TestComponent({ user }: { user: { id: number; name: string } }) {
      useScope({
        for: user,
        update: (u) => updateFn(u.id, u.name),
      });

      return <div>{user.name}</div>;
    }

    const { rerender } = render(
      <TestComponent user={{ id: 1, name: "Alice" }} />
    );

    // Initial render
    expect(updateFn).toHaveBeenCalledTimes(1);
    expect(updateFn).toHaveBeenLastCalledWith(1, "Alice");

    // Re-render with same user (should call update)
    rerender(<TestComponent user={{ id: 1, name: "Alice" }} />);
    expect(updateFn).toHaveBeenCalledTimes(2);

    // Re-render with different user
    rerender(<TestComponent user={{ id: 2, name: "Bob" }} />);
    expect(updateFn).toHaveBeenCalledTimes(3);
    expect(updateFn).toHaveBeenLastCalledWith(2, "Bob");
  });

  it("should work in object lifecycle mode with deps", () => {
    const updateFn = vi.fn();

    function TestComponent({
      user,
      trackingEnabled,
    }: {
      user: { id: number };
      trackingEnabled: boolean;
    }) {
      useScope({
        for: user,
        update: [(u) => updateFn(u.id, trackingEnabled), trackingEnabled],
      });

      return <div>User {user.id}</div>;
    }

    const { rerender } = render(
      <TestComponent user={{ id: 1 }} trackingEnabled={true} />
    );

    // Initial render
    expect(updateFn).toHaveBeenCalledTimes(1);
    expect(updateFn).toHaveBeenLastCalledWith(1, true);

    // Re-render with different user but same trackingEnabled (should NOT trigger update)
    rerender(<TestComponent user={{ id: 2 }} trackingEnabled={true} />);
    expect(updateFn).toHaveBeenCalledTimes(1); // Still 1

    // Change trackingEnabled (SHOULD trigger update)
    rerender(<TestComponent user={{ id: 2 }} trackingEnabled={false} />);
    expect(updateFn).toHaveBeenCalledTimes(2);
    expect(updateFn).toHaveBeenLastCalledWith(2, false);
  });
});

