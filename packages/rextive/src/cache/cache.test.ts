import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cache } from "./cache";
import { swr, ttl, lru, hydrate } from "./strategies";

describe("cache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("single cache", () => {
    it("should create a cache with a name", () => {
      const getUser = cache("users", async (id: string) => ({
        id,
        name: "test",
      }));
      expect(getUser.name).toBe("users");
    });

    it("should return cached value on access", async () => {
      const factory = vi.fn(async (id: string) => ({ id, name: "User " + id }));
      const getUser = cache("users", factory);

      const { value, unref } = getUser("123");
      const result = await value;

      expect(result).toEqual({ id: "123", name: "User 123" });
      expect(factory).toHaveBeenCalledTimes(1);

      unref();
    });

    it("should reuse cached value for same key", async () => {
      const factory = vi.fn(async (id: string) => ({ id, name: "User " + id }));
      const getUser = cache("users", factory);

      const result1 = getUser("123");
      const result2 = getUser("123");

      await result1.value;
      await result2.value;

      expect(factory).toHaveBeenCalledTimes(1);

      result1.unref();
      result2.unref();
    });

    it("should call factory for different keys", async () => {
      const factory = vi.fn(async (id: string) => ({ id, name: "User " + id }));
      const getUser = cache("users", factory);

      const result1 = getUser("123");
      const result2 = getUser("456");

      await result1.value;
      await result2.value;

      expect(factory).toHaveBeenCalledTimes(2);

      result1.unref();
      result2.unref();
    });

    it("should track reference count", async () => {
      const factory = vi.fn(async (id: string) => ({ id }));
      const getUser = cache("users", factory);

      const result1 = getUser("123");
      const result2 = getUser("123");
      const result3 = getUser("123");

      await result1.value;

      // All should reference the same entry
      expect(factory).toHaveBeenCalledTimes(1);

      result1.unref();
      result2.unref();
      result3.unref();
    });

    it("should handle stale marking", async () => {
      const factory = vi.fn(async (id: string) => ({ id, time: Date.now() }));
      const getUser = cache("users", factory);

      // First access
      const result1 = getUser("123");
      await result1.value;
      result1.unref();

      expect(factory).toHaveBeenCalledTimes(1);

      // Mark as stale
      getUser.stale("123");

      // Access again - should trigger re-fetch
      const result2 = getUser("123");
      await result2.value;
      result2.unref();

      expect(factory).toHaveBeenCalledTimes(2);
    });

    it("should handle staleAll", async () => {
      const factory = vi.fn(async (id: string) => ({ id }));
      const getUser = cache("users", factory);

      // Populate cache
      const r1 = getUser("123");
      const r2 = getUser("456");
      await r1.value;
      await r2.value;
      r1.unref();
      r2.unref();

      expect(factory).toHaveBeenCalledTimes(2);

      // Mark all as stale
      getUser.staleAll();

      // Access both
      const r3 = getUser("123");
      const r4 = getUser("456");
      await r3.value;
      await r4.value;
      r3.unref();
      r4.unref();

      expect(factory).toHaveBeenCalledTimes(4);
    });

    it("should handle refresh", async () => {
      const factory = vi.fn(async (id: string) => ({ id, time: Date.now() }));
      const getUser = cache("users", factory);

      // First access
      const result1 = getUser("123");
      const value1 = await result1.value;
      result1.unref();

      expect(factory).toHaveBeenCalledTimes(1);

      // Advance time
      vi.advanceTimersByTime(1000);

      // Refresh
      const value2 = await getUser.refresh("123");

      expect(factory).toHaveBeenCalledTimes(2);
      expect(value2.time).toBeGreaterThan(value1.time);
    });

    it("should handle delete", async () => {
      const factory = vi.fn(async (id: string) => ({ id }));
      const getUser = cache("users", factory);

      // Populate cache
      const r1 = getUser("123");
      await r1.value;
      r1.unref();

      expect(getUser.has("123")).toBe(true);

      // Delete
      const deleted = getUser.delete("123");
      expect(deleted).toBe(true);
      expect(getUser.has("123")).toBe(false);
    });

    it("should handle clear", async () => {
      const factory = vi.fn(async (id: string) => ({ id }));
      const getUser = cache("users", factory);

      // Populate cache
      const r1 = getUser("123");
      const r2 = getUser("456");
      await r1.value;
      await r2.value;
      r1.unref();
      r2.unref();

      expect(getUser.size).toBe(2);

      // Clear
      getUser.clear();
      expect(getUser.size).toBe(0);
    });

    it("should handle peek without creating entry", async () => {
      const factory = vi.fn(async (id: string) => ({ id }));
      const getUser = cache("users", factory);

      // Peek non-existent
      expect(getUser.peek("123")).toBeUndefined();
      expect(factory).not.toHaveBeenCalled();

      // Create entry
      const r1 = getUser("123");
      await r1.value;
      r1.unref();

      // Peek existing
      expect(getUser.peek("123")).toEqual({ id: "123" });
    });

    it("should handle extract for SSR", async () => {
      const factory = vi.fn(async (id: string) => ({ id, name: "User " + id }));
      const getUser = cache("users", factory);

      // Populate cache
      const r1 = getUser("123");
      const r2 = getUser("456");
      await r1.value;
      await r2.value;
      r1.unref();
      r2.unref();

      const extracted = getUser.extract();
      expect(extracted).toEqual({
        "123": { id: "123", name: "User 123" },
        "456": { id: "456", name: "User 456" },
      });
    });

    it("should handle prefetch", async () => {
      const factory = vi.fn(async (id: string) => ({ id }));
      const getUser = cache("users", factory);

      // Prefetch
      const value = await getUser.prefetch("123");

      expect(value).toEqual({ id: "123" });
      expect(factory).toHaveBeenCalledTimes(1);
      expect(getUser.has("123")).toBe(true);
    });

    it("should handle dispose", async () => {
      const factory = vi.fn(async (id: string) => ({ id }));
      const getUser = cache("users", factory);

      // Populate cache
      const r1 = getUser("123");
      await r1.value;
      r1.unref();

      // Dispose
      getUser.dispose();

      // Should throw on access
      expect(() => getUser("123")).toThrow('Cache "users" has been disposed');
    });
  });

  describe("cache group", () => {
    it("should create a cache group", () => {
      const userApi = cache("userApi", {
        getUser: async (id: string) => ({ id }),
        getPosts: async (userId: string) => [{ id: "1", userId }],
      });

      expect(userApi.name).toBe("userApi");
      expect(userApi.getUser.name).toBe("userApi.getUser");
      expect(userApi.getPosts.name).toBe("userApi.getPosts");
    });

    it("should access individual caches", async () => {
      const userApi = cache("userApi", {
        getUser: async (id: string) => ({ id, name: "User " + id }),
        getPosts: async (userId: string) => [{ id: "1", userId }],
      });

      const userResult = userApi.getUser("123");
      const postsResult = userApi.getPosts("123");

      const user = await userResult.value;
      const posts = await postsResult.value;

      expect(user).toEqual({ id: "123", name: "User 123" });
      expect(posts).toEqual([{ id: "1", userId: "123" }]);

      userResult.unref();
      postsResult.unref();
    });

    it("should handle staleAll on group", async () => {
      const userFactory = vi.fn(async (id: string) => ({ id }));
      const postsFactory = vi.fn(async (userId: string) => [{ userId }]);

      const userApi = cache("userApi", {
        getUser: userFactory,
        getPosts: postsFactory,
      });

      // Populate caches
      const r1 = userApi.getUser("123");
      const r2 = userApi.getPosts("123");
      await r1.value;
      await r2.value;
      r1.unref();
      r2.unref();

      expect(userFactory).toHaveBeenCalledTimes(1);
      expect(postsFactory).toHaveBeenCalledTimes(1);

      // Stale all
      userApi.staleAll();

      // Access again
      const r3 = userApi.getUser("123");
      const r4 = userApi.getPosts("123");
      await r3.value;
      await r4.value;
      r3.unref();
      r4.unref();

      expect(userFactory).toHaveBeenCalledTimes(2);
      expect(postsFactory).toHaveBeenCalledTimes(2);
    });

    it("should handle clearAll on group", async () => {
      const userApi = cache("userApi", {
        getUser: async (id: string) => ({ id }),
        getPosts: async (userId: string) => [{ userId }],
      });

      // Populate caches
      const r1 = userApi.getUser("123");
      const r2 = userApi.getPosts("123");
      await r1.value;
      await r2.value;
      r1.unref();
      r2.unref();

      expect(userApi.getUser.size).toBe(1);
      expect(userApi.getPosts.size).toBe(1);

      // Clear all
      userApi.clearAll();

      expect(userApi.getUser.size).toBe(0);
      expect(userApi.getPosts.size).toBe(0);
    });

    it("should handle extract on group", async () => {
      const userApi = cache("userApi", {
        getUser: async (id: string) => ({ id }),
        getPosts: async (userId: string) => [{ userId }],
      });

      // Populate caches
      const r1 = userApi.getUser("123");
      const r2 = userApi.getPosts("123");
      await r1.value;
      await r2.value;
      r1.unref();
      r2.unref();

      const extracted = userApi.extract();
      expect(extracted).toEqual({
        getUser: { "123": { id: "123" } },
        getPosts: { "123": [{ userId: "123" }] },
      });
    });

    it("should handle dispose on group", async () => {
      const userApi = cache("userApi", {
        getUser: async (id: string) => ({ id }),
        getPosts: async (userId: string) => [{ userId }],
      });

      // Populate caches
      const r1 = userApi.getUser("123");
      await r1.value;
      r1.unref();

      // Dispose
      userApi.dispose();

      // Should throw on access
      expect(() => userApi.getUser("123")).toThrow("has been disposed");
    });
  });
});

describe("strategies", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("swr", () => {
    it("should mark entry stale after staleTime", async () => {
      const factory = vi.fn(async (id: string) => ({ id, time: Date.now() }));
      const getUser = cache("users", factory, {
        use: [swr({ staleTime: 5000 })],
      });

      // First access
      const r1 = getUser("123");
      await r1.value;
      r1.unref();

      expect(factory).toHaveBeenCalledTimes(1);

      // Access before staleTime
      vi.advanceTimersByTime(3000);
      const r2 = getUser("123");
      await r2.value;
      r2.unref();

      expect(factory).toHaveBeenCalledTimes(1);

      // Access after staleTime - marks entry as stale
      vi.advanceTimersByTime(3000); // Now at 6000ms total
      const r3 = getUser("123");
      await r3.value;
      r3.unref();

      // Entry is now marked stale, factory called on NEXT access
      expect(factory).toHaveBeenCalledTimes(1);

      // Next access triggers background refresh
      const r4 = getUser("123");
      await r4.value;
      r4.unref();

      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  describe("ttl", () => {
    describe("stale option", () => {
      it("should mark entry stale after stale time", async () => {
        const factory = vi.fn(async (id: string) => ({ id }));
        const getUser = cache("users", factory, {
          use: [ttl({ stale: 5000 })],
        });

        // First access
        const r1 = getUser("123");
        await r1.value;
        r1.unref();

        expect(factory).toHaveBeenCalledTimes(1);

        // Wait for stale time
        vi.advanceTimersByTime(6000);

        // Access triggers stale marking, then next access re-fetches
        const r2 = getUser("123");
        await r2.value;
        r2.unref();

        const r3 = getUser("123");
        await r3.value;
        r3.unref();

        expect(factory).toHaveBeenCalledTimes(2);
      });
    });

    describe("expire option", () => {
      it("should remove entry after expire time (lazy cleanup)", async () => {
        const factory = vi.fn(async (id: string) => ({ id }));
        const getUser = cache("users", factory, {
          use: [ttl({ expire: 5000 })],
        });

        // First access
        const r1 = getUser("123");
        await r1.value;
        r1.unref();

        expect(getUser.has("123")).toBe(true);

        // Add another entry to trigger cleanup
        const r2 = getUser("456");
        await r2.value;
        r2.unref();

        // Wait for expire time
        vi.advanceTimersByTime(6000);

        // Access the second entry - triggers lazy cleanup
        const r3 = getUser("456");
        await r3.value;
        r3.unref();

        // First entry should be expired
        expect(getUser.has("123")).toBe(false);
      });

      it("should remove entry after expire time (periodic cleanup)", async () => {
        const factory = vi.fn(async (id: string) => ({ id }));
        const getUser = cache("users", factory, {
          use: [ttl({ expire: 5000, interval: 1000 })],
        });

        // First access
        const r1 = getUser("123");
        await r1.value;
        r1.unref();

        expect(getUser.has("123")).toBe(true);

        // Wait for expire time + interval
        vi.advanceTimersByTime(6000);

        expect(getUser.has("123")).toBe(false);
      });
    });

    describe("idle option", () => {
      it("should remove entry after idle time (lazy cleanup)", async () => {
        const factory = vi.fn(async (id: string) => ({ id }));
        const getUser = cache("users", factory, {
          use: [ttl({ idle: 5000 })],
        });

        // First access and release
        const r1 = getUser("123");
        await r1.value;
        r1.unref();

        expect(getUser.has("123")).toBe(true);

        // Add another entry
        const r2 = getUser("456");
        await r2.value;
        r2.unref();

        // Wait for idle time
        vi.advanceTimersByTime(6000);

        // Access second entry - triggers lazy cleanup of first
        const r3 = getUser("456");
        await r3.value;
        r3.unref();

        // First entry should be removed (idle)
        expect(getUser.has("123")).toBe(false);
      });

      it("should not remove entry if still referenced", async () => {
        const factory = vi.fn(async (id: string) => ({ id }));
        const getUser = cache("users", factory, {
          use: [ttl({ idle: 5000 })],
        });

        // First access - keep reference
        const r1 = getUser("123");
        await r1.value;
        // Don't unref

        // Add and release another entry
        const r2 = getUser("456");
        await r2.value;
        r2.unref();

        // Wait for idle time
        vi.advanceTimersByTime(6000);

        // Access triggers cleanup
        const r3 = getUser("456");
        await r3.value;
        r3.unref();

        // First entry should still exist (has refs)
        expect(getUser.has("123")).toBe(true);

        r1.unref();
      });

      it("should remove immediately if idle=0", async () => {
        const factory = vi.fn(async (id: string) => ({ id }));
        const getUser = cache("users", factory, {
          use: [ttl({ idle: 0 })],
        });

        // Access and release
        const r1 = getUser("123");
        await r1.value;

        expect(getUser.has("123")).toBe(true);

        r1.unref();

        // Should be removed immediately
        expect(getUser.has("123")).toBe(false);
      });

      it("should cancel idle timer if accessed again", async () => {
        const factory = vi.fn(async (id: string) => ({ id }));
        const getUser = cache("users", factory, {
          use: [ttl({ idle: 5000 })],
        });

        // First access and release
        const r1 = getUser("123");
        await r1.value;
        r1.unref();

        // Wait some time
        vi.advanceTimersByTime(3000);

        // Access again (should reset idle timer)
        const r2 = getUser("123");
        await r2.value;
        r2.unref();

        // Wait less than idle time from last release
        vi.advanceTimersByTime(3000);

        // Add another entry to trigger cleanup
        const r3 = getUser("456");
        await r3.value;

        // Access to trigger cleanup
        const r4 = getUser("456");
        await r4.value;
        r4.unref();
        r3.unref();

        // Entry should still exist (not idle long enough from last release)
        expect(getUser.has("123")).toBe(true);
      });
    });

    describe("combined options", () => {
      it("should handle stale + expire + idle together", async () => {
        const factory = vi.fn(async (id: string) => ({ id }));
        const getUser = cache("users", factory, {
          use: [
            ttl({
              stale: 3000,
              expire: 10000,
              idle: 5000,
            }),
          ],
        });

        // First access and release
        const r1 = getUser("123");
        await r1.value;
        r1.unref();

        expect(factory).toHaveBeenCalledTimes(1);

        // After stale time - should mark stale
        vi.advanceTimersByTime(4000);

        const r2 = getUser("123");
        await r2.value;
        r2.unref();

        // Next access triggers refresh
        const r3 = getUser("123");
        await r3.value;
        r3.unref();

        expect(factory).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("lru", () => {
    it("should evict least recently used when exceeding maxSize", async () => {
      const factory = vi.fn(async (id: string) => ({ id }));
      const getUser = cache("users", factory, {
        use: [lru({ maxSize: 2 })],
      });

      // Add 3 entries
      const r1 = getUser("1");
      await r1.value;
      r1.unref();

      vi.advanceTimersByTime(100);

      const r2 = getUser("2");
      await r2.value;
      r2.unref();

      vi.advanceTimersByTime(100);

      const r3 = getUser("3");
      await r3.value;
      r3.unref();

      // Oldest should be evicted
      expect(getUser.has("1")).toBe(false);
      expect(getUser.has("2")).toBe(true);
      expect(getUser.has("3")).toBe(true);
    });

    it("should prefer evicting entries with 0 refCount", async () => {
      const factory = vi.fn(async (id: string) => ({ id }));
      const getUser = cache("users", factory, {
        use: [lru({ maxSize: 2 })],
      });

      // Add entries, keep one referenced
      const r1 = getUser("1");
      await r1.value;
      // Don't unref r1

      vi.advanceTimersByTime(100);

      const r2 = getUser("2");
      await r2.value;
      r2.unref();

      vi.advanceTimersByTime(100);

      const r3 = getUser("3");
      await r3.value;
      r3.unref();

      // Entry 2 should be evicted (older with 0 refs)
      // Entry 1 should remain (has refs even though oldest)
      expect(getUser.has("1")).toBe(true);
      expect(getUser.has("2")).toBe(false);
      expect(getUser.has("3")).toBe(true);

      r1.unref();
    });
  });

  describe("hydrate", () => {
    it("should hydrate data on init", async () => {
      const factory = vi.fn(async (id: string) => ({ id }));
      const getUser = cache("users", factory, {
        use: [
          hydrate({
            source: () => ({
              "123": { id: "123", name: "Alice" },
              "456": { id: "456", name: "Bob" },
            }),
          }),
        ],
      });

      // Data should be available immediately
      expect(getUser.peek("123")).toEqual({ id: "123", name: "Alice" });
      expect(getUser.peek("456")).toEqual({ id: "456", name: "Bob" });

      // Factory should not be called for hydrated data
      const r1 = getUser("123");
      await r1.value;
      r1.unref();

      expect(factory).not.toHaveBeenCalled();
    });

    it("should mark hydrated data as stale if option set", async () => {
      const factory = vi.fn(async (id: string) => ({ id, fresh: true }));
      const getUser = cache("users", factory, {
        use: [
          hydrate({
            source: () => ({
              "123": { id: "123", fresh: false },
            }),
            stale: true,
          }),
        ],
      });

      // Access should return hydrated data and trigger re-fetch
      const r1 = getUser("123");
      const value = await r1.value;
      r1.unref();

      // Should return hydrated data first
      expect(value).toEqual({ id: "123", fresh: false });

      // Factory should have been called for background refresh
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("should handle missing source data", async () => {
      const factory = vi.fn(async (id: string) => ({ id }));
      const getUser = cache("users", factory, {
        use: [
          hydrate({
            source: () => undefined,
          }),
        ],
      });

      // Should fetch normally
      const r1 = getUser("123");
      await r1.value;
      r1.unref();

      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe("cache group operations", () => {
    it("should support refreshAll on cache group", async () => {
      const userFactory = vi.fn(async (id: string) => ({ id, type: "user" }));
      const postFactory = vi.fn(async (id: string) => ({ id, type: "post" }));

      // Create a cache group by passing factory map
      const api = cache("api", {
        users: userFactory,
        posts: postFactory,
      });

      // Access some data
      const userRef = api.users("1");
      const postRef = api.posts("1");
      await userRef.value;
      await postRef.value;

      expect(userFactory).toHaveBeenCalledTimes(1);
      expect(postFactory).toHaveBeenCalledTimes(1);

      // Refresh all
      await api.refreshAll();

      // Both factories should be called again
      expect(userFactory).toHaveBeenCalledTimes(2);
      expect(postFactory).toHaveBeenCalledTimes(2);

      userRef.unref();
      postRef.unref();
    });

    it("should support extract on cache group", async () => {
      const userFactory = vi.fn(async (id: string) => ({ id, name: "User " + id }));
      const postFactory = vi.fn(async (id: string) => ({ id, title: "Post " + id }));

      // Create a cache group by passing factory map
      const api = cache("api", {
        users: userFactory,
        posts: postFactory,
      });

      // Access some data
      const userRef = api.users("1");
      const postRef = api.posts("a");
      await userRef.value;
      await postRef.value;

      // Extract all data
      const data = api.extract();

      expect(data).toEqual({
        users: { "1": { id: "1", name: "User 1" } },
        posts: { a: { id: "a", title: "Post a" } },
      });

      userRef.unref();
      postRef.unref();
    });
  });

  describe("ttl strategy onDispose", () => {
    it("should cleanup interval on dispose", async () => {
      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

      const factory = vi.fn(async (id: string) => ({ id }));
      const getUser = cache("users", factory, {
        use: [
          ttl({
            stale: 1000,
            interval: 500, // Enable periodic cleanup
          }),
        ],
      });

      // Access to trigger interval setup
      const ref = getUser("1");
      await ref.value;
      ref.unref();

      // Dispose the cache
      getUser.dispose();

      // Interval should have been cleared
      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });
  });

  describe("ttl strategy onClear", () => {
    it("should clear released timestamps on cache clear", async () => {
      const factory = vi.fn(async (id: string) => ({ id }));
      const getUser = cache("users", factory, {
        use: [
          ttl({
            idle: 5000, // Use idle to track releases
          }),
        ],
      });

      // Access and release
      const ref = getUser("1");
      await ref.value;
      ref.unref();

      // Clear the cache
      getUser.clear();

      // Re-access should work fresh
      const ref2 = getUser("1");
      await ref2.value;

      expect(factory).toHaveBeenCalledTimes(2);

      ref2.unref();
    });
  });

  describe("cache dispose with strategies", () => {
    it("should call onDispose for all strategies", () => {
      const onDisposeSpy = vi.fn();

      const customStrategy = () => ({
        onDispose: onDisposeSpy,
      });

      const factory = vi.fn(async (id: string) => ({ id }));
      const getUser = cache("users", factory, {
        use: [customStrategy],
      });

      getUser.dispose();

      expect(onDisposeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("cache error handling", () => {
    it("should handle factory errors correctly", async () => {
      const factory = vi.fn(async (id: string) => {
        if (id === "error") {
          throw new Error("Factory error");
        }
        return { id };
      });

      const getItem = cache("items", factory);

      // Normal fetch works
      const ref1 = getItem("1");
      await expect(ref1.value).resolves.toEqual({ id: "1" });
      ref1.unref();

      // Error fetch throws
      const ref2 = getItem("error");
      await expect(ref2.value).rejects.toThrow("Factory error");
      ref2.unref();

      // Can still fetch other items after error
      const ref3 = getItem("2");
      await expect(ref3.value).resolves.toEqual({ id: "2" });
      ref3.unref();
    });

    it("should reset isFetching on error", async () => {
      let shouldThrow = true;
      const factory = vi.fn(async (id: string) => {
        if (shouldThrow) {
          throw new Error("Factory error");
        }
        return { id };
      });

      const getItem = cache("items", factory);

      // First attempt fails
      const ref1 = getItem("1");
      await expect(ref1.value).rejects.toThrow("Factory error");
      ref1.unref();

      // Clear the cache to allow retry
      getItem.clear();

      // Retry should work after fixing the factory
      shouldThrow = false;
      const ref2 = getItem("1");
      await expect(ref2.value).resolves.toEqual({ id: "1" });
      ref2.unref();

      // Factory was called twice - once for error, once for success after clear
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  describe("cache factory with no existing entry", () => {
    it("should create entry and return promise for new keys", async () => {
      const factory = vi.fn(async (id: string) => ({ id }));
      const getItem = cache("items", factory);

      // First access creates new entry
      const ref1 = getItem("new-key");
      expect(ref1.value).toBeInstanceOf(Promise);

      const result = await ref1.value;
      expect(result).toEqual({ id: "new-key" });
      ref1.unref();

      // Second access uses cached entry
      const ref2 = getItem("new-key");
      await expect(ref2.value).resolves.toEqual({ id: "new-key" });
      ref2.unref();

      // Factory only called once
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });
});
