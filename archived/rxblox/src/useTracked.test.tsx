import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import React, { useState, useEffect, act } from "react";
import { useTracked } from "./useTracked";
import { signal } from "./signal";
import { delay } from "./delay";

describe("useTracked", () => {
  describe("basic usage", () => {
    it("should track a single signal", async () => {
      const count = signal(0);
      const renderSpy = vi.fn();

      const Component = () => {
        const tracked = useTracked({ count: () => count() });
        renderSpy(tracked.count);
        return <div>{tracked.count}</div>;
      };

      const { container } = render(<Component />);

      expect(container.textContent).toBe("0");
      expect(renderSpy).toHaveBeenCalledWith(0);

      act(() => count.set(5));

      expect(container.textContent).toBe("5");

      expect(renderSpy).toHaveBeenCalledWith(5);
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it("should track multiple signals", async () => {
      const count = signal(0);
      const name = signal("Alice");
      const renderSpy = vi.fn();

      const Component = () => {
        const tracked = useTracked({
          count: () => count(),
          name: () => name(),
        });
        renderSpy({ count: tracked.count, name: tracked.name });
        return <div>{`${tracked.name}: ${tracked.count}`}</div>;
      };

      const { container } = render(<Component />);

      expect(container.textContent).toBe("Alice: 0");

      act(() => {
        count.set(5);
      });
      await waitFor(() => {
        expect(container.textContent).toBe("Alice: 5");
      });

      act(() => {
        name.set("Bob");
      });
      await waitFor(() => {
        expect(container.textContent).toBe("Bob: 5");
      });

      expect(renderSpy).toHaveBeenCalledTimes(3);
    });

    it("should work with computed properties", async () => {
      const count = signal(5);

      const Component = () => {
        const tracked = useTracked({
          count: () => count(),
          double: () => count() * 2,
          triple: () => count() * 3,
        });
        return (
          <div>{`${tracked.count} × 2 = ${tracked.double}, × 3 = ${tracked.triple}`}</div>
        );
      };

      const { container } = render(<Component />);

      expect(container.textContent).toBe("5 × 2 = 10, × 3 = 15");

      act(() => {
        count.set(10);
      });
      await waitFor(() => {
        expect(container.textContent).toBe("10 × 2 = 20, × 3 = 30");
      });
    });
  });

  describe("conditional tracking", () => {
    it("should only track accessed signals", async () => {
      const count = signal(0);
      const name = signal("Alice");
      const renderSpy = vi.fn();

      const Component = () => {
        const tracked = useTracked({
          count: () => count(),
          name: () => name(),
        });

        // Only access count, not name
        renderSpy(tracked.count);
        return <div>{tracked.count}</div>;
      };

      render(<Component />);

      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Changing count should trigger re-render
      act(() => {
        count.set(5);
      });
      await waitFor(() => {
        expect(renderSpy).toHaveBeenCalledTimes(2);
      });

      // Changing name should NOT trigger re-render (not tracked)
      act(() => {
        name.set("Bob");
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(renderSpy).toHaveBeenCalledTimes(2); // Still 2, no new render
    });

    it("should track different signals based on condition", async () => {
      const count = signal(0);
      const name = signal("Alice");
      const renderSpy = vi.fn();

      const Component = () => {
        const [showCount, setShowCount] = useState(true);
        const tracked = useTracked({
          count: () => count(),
          name: () => name(),
        });

        renderSpy({ showCount });

        if (showCount) {
          return (
            <div>
              <div>{tracked.count}</div>
              <button onClick={() => setShowCount(false)}>Toggle</button>
            </div>
          );
        }

        return (
          <div>
            <div>{tracked.name}</div>
            <button onClick={() => setShowCount(true)}>Toggle</button>
          </div>
        );
      };

      const { container, getByText } = render(<Component />);

      // Initially shows count
      expect(container.querySelector("div")?.textContent).toContain("0");

      // Changing count triggers re-render
      act(() => {
        count.set(5);
      });

      await waitFor(() => {
        expect(container.querySelector("div")?.textContent).toContain("5");
      });

      // Toggle to show name instead
      act(() => {
        getByText("Toggle").click();
      });

      await waitFor(() => {
        expect(container.querySelector("div")?.textContent).toContain("Alice");
      });

      const initialRenders = renderSpy.mock.calls.length;

      // Now changing count should NOT trigger re-render
      act(() => {
        count.set(10);
      });
      await delay(50);

      expect(renderSpy.mock.calls.length).toBe(initialRenders); // No new renders

      // But changing name SHOULD trigger re-render
      act(() => {
        name.set("Bob");
      });

      await waitFor(() => {
        expect(container.querySelector("div")?.textContent).toContain("Bob");
      });

      expect(renderSpy.mock.calls.length).toBe(initialRenders + 1); // Only name change
    });

    it("should handle early returns with conditional tracking", async () => {
      const loading = signal(true);
      const data = signal("Data");
      const renderSpy = vi.fn();

      const Component = () => {
        const tracked = useTracked({
          loading: () => loading(),
          data: () => data(),
        });

        renderSpy();

        if (tracked.loading) {
          return <div>Loading...</div>;
        }

        return <div>{tracked.data}</div>;
      };

      const { container } = render(<Component />);

      expect(container.textContent).toBe("Loading...");
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Changing data while loading should NOT trigger re-render
      act(() => {
        data.set("New Data");
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Stop loading - now tracks data
      act(() => {
        loading.set(false);
      });
      await waitFor(() => {
        expect(container.textContent).toBe("New Data");
      });

      // Now data changes trigger re-renders
      act(() => {
        data.set("Updated");
      });
      await waitFor(() => {
        expect(container.textContent).toBe("Updated");
      });
    });
  });

  describe("event handlers", () => {
    it("should work in event handlers without tracking", async () => {
      const count = signal(0);
      const clickCount = signal(0);

      const Component = () => {
        const tracked = useTracked({
          count: () => count(),
          clicks: () => clickCount(),
        });

        const handleClick = () => {
          // Access outside render - should not track
          clickCount.set(tracked.clicks + 1);
        };

        return (
          <div>
            <div>{`Count: ${tracked.count}`}</div>
            <div>{`Clicks: ${tracked.clicks}`}</div>
            <button onClick={handleClick}>Click</button>
          </div>
        );
      };

      const { container, getByText } = render(<Component />);

      expect(container.textContent).toContain("Count: 0");
      expect(container.textContent).toContain("Clicks: 0");

      getByText("Click").click();
      await waitFor(() => {
        expect(container.textContent).toContain("Clicks: 1");
      });

      getByText("Click").click();
      await waitFor(() => {
        expect(container.textContent).toContain("Clicks: 2");
      });
    });
  });

  describe("custom hooks", () => {
    it("should work in custom hooks", async () => {
      const user = signal({ name: "Alice", role: "user" });

      function useUser() {
        const tracked = useTracked({
          user: () => user(),
          isAdmin: () => user().role === "admin",
        });

        return tracked;
      }

      const Component = () => {
        const { user: userData, isAdmin } = useUser();
        return <div>{`${userData.name} - ${isAdmin ? "Admin" : "User"}`}</div>;
      };

      const { container } = render(<Component />);

      expect(container.textContent).toBe("Alice - User");

      act(() => {
        user.set({ name: "Alice", role: "admin" });
      });
      await waitFor(() => {
        expect(container.textContent).toBe("Alice - Admin");
      });
    });

    it("should work with useEffect dependencies", async () => {
      const count = signal(0);
      const effectSpy = vi.fn();

      function useCountEffect() {
        const tracked = useTracked({ count: () => count() });

        useEffect(() => {
          effectSpy(tracked.count);
        }, [tracked.count]);
      }

      const Component = () => {
        useCountEffect();
        return <div>Component</div>;
      };

      render(<Component />);

      expect(effectSpy).toHaveBeenCalledWith(0);

      act(() => {
        count.set(5);
      });
      await waitFor(() => {
        expect(effectSpy).toHaveBeenCalledWith(5);
      });

      expect(effectSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("cleanup", () => {
    it("should cleanup subscriptions on unmount", async () => {
      const count = signal(0);
      const renderSpy = vi.fn();

      const Component = () => {
        const tracked = useTracked({ count: () => count() });
        renderSpy();
        return <div>{tracked.count}</div>;
      };

      const { unmount } = render(<Component />);

      expect(renderSpy).toHaveBeenCalledTimes(1);

      act(() => {
        count.set(5);
      });
      await waitFor(() => {
        expect(renderSpy).toHaveBeenCalledTimes(2);
      });

      unmount();

      // After unmount, signal changes should not trigger renders
      act(() => {
        count.set(10);
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(renderSpy).toHaveBeenCalledTimes(2); // Still 2
    });

    it("should cleanup and rebuild subscriptions on re-render", async () => {
      const signal1 = signal(0);
      const signal2 = signal(0);
      const renderSpy = vi.fn();

      const Component = () => {
        const [useFirst, setUseFirst] = useState(true);
        const tracked = useTracked({
          first: () => signal1(),
          second: () => signal2(),
        });

        renderSpy(useFirst);

        return (
          <div>
            <div>{useFirst ? tracked.first : tracked.second}</div>
            <button onClick={() => setUseFirst(!useFirst)}>Toggle</button>
          </div>
        );
      };

      const { getByText } = render(<Component />);

      const initialRenders = renderSpy.mock.calls.length;

      // Toggle to second signal
      getByText("Toggle").click();
      await waitFor(() => {
        expect(renderSpy.mock.calls.length).toBe(initialRenders + 1);
      });

      // First signal should no longer trigger renders
      act(() => {
        signal1.set(10);
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(renderSpy.mock.calls.length).toBe(initialRenders + 1);

      // Second signal should trigger renders
      act(() => {
        signal2.set(20);
      });
      await waitFor(() => {
        expect(renderSpy.mock.calls.length).toBe(initialRenders + 2);
      });
    });
  });

  describe("error handling", () => {
    it("should throw error if property is not a function", () => {
      const Component = () => {
        const tracked = useTracked({
          // @ts-expect-error - Testing runtime error
          notAFunction: 42,
        });

        return <div>{tracked.notAFunction as unknown as string}</div>;
      };

      expect(() => {
        render(<Component />);
      }).toThrow("Prop notAFunction must be a function");
    });
  });

  describe("dynamic getters", () => {
    it("should use updated getters on each render", async () => {
      const base = signal(10);
      const renderSpy = vi.fn();

      const Component = () => {
        const [multiplier, setMultiplier] = useState(2);
        const tracked = useTracked({
          result: () => base() * multiplier,
        });

        renderSpy({ multiplier, result: tracked.result });

        return (
          <div>
            <div data-testid="result">{tracked.result}</div>
            <button onClick={() => setMultiplier(3)}>Change</button>
          </div>
        );
      };

      const { getByTestId, getByText } = render(<Component />);

      expect(getByTestId("result").textContent).toBe("20");

      // Change multiplier
      act(() => {
        getByText("Change").click();
      });

      expect(getByTestId("result").textContent).toBe("30");

      // Base signal change should use new multiplier
      act(() => {
        base.set(5);
      });
      expect(getByTestId("result").textContent).toBe("15");
    });
  });

  describe("React Strict Mode", () => {
    it("should work correctly in Strict Mode", async () => {
      const count = signal(0);
      const renderSpy = vi.fn();

      const Component = () => {
        const tracked = useTracked({ count: () => count() });
        renderSpy();
        return <div>{tracked.count}</div>;
      };

      const { container } = render(
        <React.StrictMode>
          <Component />
        </React.StrictMode>
      );

      // Strict Mode may cause double render
      expect(renderSpy.mock.calls.length).toBeGreaterThanOrEqual(1);

      const initialRenders = renderSpy.mock.calls.length;

      act(() => {
        count.set(5);
      });
      await waitFor(() => {
        expect(container.textContent).toBe("5");
      });

      // Should only render once more (or twice in Strict Mode)
      expect(renderSpy.mock.calls.length).toBeLessThanOrEqual(
        initialRenders + 2
      );
    });
  });

  describe("nested signals", () => {
    it("should track nested signal access", async () => {
      const user = signal({ name: "Alice", settings: { theme: "dark" } });

      const Component = () => {
        const tracked = useTracked({
          theme: () => user().settings.theme,
          name: () => user().name,
        });

        return <div>{`${tracked.name} - ${tracked.theme}`}</div>;
      };

      const { container } = render(<Component />);

      expect(container.textContent).toBe("Alice - dark");

      act(() => {
        user.set({ name: "Bob", settings: { theme: "light" } });
      });
      await waitFor(() => {
        expect(container.textContent).toBe("Bob - light");
      });
    });
  });

  describe("type safety", () => {
    it("should preserve return types", () => {
      const count = signal(0);
      const name = signal("Alice");

      const Component = () => {
        const tracked = useTracked({
          count: () => count(),
          name: () => name(),
          computed: () => count() * 2,
        });

        // Type checks
        tracked.count satisfies number;
        tracked.name satisfies string;
        tracked.computed satisfies number;

        return <div>Type test</div>;
      };

      render(<Component />);
    });
  });
});
