import { describe, it, expect, vi } from "vitest";
import { signal, Mutable, Computed } from "./index";
import { signalWhen } from "./signal.when";
import { emitter } from "./utils/emitter";

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
        const filterFn = vi.fn((_notifier, self: Mutable<number>) => {
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

  describe("mutable signals - action callback overload", () => {
    it("should execute action callback when notifier changes", () => {
      const addAmount = signal(0);
      const total = signal(0).when(addAmount, (notifier, self) => {
        self.set((prev) => prev + notifier());
      });

      expect(total()).toBe(0);

      addAmount.set(5);
      expect(total()).toBe(5);

      addAmount.set(10);
      expect(total()).toBe(15);
    });

    it("should pass self and notifier as signals to action callback", () => {
      const notifier = signal({ value: 10 });
      const callbackFn = vi.fn((notifierSig, self) => {
        // Both are signals, not values
        expect(typeof self).toBe("function");
        expect(typeof notifierSig).toBe("function");
        self.set((prev) => prev + notifierSig().value);
      });

      const total = signal(0).when(notifier, callbackFn);

      notifier.set({ value: 5 });
      expect(callbackFn).toHaveBeenCalledWith(notifier, total);
      expect(total()).toBe(5);
    });

    it("should route error through signal error handling when action callback throws", () => {
      const notifier = signal(0);
      const onErrorCallback = vi.fn();

      const count = signal(10, { onError: onErrorCallback }).when(
        notifier,
        () => {
          throw new Error("Action callback error");
        }
      );

      expect(count()).toBe(10);

      notifier.set(1);

      // Error should be routed through signal's onError callback
      expect(onErrorCallback).toHaveBeenCalledTimes(1);
      expect(onErrorCallback.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(count()).toBe(10); // Value unchanged
    });

    it("should work with array of notifiers", () => {
      const add = signal(0);
      const multiply = signal(1);

      const total = signal(10).when([add, multiply], (notifier, self) => {
        if (notifier === add) {
          self.set((prev) => prev + notifier());
        } else {
          self.set((prev) => prev * notifier());
        }
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

    it("should have TypeScript-only validation for reset action on computed signals", () => {
      const source = signal(10);
      const notifier = signal(0);

      const computed = signal({ source }, ({ deps }) => deps.source * 2);

      // TypeScript prevents this at compile time, but runtime allows it
      // The reset() method exists on computed signals (inherited from Signal)
      // but it's a no-op since computed signals can't be "reset" to initial value
      expect(() => computed.when(notifier, "reset")).not.toThrow();
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
        .when(notifier2, (n, self) => self.set((prev) => prev + n()));

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

describe("signalWhen utility", () => {
  it("should execute refresh action when notifier changes", () => {
    const onDispose = emitter<void>();
    const self = signal(10);
    const refreshSpy = vi.spyOn(self, "refresh");

    const when = signalWhen<Mutable<number>>({
      getSelf: () => self,
      onDispose,
      throwError: vi.fn(),
    });

    const notifier = signal(0);
    when(notifier, "refresh");

    expect(refreshSpy).not.toHaveBeenCalled();

    notifier.set(1);
    expect(refreshSpy).toHaveBeenCalledTimes(1);

    notifier.set(2);
    expect(refreshSpy).toHaveBeenCalledTimes(2);
  });

  it("should execute reset action when notifier changes", () => {
    const onDispose = emitter<void>();
    const self = signal(10);

    const when = signalWhen<Mutable<number>>({
      getSelf: () => self,
      onDispose,
      throwError: vi.fn(),
    });

    const notifier = signal(0);
    when(notifier, "reset");

    self.set(50);
    expect(self()).toBe(50);

    notifier.set(1);
    expect(self()).toBe(10); // Reset to initial value
  });

  it("should execute action callback when notifier changes", () => {
    const onDispose = emitter<void>();
    const self = signal(10);
    const callback = vi.fn();

    const when = signalWhen<Mutable<number>>({
      getSelf: () => self,
      onDispose,
      throwError: vi.fn(),
    });

    const notifier = signal(0);
    when(notifier, callback);

    expect(callback).not.toHaveBeenCalled();

    notifier.set(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(notifier, self);
  });

  it("should respect filter for action string overload", () => {
    const onDispose = emitter<void>();
    const self = signal(10);

    const when = signalWhen<Mutable<number>>({
      getSelf: () => self,
      onDispose,
      throwError: vi.fn(),
    });

    const notifier = signal(0);
    when(notifier, "reset", (n) => n() > 5);

    self.set(50);

    notifier.set(3); // Filter returns false
    expect(self()).toBe(50);

    notifier.set(10); // Filter returns true
    expect(self()).toBe(10); // Reset to initial value
  });

  it("should handle multiple notifiers", () => {
    const onDispose = emitter<void>();
    const self = signal(10);
    const refreshSpy = vi.spyOn(self, "refresh");

    const when = signalWhen<Mutable<number>>({
      getSelf: () => self,
      onDispose,
      throwError: vi.fn(),
    });

    const notifier1 = signal(0);
    const notifier2 = signal("a");
    when([notifier1, notifier2], "refresh");

    notifier1.set(1);
    expect(refreshSpy).toHaveBeenCalledTimes(1);

    notifier2.set("b");
    expect(refreshSpy).toHaveBeenCalledTimes(2);
  });

  it("should route filter errors through throwError", () => {
    const onDispose = emitter<void>();
    const throwError = vi.fn();
    const self = signal(10);
    const refreshSpy = vi.spyOn(self, "refresh");

    const when = signalWhen<Mutable<number>>({
      getSelf: () => self,
      onDispose,
      throwError,
    });

    const notifier = signal(0);
    const filterError = new Error("Filter error");
    when(notifier, "refresh", () => {
      throw filterError;
    });

    notifier.set(1);

    expect(throwError).toHaveBeenCalledWith(filterError, "when:filter", false);
    expect(refreshSpy).not.toHaveBeenCalled(); // Action not executed
  });

  it("should route action callback errors through throwError", () => {
    const onDispose = emitter<void>();
    const throwError = vi.fn();
    const self = signal(10);

    const when = signalWhen<Mutable<number>>({
      getSelf: () => self,
      onDispose,
      throwError,
    });

    const notifier = signal(0);
    const callbackError = new Error("Callback error");
    when(notifier, () => {
      throw callbackError;
    });

    notifier.set(1);

    expect(throwError).toHaveBeenCalledWith(
      callbackError,
      "when:action",
      false
    );
  });

  it("should return self for chaining", () => {
    const onDispose = emitter<void>();
    const self = signal(10);

    const when = signalWhen<Mutable<number>>({
      getSelf: () => self,
      onDispose,
      throwError: vi.fn(),
    });

    const notifier = signal(0);
    const result = when(notifier, "refresh");

    expect(result).toBe(self);
  });

  it("should register cleanup on dispose emitter", () => {
    const onDispose = emitter<void>();
    const self = signal(10);
    const refreshSpy = vi.spyOn(self, "refresh");

    const when = signalWhen<Mutable<number>>({
      getSelf: () => self,
      onDispose,
      throwError: vi.fn(),
    });

    const notifier = signal(0);
    when(notifier, "refresh");

    notifier.set(1);
    expect(refreshSpy).toHaveBeenCalledTimes(1);

    // Trigger dispose
    onDispose.emit();

    // After dispose, notifier changes should not affect
    notifier.set(2);
    expect(refreshSpy).toHaveBeenCalledTimes(1); // Still 1
  });
});
