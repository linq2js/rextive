import { describe, it, expect, vi } from "vitest";
import { signal, Mutable, Computed } from "./index";

describe("signal.when() instance method", () => {
  describe("mutable signals - action overload", () => {
    describe("reset action", () => {
      it("should reset signal when notifier changes", () => {
        const notifier = signal(0);
        const count = signal(10).when(notifier, "reset");

        expect(count()).toBe(10);

        count.set(50);
        expect(count()).toBe(50);

        notifier.set(1);
        expect(count()).toBe(10); // Reset to initial value
      });

      it("should support chaining multiple when() calls", () => {
        const resetTrigger = signal(0);
        const refreshTrigger = signal(0);

        const count = signal(10)
          .when(resetTrigger, "reset")
          .when(refreshTrigger, "refresh");

        count.set(50);
        expect(count()).toBe(50);

        resetTrigger.set(1);
        expect(count()).toBe(10);
      });
    });

    describe("refresh action", () => {
      it("should refresh signal when notifier changes", () => {
        let computeCount = 0;
        const notifier = signal(0);
        const data = signal(() => {
          computeCount++;
          return "data";
        }).when(notifier, "refresh");

        expect(data()).toBe("data");
        expect(computeCount).toBe(1);

        notifier.set(1);
        // After microtask for batched refresh
        return new Promise<void>((resolve) => {
          queueMicrotask(() => {
            expect(data()).toBe("data");
            expect(computeCount).toBe(2);
            resolve();
          });
        });
      });
    });

    describe("with filter", () => {
      it("should only trigger action when filter returns true", () => {
        const notifier = signal(0);
        const count = signal(10).when(
          notifier,
          "reset",
          (notifierSig, self) => notifierSig() > 5
        );

        count.set(50);
        expect(count()).toBe(50);

        notifier.set(3); // Filter returns false
        expect(count()).toBe(50); // Not reset

        notifier.set(10); // Filter returns true
        expect(count()).toBe(10); // Reset
      });

      it("should pass self signal to filter", () => {
        const notifier = signal(0);
        const filterFn = vi.fn((notifierSig, self: Mutable<number>) => {
          return self() > 20; // Call self to get current value
        });

        const count = signal(10).when(notifier, "reset", filterFn);

        count.set(15);
        notifier.set(1);
        expect(filterFn).toHaveBeenLastCalledWith(notifier, count);
        expect(count()).toBe(15); // Not reset because filter returned false

        count.set(25);
        notifier.set(2);
        expect(filterFn).toHaveBeenLastCalledWith(notifier, count);
        expect(count()).toBe(10); // Reset because filter returned true
      });

      it("should route filter error through signal error handling and skip action", () => {
        const notifier = signal(0);
        const onErrorCallback = vi.fn();

        const count = signal(10, { onError: onErrorCallback }).when(
          notifier,
          "reset",
          () => {
            throw new Error("Filter error");
          }
        );

        count.set(50);
        notifier.set(1);

        // Error should be routed through signal's onError callback
        expect(onErrorCallback).toHaveBeenCalledTimes(1);
        expect(onErrorCallback.mock.calls[0][0]).toBeInstanceOf(Error);
        expect(count()).toBe(50); // Action NOT triggered
      });
    });

    describe("with array of notifiers", () => {
      it("should trigger action when any notifier changes", () => {
        const notifier1 = signal(0);
        const notifier2 = signal("a");

        const count = signal(10).when([notifier1, notifier2], "reset");

        count.set(50);
        expect(count()).toBe(50);

        notifier1.set(1);
        expect(count()).toBe(10); // Reset

        count.set(50);
        notifier2.set("b");
        expect(count()).toBe(10); // Reset
      });

      it("should pass self and the specific notifier that fired to filter", () => {
        const notifier1 = signal(0);
        const notifier2 = signal("a");
        const filterFn = vi.fn(() => true);

        const count = signal(10).when(
          [notifier1, notifier2],
          "reset",
          filterFn
        );

        notifier1.set(1);
        expect(filterFn).toHaveBeenLastCalledWith(notifier1, count);

        notifier2.set("b");
        expect(filterFn).toHaveBeenLastCalledWith(notifier2, count);
      });
    });
  });

  describe("mutable signals - reducer overload", () => {
    it("should apply reducer when notifier changes", () => {
      const addAmount = signal(0);
      const total = signal(0).when(addAmount, (notifier, self) => {
        return self() + notifier();
      });

      expect(total()).toBe(0);

      addAmount.set(5);
      expect(total()).toBe(5);

      addAmount.set(10);
      expect(total()).toBe(15);
    });

    it("should pass self and notifier as signals to reducer", () => {
      const notifier = signal({ value: 10 });
      const reducerFn = vi.fn((notifierSig, self) => {
        // Both are signals, not values
        expect(typeof self).toBe("function");
        expect(typeof notifierSig).toBe("function");
        return self() + notifierSig().value;
      });

      const total = signal(0).when(notifier, reducerFn);

      notifier.set({ value: 5 });
      expect(reducerFn).toHaveBeenCalledWith(notifier, total);
      expect(total()).toBe(5);
    });

    it("should set signal to error state when reducer throws", () => {
      const notifier = signal(0);
      const count = signal(10).when(notifier, () => {
        throw new Error("Reducer error");
      });

      expect(count()).toBe(10);

      expect(() => notifier.set(1)).toThrowError();

      expect(count.error()).toBeInstanceOf(Error);
      expect((count.error() as Error).message).toBe("Reducer error");
      expect(count.tryGet()).toBeUndefined();
    });

    it("should notify subscribers when reducer error occurs", () => {
      const notifier = signal(0);
      const listener = vi.fn();

      const count = signal(10).when(notifier, () => {
        throw new Error("Reducer error");
      });

      count.on(listener);

      expect(() => notifier.set(1)).toThrow("Reducer error");

      expect(listener).toHaveBeenCalled();
    });

    it("should work with array of notifiers", () => {
      const add = signal(0);
      const multiply = signal(1);

      const total = signal(10).when([add, multiply], (notifier, self) => {
        if (notifier === add) {
          return self() + notifier();
        }
        return self() * notifier();
      });

      add.set(5);
      expect(total()).toBe(15); // 10 + 5

      multiply.set(2);
      expect(total()).toBe(30); // 15 * 2
    });
  });

  describe("computed signals - action overload", () => {
    describe("refresh action", () => {
      it("should refresh computed signal when notifier changes", async () => {
        let computeCount = 0;
        const source = signal(10);
        const notifier = signal(0);

        const computed = signal({ source }, ({ deps }) => {
          computeCount++;
          return deps.source * 2;
        }).when(notifier, "refresh");

        expect(computed()).toBe(20);
        expect(computeCount).toBe(1);

        notifier.set(1);

        // Wait for batched refresh
        await new Promise<void>((resolve) => queueMicrotask(resolve));

        expect(computed()).toBe(20);
        expect(computeCount).toBe(2);
      });
    });

    describe("stale action", () => {
      it("should mark computed signal as stale when notifier changes", () => {
        let computeCount = 0;
        const source = signal(10);
        const notifier = signal(0);

        const computed = signal({ source }, ({ deps }) => {
          computeCount++;
          return deps.source * 2;
        }).when(notifier, "stale");

        expect(computed()).toBe(20);
        expect(computeCount).toBe(1);

        notifier.set(1);

        // Not yet recomputed (stale is lazy)
        expect(computeCount).toBe(1);

        // Access triggers recomputation
        expect(computed()).toBe(20);
        expect(computeCount).toBe(2);
      });
    });

    describe("with filter", () => {
      it("should only trigger action when filter returns true", () => {
        let computeCount = 0;
        const source = signal(10);
        const notifier = signal(0);

        const computed = signal({ source }, ({ deps }) => {
          computeCount++;
          return deps.source * 2;
        }).when(notifier, "stale", (notifierSig, self) => notifierSig() > 5);

        expect(computed()).toBe(20);
        expect(computeCount).toBe(1);

        notifier.set(3); // Filter returns false
        expect(computed()).toBe(20);
        expect(computeCount).toBe(1); // No stale

        notifier.set(10); // Filter returns true
        expect(computed()).toBe(20);
        expect(computeCount).toBe(2); // Recomputed after stale
      });
    });

    it("should NOT have reset action for computed signals", () => {
      const source = signal(10);
      const notifier = signal(0);

      const computed = signal({ source }, ({ deps }) => deps.source * 2);

      // TypeScript should prevent this, but we test runtime behavior
      // @ts-expect-error - "reset" is not valid for computed signals
      expect(() => computed.when(notifier, "reset")).toThrow();
    });
  });

  describe("cleanup behavior", () => {
    it("should unsubscribe from notifiers when signal is disposed", () => {
      const notifier = signal(0);
      const count = signal(10).when(notifier, "reset");

      count.set(50);
      notifier.set(1);
      expect(count()).toBe(10);

      count.dispose();

      // After dispose, notifier changes should not affect the signal
      // (but signal is disposed so we can't really verify via value)
      // The main thing is no error is thrown and no memory leak
      notifier.set(2);
    });

    it("should cleanup all when subscriptions", () => {
      const notifier1 = signal(0);
      const notifier2 = signal(0);
      const listener = vi.fn();

      const count = signal(10)
        .when(notifier1, "reset")
        .when(notifier2, (n, self) => self() + n());

      count.on(listener);

      notifier1.set(1);
      notifier2.set(5);
      // Notifications may be batched, so just verify at least one was called
      expect(listener).toHaveBeenCalled();
      const callCountBeforeDispose = listener.mock.calls.length;

      count.dispose();

      // After dispose, no more notifications
      notifier1.set(2);
      notifier2.set(10);
      expect(listener).toHaveBeenCalledTimes(callCountBeforeDispose);
    });
  });

  describe("type safety", () => {
    it("should have correct return type for chaining", () => {
      const notifier = signal(0);

      // Should return Mutable<number> (this)
      const count: Mutable<number> = signal(10).when(notifier, "reset");

      // Can chain .set()
      count.set(50);
      expect(count()).toBe(50);
    });

    it("should have correct return type for computed signals", () => {
      const source = signal(10);
      const notifier = signal(0);

      // Should return Computed<number> (this)
      const computed: Computed<number> = signal(
        { source },
        ({ deps }) => deps.source * 2
      ).when(notifier, "refresh");

      expect(computed()).toBe(20);
    });
  });

  describe("edge cases", () => {
    it("should handle notifier in error state", () => {
      const notifier = signal(async () => {
        throw new Error("Notifier error");
      });

      const count = signal(10).when(notifier, "reset");

      // Even if notifier has error, `when` still listens to changes
      // It's up to the filter to decide what to do
      count.set(50);
      expect(count()).toBe(50);
    });

    it("should not trigger on initial notifier value (only changes)", () => {
      const notifier = signal(5);
      const resetCount = vi.fn();

      const count = signal(10).when(notifier, "reset", () => {
        resetCount();
        return true;
      });

      // Should NOT be called on creation
      expect(resetCount).not.toHaveBeenCalled();
      expect(count()).toBe(10);

      // Only on change
      notifier.set(6);
      expect(resetCount).toHaveBeenCalledTimes(1);
    });

    it("should work with async computed signals", async () => {
      let fetchCount = 0;
      const userId = signal(1);
      const refreshTrigger = signal(0);

      const userData = signal({ userId }, async ({ deps }) => {
        fetchCount++;
        return { id: deps.userId, name: `User ${deps.userId}` };
      }).when(refreshTrigger, "refresh");

      // First access
      const firstResult = await userData();
      expect(firstResult).toEqual({ id: 1, name: "User 1" });
      expect(fetchCount).toBe(1);

      // Trigger refresh
      refreshTrigger.set(1);

      // Wait for batched refresh
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      // Access again triggers recomputation
      const secondResult = await userData();
      expect(secondResult).toEqual({ id: 1, name: "User 1" });
      expect(fetchCount).toBe(2);
    });
  });
});
