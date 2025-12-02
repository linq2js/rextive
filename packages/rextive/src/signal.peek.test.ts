import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { signal } from "./index";
import { withRenderHooks, getRenderHooks } from "./hooks";

describe("signal.peek()", () => {
  describe("basic peek functionality", () => {
    it("should return the same value as get() for mutable signals", () => {
      const count = signal(42);
      expect(count.peek()).toBe(42);
      expect(count.peek()).toBe(count.get());
      expect(count.peek()).toBe(count());
    });

    it("should return the same value as get() for computed signals", () => {
      const a = signal(10);
      const b = signal(20);
      const sum = signal({ a, b }, ({ deps }) => deps.a + deps.b);
      
      expect(sum.peek()).toBe(30);
      expect(sum.peek()).toBe(sum.get());
      expect(sum.peek()).toBe(sum());
    });

    it("should trigger lazy computation on first peek()", () => {
      const fn = vi.fn(() => 42);
      const count = signal(fn);
      
      expect(fn).not.toHaveBeenCalled();
      expect(count.peek()).toBe(42);
      expect(fn).toHaveBeenCalledOnce();
    });

    it("should throw error if signal has error state", () => {
      const errorSignal = signal({}, () => {
        throw new Error("test error");
      });

      expect(() => errorSignal.peek()).toThrow("test error");
    });
  });

  describe("peek() does NOT trigger tracking", () => {
    it("should NOT trigger onSignalAccess in render hooks for mutable signals", () => {
      const count = signal(42);
      const onSignalAccess = vi.fn();

      withRenderHooks({ onSignalAccess, onLoadableAccess: () => {} }, () => {
        // peek() should NOT trigger onSignalAccess
        count.peek();
      });

      expect(onSignalAccess).not.toHaveBeenCalled();
    });

    it("should NOT trigger onSignalAccess in render hooks for computed signals", () => {
      const a = signal(10);
      const sum = signal({ a }, ({ deps }) => deps.a * 2);
      const onSignalAccess = vi.fn();

      withRenderHooks({ onSignalAccess, onLoadableAccess: () => {} }, () => {
        // peek() should NOT trigger onSignalAccess
        sum.peek();
      });

      expect(onSignalAccess).not.toHaveBeenCalled();
    });

    it("should trigger onSignalAccess for get() (contrast with peek())", () => {
      const count = signal(42);
      const onSignalAccess = vi.fn();

      withRenderHooks({ onSignalAccess, onLoadableAccess: () => {} }, () => {
        // get() SHOULD trigger onSignalAccess
        count.get();
      });

      expect(onSignalAccess).toHaveBeenCalledWith(count);
    });

    it("should trigger onSignalAccess for signal() call (contrast with peek())", () => {
      const count = signal(42);
      const onSignalAccess = vi.fn();

      withRenderHooks({ onSignalAccess, onLoadableAccess: () => {} }, () => {
        // signal() SHOULD trigger onSignalAccess
        count();
      });

      expect(onSignalAccess).toHaveBeenCalledWith(count);
    });
  });

  describe("peek() with nested signals", () => {
    it("should peek nested computed without creating dependency chain", () => {
      const source = signal({ name: "Alice", age: 30 }, { name: "source" });
      const name = signal({ source }, ({ deps }) => deps.source.name, { name: "nameSignal" });
      const greeting = signal({ name }, ({ deps }) => `Hello, ${deps.name}!`, { name: "greetingSignal" });

      const trackedSignals: any[] = [];

      withRenderHooks({ 
        onSignalAccess: (sig) => trackedSignals.push(sig.displayName),
        onLoadableAccess: () => {} 
      }, () => {
        // peek() on nested computed
        const value = greeting.peek();
        expect(value).toBe("Hello, Alice!");
      });

      // No tracking should occur
      expect(trackedSignals).toHaveLength(0);
    });

    it("should allow reading parent signal without triggering recomputation of child", () => {
      const userProfile = signal({ address: { city: "NYC" } });
      
      // This computed depends on the full userProfile
      const computeFn = vi.fn(({ deps }: { deps: { userProfile: { address: { city: string } } } }) => {
        return deps.userProfile.address.city;
      });
      const userCity = signal({ userProfile }, computeFn);

      // First access computes
      expect(userCity()).toBe("NYC");
      expect(computeFn).toHaveBeenCalledTimes(1);

      // Use peek() in a tracking context - should NOT trigger recomputation
      const onSignalAccess = vi.fn();
      withRenderHooks({ onSignalAccess, onLoadableAccess: () => {} }, () => {
        // Reading userProfile via peek() - no tracking
        const profile = userProfile.peek();
        expect(profile.address.city).toBe("NYC");
      });

      // No tracking occurred
      expect(onSignalAccess).not.toHaveBeenCalled();
      // No additional recomputation
      expect(computeFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("peek() with .to() derived signals", () => {
    it("should peek derived signal without tracking parent", () => {
      const userProfile = signal({ address: { city: "NYC", zip: "10001" } });
      const userAddress = userProfile.to((x) => x.address, "shallow");

      const onSignalAccess = vi.fn();

      withRenderHooks({ onSignalAccess, onLoadableAccess: () => {} }, () => {
        // peek() on derived signal - NO tracking
        const address = userAddress.peek();
        expect(address.city).toBe("NYC");
      });

      // No tracking should occur
      expect(onSignalAccess).not.toHaveBeenCalled();
    });

    it("should demonstrate the tracking difference between () and peek()", () => {
      const userProfile = signal({ address: { city: "NYC" } });
      const userAddress = userProfile.to((x) => x.address, "shallow");

      const trackedSignals: any[] = [];

      withRenderHooks(
        {
          onSignalAccess: (sig) => trackedSignals.push(sig),
          onLoadableAccess: () => {},
        },
        () => {
          // Using () - creates tracking
          userAddress();
        }
      );

      // userAddress was tracked
      expect(trackedSignals).toContain(userAddress);

      // Reset
      trackedSignals.length = 0;

      withRenderHooks(
        {
          onSignalAccess: (sig) => trackedSignals.push(sig),
          onLoadableAccess: () => {},
        },
        () => {
          // Using peek() - NO tracking
          userAddress.peek();
        }
      );

      // Nothing was tracked
      expect(trackedSignals).toHaveLength(0);
    });
  });

  describe("peek() use case: avoiding unexpected recomputation", () => {
    /**
     * This test demonstrates the original problem that peek() solves:
     * 
     * When using `userProfile.to(x => x.address)` inside a tracking context,
     * calling `userAddress()` might inadvertently track `userProfile` first,
     * causing recomputation when userProfile changes even if address didn't change.
     * 
     * Using `peek()` avoids this issue.
     */
    it("should allow reading signal value without creating unwanted dependencies", () => {
      const userProfile = signal({ 
        name: "Alice", 
        address: { city: "NYC", zip: "10001" } 
      });
      const userAddress = userProfile.to((x) => x.address, "shallow");

      let trackingContextRuns = 0;
      const trackedSignals: any[] = [];

      // Simulate a tracking context (like rx() in React)
      const runWithTracking = (fn: () => void) => {
        trackingContextRuns++;
        withRenderHooks(
          {
            onSignalAccess: (sig) => trackedSignals.push(sig),
            onLoadableAccess: () => {},
          },
          fn
        );
      };

      // Using peek() - no tracking, no dependency created
      runWithTracking(() => {
        const address = userAddress.peek();
        expect(address.city).toBe("NYC");
      });

      expect(trackedSignals).toHaveLength(0);
      expect(trackingContextRuns).toBe(1);

      // Update userProfile's name (not address)
      userProfile.set({ 
        name: "Bob", 
        address: { city: "NYC", zip: "10001" } 
      });

      // The tracking context should NOT have been triggered to re-run
      // because we used peek() and didn't create any dependencies
      expect(trackingContextRuns).toBe(1);
    });
  });

  describe("peek() after disposal", () => {
    it("should return last value after disposal for mutable signal", () => {
      const count = signal(42);
      count.set(100);
      count.dispose();

      // Should still return last known value
      expect(count.peek()).toBe(100);
    });

    it("should return last value after disposal for computed signal", () => {
      const a = signal(10);
      const doubled = signal({ a }, ({ deps }) => deps.a * 2);
      
      // Compute value
      expect(doubled.peek()).toBe(20);
      
      // Dispose
      doubled.dispose();

      // Should still return last computed value
      expect(doubled.peek()).toBe(20);
    });
  });

  describe("peek() with error handling", () => {
    it("should throw error same as get() when signal has error", () => {
      const errorSignal = signal({}, () => {
        throw new Error("computation error");
      });

      expect(() => errorSignal.get()).toThrow("computation error");
      expect(() => errorSignal.peek()).toThrow("computation error");
    });

    it("should not trigger tracking even when throwing", () => {
      const errorSignal = signal({}, () => {
        throw new Error("test error");
      });
      const onSignalAccess = vi.fn();

      withRenderHooks({ onSignalAccess, onLoadableAccess: () => {} }, () => {
        try {
          errorSignal.peek();
        } catch {
          // Expected error
        }
      });

      // No tracking even on error
      expect(onSignalAccess).not.toHaveBeenCalled();
    });
  });

  describe("peek() with fallback", () => {
    it("should return fallback value via peek() when computation fails", () => {
      const count = signal(
        {},
        () => {
          throw new Error("failed");
        },
        {
          fallback: () => 0,
        }
      );

      // Should return fallback value
      expect(count.peek()).toBe(0);
    });
  });

  describe("peek() consistency", () => {
    it("should return consistent values between get(), peek(), and ()", () => {
      const count = signal(42);
      
      // All should return same value
      expect(count.get()).toBe(42);
      expect(count.peek()).toBe(42);
      expect(count()).toBe(42);

      count.set(100);

      // All should return updated value
      expect(count.get()).toBe(100);
      expect(count.peek()).toBe(100);
      expect(count()).toBe(100);
    });

    it("should return consistent values for computed signals", () => {
      const a = signal(5);
      const b = signal(3);
      const product = signal({ a, b }, ({ deps }) => deps.a * deps.b);

      // All should return same value
      expect(product.get()).toBe(15);
      expect(product.peek()).toBe(15);
      expect(product()).toBe(15);

      a.set(10);

      // All should return updated value
      expect(product.get()).toBe(30);
      expect(product.peek()).toBe(30);
      expect(product()).toBe(30);
    });
  });
});

