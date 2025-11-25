import { describe, it, expect, vi } from "vitest";
import { signal } from "./signal";

describe("signal.when()", () => {
  describe("single target signal", () => {
    it("should debug subscription", () => {
      const trigger = signal(1);
      const listener = vi.fn();
      
      // Direct subscription (should work)
      trigger.on(listener);
      
      trigger.set(2);
      
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should call callback when target signal changes", () => {
      const trigger = signal(1);
      const target = signal(0);
      const callback = vi.fn();

      target.when(trigger, callback);

      expect(callback).not.toHaveBeenCalled();

      trigger.set(2);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(target, trigger);
    });

    it("should refresh current signal when triggered", async () => {
      const trigger = signal(1);
      const computeCount = vi.fn();
      const target = signal(() => {
        computeCount();
        return Math.random();
      });

      const callback = vi.fn((current) => {
        current.refresh();
      });

      target.when(trigger, callback);

      // Initial computation
      target();
      expect(computeCount).toHaveBeenCalledTimes(1);

      // Trigger change
      trigger.set(2);
      
      // Verify callback was called
      expect(callback).toHaveBeenCalledTimes(1);

      // Wait for refresh to complete (it's batched with queueMicrotask)
      await Promise.resolve();

      // Should have recomputed
      expect(computeCount).toHaveBeenCalledTimes(2);
    });

    it("should mark current signal as stale when triggered", async () => {
      const trigger = signal(1);
      const computeCount = vi.fn();
      const target = signal(() => {
        computeCount();
        return Math.random();
      });

      target.when(trigger, (current) => {
        current.stale();
      });

      // Initial computation
      target();
      expect(computeCount).toHaveBeenCalledTimes(1);

      // Trigger change
      trigger.set(2);

      // Wait for any pending microtasks
      await Promise.resolve();

      // Should NOT have recomputed yet
      expect(computeCount).toHaveBeenCalledTimes(1);

      // Access triggers recomputation
      target();
      expect(computeCount).toHaveBeenCalledTimes(2);
    });
  });

  describe("multiple target signals", () => {
    it("should call callback when any target signal changes", () => {
      const trigger1 = signal(1);
      const trigger2 = signal(2);
      const target = signal(0);
      const callback = vi.fn();

      target.when([trigger1, trigger2], callback);

      expect(callback).not.toHaveBeenCalled();

      trigger1.set(10);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(target, trigger1);

      trigger2.set(20);
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith(target, trigger2);
    });

    it("should identify which trigger caused the change", () => {
      const trigger1 = signal(1);
      const trigger2 = signal(2);
      const target = signal<string[]>([]);

      target.when([trigger1, trigger2], (current, trigger) => {
        current.set((prev) => [
          ...prev,
          `Changed by: ${trigger === trigger1 ? "trigger1" : "trigger2"}`,
        ]);
      });

      trigger1.set(10);
      expect(target()).toEqual(["Changed by: trigger1"]);

      trigger2.set(20);
      expect(target()).toEqual(["Changed by: trigger1", "Changed by: trigger2"]);
    });

    it("should refresh on specific triggers", async () => {
      const userId = signal(1);
      const filter = signal("");
      const fetchCount = vi.fn();

      const results = signal(async () => {
        fetchCount();
        return `user:${userId()} filter:${filter()}`;
      });

      // Different behaviors for different triggers
      results
        .when(userId, (current) => {
          current.refresh(); // Immediate refresh
        })
        .when(filter, (current) => {
          current.stale(); // Lazy invalidation
        });

      // Initial fetch
      results();
      expect(fetchCount).toHaveBeenCalledTimes(1);

      // userId change: immediate refresh
      userId.set(2);
      
      // Wait for refresh to complete
      await Promise.resolve();
      
      expect(fetchCount).toHaveBeenCalledTimes(2);

      // filter change: no immediate refresh
      filter.set("test");
      
      // Wait for any pending microtasks
      await Promise.resolve();
      
      expect(fetchCount).toHaveBeenCalledTimes(2);

      // Access triggers fetch
      results();
      expect(fetchCount).toHaveBeenCalledTimes(3);
    });
  });

  describe("method chaining", () => {
    it("should return the signal for chaining", () => {
      const trigger1 = signal(1);
      const trigger2 = signal(2);
      const target = signal(0);

      const result = target
        .when(trigger1, () => {})
        .when(trigger2, () => {});

      expect(result).toBe(target);
    });

    it("should support multiple when() calls", () => {
      const trigger1 = signal(1);
      const trigger2 = signal(2);
      const target = signal(0);
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      target.when(trigger1, callback1).when(trigger2, callback2);

      trigger1.set(10);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();

      trigger2.set(20);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe("cleanup", () => {
    it("should unsubscribe when signal is disposed", () => {
      const trigger = signal(1);
      const target = signal(0);
      const callback = vi.fn();

      target.when(trigger, callback);

      trigger.set(2);
      expect(callback).toHaveBeenCalledTimes(1);

      target.dispose();

      trigger.set(3);
      // Callback should not be called after disposal
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should unsubscribe from multiple triggers when disposed", () => {
      const trigger1 = signal(1);
      const trigger2 = signal(2);
      const target = signal(0);
      const callback = vi.fn();

      target.when([trigger1, trigger2], callback);

      trigger1.set(10);
      trigger2.set(20);
      expect(callback).toHaveBeenCalledTimes(2);

      target.dispose();

      trigger1.set(30);
      trigger2.set(40);
      // Callback should not be called after disposal
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it("should throw error when calling when() on disposed signal", () => {
      const trigger = signal(1);
      const target = signal(0);

      target.dispose();

      expect(() => {
        target.when(trigger, () => {});
      }).toThrow("Cannot attach when() listener to disposed signal");
    });
  });

  describe("computed signals", () => {
    it("should work with computed signals", () => {
      const dep = signal(1);
      const trigger = signal(0);
      const computed = signal({ dep }, ({ deps }) => deps.dep * 2);
      const callback = vi.fn();

      computed.when(trigger, callback);

      trigger.set(1);
      expect(callback).toHaveBeenCalledWith(computed, trigger);
    });

    it("should refresh computed signal when triggered", async () => {
      const dep = signal(1);
      const trigger = signal(0);
      const computeFn = vi.fn(({ deps }: any) => deps.dep * 2);
      const computed = signal({ dep }, computeFn);

      computed.when(trigger, (current) => {
        current.refresh();
      });

      // Initial computation
      computed();
      expect(computeFn).toHaveBeenCalledTimes(1);

      // Change dependency (auto-refresh)
      dep.set(2);
      expect(computeFn).toHaveBeenCalledTimes(2);

      // Trigger external refresh
      trigger.set(1);
      
      // Wait for refresh to complete
      await Promise.resolve();
      
      expect(computeFn).toHaveBeenCalledTimes(3);
    });
  });

  describe("real-world patterns", () => {
    it("should implement cache invalidation pattern", () => {
      const userId = signal(1);
      const userCache = signal(async () => {
        return { id: userId(), name: "User" };
      });

      // Invalidate cache when userId changes
      userCache.when(userId, (current) => {
        current.stale();
      });

      // Initial load
      userCache();

      // Change userId marks cache as stale (lazy)
      userId.set(2);

      // Next access will refetch
      userCache();
    });

    it("should implement cross-signal synchronization", () => {
      const masterState = signal("init");
      const replica1 = signal("init");
      const replica2 = signal("init");

      // Replicas follow master
      replica1.when(masterState, (current, trigger) => {
        current.set(trigger());
      });

      replica2.when(masterState, (current, trigger) => {
        current.set(trigger());
      });

      expect(replica1()).toBe("init");
      expect(replica2()).toBe("init");

      masterState.set("updated");

      expect(replica1()).toBe("updated");
      expect(replica2()).toBe("updated");
    });

    it("should implement derived action pattern", () => {
      const searchTerm = signal("");
      const sortBy = signal("name");
      const results = signal<any[]>([]);
      const isSearching = signal(false);

      // Mark as searching when search params change
      results.when([searchTerm, sortBy], (current) => {
        isSearching.set(true);
        current.refresh();
      });

      // Simulate search
      results.when(results, () => {
        isSearching.set(false);
      });

      expect(isSearching()).toBe(false);

      searchTerm.set("test");
      expect(isSearching()).toBe(true);
    });
  });
});

