import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { signal } from "./index";

describe("signal.refresh() and signal.stale()", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("signal.refresh()", () => {
    it("should trigger immediate recomputation for computed signals", async () => {
      const computeFn = vi.fn(() => Math.random());
      const s = signal(computeFn);

      const value1 = s();
      expect(computeFn).toHaveBeenCalledTimes(1);

      // Refresh should trigger recomputation
      s.refresh();
      await Promise.resolve();
      const value2 = s();

      expect(computeFn).toHaveBeenCalledTimes(2);
      expect(value1).not.toBe(value2);
    });

    it("should be a no-op for mutable signals with direct value", () => {
      const s = signal(42);

      expect(s()).toBe(42);
      s.refresh();
      expect(s()).toBe(42);
    });

    it("should work for signals with dependencies", async () => {
      const a = signal(10);
      const computeFn = vi.fn(({ deps }: any) => deps.a * 2);
      const b = signal({ a }, computeFn);

      expect(b()).toBe(20);
      expect(computeFn).toHaveBeenCalledTimes(1);

      // Refresh should recompute
      b.refresh();
      await Promise.resolve();
      expect(b()).toBe(20);
      expect(computeFn).toHaveBeenCalledTimes(2);
    });

    it("should work with async signals", async () => {
      const fetchFn = vi.fn(async () => {
        return "data-" + Math.random();
      });

      const s = signal(fetchFn);

      const promise1 = s();
      expect(fetchFn).toHaveBeenCalledTimes(1);
      const value1 = await promise1;

      // Refresh triggers new fetch
      s.refresh();
      await Promise.resolve();
      const promise2 = s();
      expect(fetchFn).toHaveBeenCalledTimes(2);
      const value2 = await promise2;

      expect(value1).not.toBe(value2);
    });

    it("should cancel pending async computation when refresh is called", async () => {
      let resolveCount = 0;
      const s = signal(async ({ abortSignal }: any) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            resolveCount++;
            resolve("data");
          }, 100);

          abortSignal.addEventListener("abort", () => {
            clearTimeout(timeout);
            reject(new Error("Aborted"));
          });
        });
      });

      // Start first computation
      const promise1 = s();

      // Refresh before first completes
      vi.advanceTimersByTime(50);
      s.refresh();

      // First computation should be aborted
      await expect(promise1).rejects.toThrow("Aborted");

      // Second computation should complete
      vi.advanceTimersByTime(100);
      const promise2 = s();
      await expect(promise2).resolves.toBe("data");

      // Only one computation completed
      expect(resolveCount).toBe(1);
    });

    it("should throw error if signal is disposed", () => {
      const s = signal(() => 42);
      s.dispose();

      expect(() => s.refresh()).toThrow("Cannot refresh disposed signal");
    });

    it("should notify listeners after refresh", async () => {
      const listener = vi.fn();
      const s = signal(() => Math.random());

      s(); // Initial access
      s.on(listener);
      expect(listener).toHaveBeenCalledTimes(0);

      s.refresh();
      // Wait for microtask queue to flush
      await Promise.resolve();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should batch multiple refresh calls", async () => {
      const computeFn = vi.fn(() => Math.random());
      const listener = vi.fn();
      const s = signal(computeFn);

      s(); // Initial computation
      s.on(listener);
      expect(computeFn).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledTimes(0);

      // Multiple refresh calls
      s.refresh();
      s.refresh();
      s.refresh();

      // Should only recompute once (batched)
      await Promise.resolve();
      expect(computeFn).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("signal.stale()", () => {
    it("should mark signal as stale without immediate recomputation", () => {
      const computeFn = vi.fn(() => Math.random());
      const s = signal(computeFn);

      const value1 = s();
      expect(computeFn).toHaveBeenCalledTimes(1);

      // Mark as stale (no immediate recomputation)
      s.stale();
      expect(computeFn).toHaveBeenCalledTimes(1);

      // Next access triggers recomputation
      const value2 = s();
      expect(computeFn).toHaveBeenCalledTimes(2);
      expect(value1).not.toBe(value2);
    });

    it("should be a no-op for mutable signals with direct value", () => {
      const s = signal(42);

      expect(s()).toBe(42);
      s.stale();
      expect(s()).toBe(42);
    });

    it("should not notify listeners until accessed", () => {
      const listener = vi.fn();
      const s = signal(() => Math.random());

      s(); // Initial access
      s.on(listener);

      // Mark as stale
      s.stale();
      expect(listener).toHaveBeenCalledTimes(0);

      // Access triggers recomputation and notification
      s();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should work with signals with dependencies", () => {
      const a = signal(10);
      const computeFn = vi.fn(({ deps }: any) => deps.a * 2);
      const b = signal({ a }, computeFn);

      expect(b()).toBe(20);
      expect(computeFn).toHaveBeenCalledTimes(1);

      // Mark as stale
      b.stale();
      expect(computeFn).toHaveBeenCalledTimes(1);

      // Next access recomputes
      expect(b()).toBe(20);
      expect(computeFn).toHaveBeenCalledTimes(2);
    });

    it("should batch multiple stale() calls", () => {
      const computeFn = vi.fn(() => Math.random());
      const s = signal(computeFn);

      s(); // Initial computation
      expect(computeFn).toHaveBeenCalledTimes(1);

      // Multiple stale calls
      s.stale();
      s.stale();
      s.stale();

      // Next access only recomputes once
      s();
      expect(computeFn).toHaveBeenCalledTimes(2);
    });

    it("should throw error if signal is disposed", () => {
      const s = signal(() => 42);
      s.dispose();

      expect(() => s.stale()).toThrow("Cannot mark disposed signal as stale");
    });
  });

  describe("context.refresh()", () => {
    it("should throw error when called synchronously during computation", () => {
      expect(() => {
        signal((context: any) => {
          // This should throw - calling refresh synchronously
          context.refresh();
          return 42;
        })();
      }).toThrow("context.refresh() can only be called asynchronously");
    });

    it("should allow signal to schedule its own refresh", async () => {
      let count = 0;
      const s = signal((context: any) => {
        count++;
        // Schedule refresh after 1 second
        if (count < 3) {
          setTimeout(() => context.refresh(), 1000);
        }
        return count;
      });

      // Initial computation
      expect(s()).toBe(1);

      // First refresh
      vi.advanceTimersByTime(1000);
      expect(s()).toBe(2);

      // Second refresh
      vi.advanceTimersByTime(1000);
      expect(s()).toBe(3);

      // No more refreshes scheduled
      vi.advanceTimersByTime(1000);
      expect(s()).toBe(3);
    });

    it("should be safe to call even if computation is aborted", async () => {
      const s = signal(async (context: any) => {
        // Schedule refresh that will be called after abort
        setTimeout(() => context.refresh(), 100);
        await new Promise((resolve) => setTimeout(resolve, 50));
        return "data";
      });

      s(); // Start first computation

      // Trigger recomputation (aborts previous)
      vi.advanceTimersByTime(60);
      s.refresh();

      // The scheduled refresh from aborted computation should be no-op
      vi.advanceTimersByTime(100);

      // Should not crash
      expect(s()).toBeTruthy();
    });

    it("should work with exponential backoff pattern", async () => {
      let attempt = 0;
      const s = signal(async (context: any) => {
        attempt++;

        // Retry logic with exponential backoff
        if (attempt < 3) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          setTimeout(() => context.refresh(), delay);
        }

        return `attempt-${attempt}`;
      });

      // First attempt (immediate)
      await expect(s()).resolves.toBe("attempt-1");
      expect(attempt).toBe(1);

      // Second attempt after 1s (2^0 * 1000)
      vi.advanceTimersByTime(1000);
      await Promise.resolve(); // Flush microtask for refresh
      await expect(s()).resolves.toBe("attempt-2");
      expect(attempt).toBe(2);

      // Third attempt after 2s (2^1 * 1000)
      vi.advanceTimersByTime(2000);
      await Promise.resolve(); // Flush microtask for refresh
      await expect(s()).resolves.toBe("attempt-3");
      expect(attempt).toBe(3);

      // No more refreshes after attempt 3
      vi.advanceTimersByTime(10000);
      await Promise.resolve();
      await expect(s()).resolves.toBe("attempt-3");
      expect(attempt).toBe(3);
    });
  });

  describe("context.stale()", () => {
    it("should throw error when called synchronously during computation", () => {
      expect(() => {
        signal((context: any) => {
          // This should throw - calling stale synchronously
          context.stale();
          return 42;
        })();
      }).toThrow("context.stale() can only be called asynchronously");
    });

    it("should allow signal to mark itself as stale with TTL", () => {
      let computeCount = 0;
      const s = signal((context: any) => {
        computeCount++;
        // Mark stale after 5 seconds (cache TTL)
        setTimeout(() => context.stale(), 5000);
        return `data-${computeCount}`;
      });

      // Initial computation
      expect(s()).toBe("data-1");
      expect(computeCount).toBe(1);

      // Access before TTL - uses cached value
      vi.advanceTimersByTime(3000);
      expect(s()).toBe("data-1");
      expect(computeCount).toBe(1);

      // TTL expires (marked as stale)
      vi.advanceTimersByTime(3000);

      // Next access triggers recomputation
      expect(s()).toBe("data-2");
      expect(computeCount).toBe(2);
    });

    it("should be safe to call even if computation is aborted", () => {
      const s = signal((context: any) => {
        // Schedule stale that will be called after abort
        setTimeout(() => context.stale(), 100);
        return Math.random();
      });

      s(); // Initial computation

      // Trigger recomputation (aborts previous)
      vi.advanceTimersByTime(50);
      s.refresh();

      // The scheduled stale from aborted computation should be no-op
      vi.advanceTimersByTime(100);

      // Should not crash
      expect(s()).toBeTruthy();
    });
  });

  describe("refresh() and stale() interaction", () => {
    it("should allow refresh to override pending stale", async () => {
      const computeFn = vi.fn(() => Math.random());
      const s = signal(computeFn);

      s(); // Initial
      expect(computeFn).toHaveBeenCalledTimes(1);

      // Mark as stale (lazy)
      s.stale();

      // But refresh immediately (eager)
      s.refresh();
      await Promise.resolve();
      expect(computeFn).toHaveBeenCalledTimes(2);

      // Access after refresh doesn't recompute again
      s();
      expect(computeFn).toHaveBeenCalledTimes(2);
    });

    it("should allow stale after refresh", async () => {
      const computeFn = vi.fn(() => Math.random());
      const s = signal(computeFn);

      s(); // Initial
      s.refresh(); // Recompute immediately
      await Promise.resolve();
      expect(computeFn).toHaveBeenCalledTimes(2);

      s.stale(); // Mark as stale
      expect(computeFn).toHaveBeenCalledTimes(2);

      s(); // Recompute on access
      expect(computeFn).toHaveBeenCalledTimes(3);
    });
  });

  describe("real-world patterns", () => {
    it("should support polling pattern with context.refresh()", async () => {
      let fetchCount = 0;
      const pollInterval = 1000;
      let isPolling = true;
      let timerId: any;

      const liveData = signal(async (context: any) => {
        fetchCount++;
        const data = `poll-${fetchCount}`;

        // Schedule next poll
        if (isPolling) {
          timerId = setTimeout(() => context.refresh(), pollInterval);
        }

        return data;
      });

      // Start polling
      expect(await liveData()).toBe("poll-1");

      // Poll 1
      vi.advanceTimersByTime(1000);
      await Promise.resolve(); // Flush microtask for refresh
      expect(await liveData()).toBe("poll-2");

      // Poll 2
      vi.advanceTimersByTime(1000);
      await Promise.resolve(); // Flush microtask for refresh
      expect(await liveData()).toBe("poll-3");

      // Stop polling by clearing the timer
      isPolling = false;
      clearTimeout(timerId);

      // No more polls
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
      expect(await liveData()).toBe("poll-3");
    });

    it("should support cache invalidation with stale()", () => {
      const cache = new Map();
      let fetchCount = 0;

      const fetchUser = signal((context: any) => {
        fetchCount++;
        const userId = 1;

        if (cache.has(userId)) {
          return cache.get(userId);
        }

        const user = { id: userId, name: `User-${fetchCount}` };
        cache.set(userId, user);

        return user;
      });

      // First fetch
      const user1 = fetchUser();
      expect(user1).toEqual({ id: 1, name: "User-1" });
      expect(fetchCount).toBe(1);

      // Cached
      const user2 = fetchUser();
      expect(user2).toBe(user1);
      expect(fetchCount).toBe(1);

      // Invalidate cache
      cache.clear();
      fetchUser.stale();

      // Refetch on next access
      const user3 = fetchUser();
      expect(user3).toEqual({ id: 1, name: "User-2" });
      expect(fetchCount).toBe(2);
    });
  });
});
