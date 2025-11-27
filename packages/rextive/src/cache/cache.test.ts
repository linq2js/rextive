import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cache } from "./cache";
import { lru, hydrate, staleOn, evictOn } from "./strategies";

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
    it("should handle sync factory errors", async () => {
      const factory = vi.fn((id: string) => {
        if (id === "sync-error") {
          throw new Error("Sync error");
        }
        return Promise.resolve({ id });
      });

      const getItem = cache("items", factory);

      // Sync error is converted to rejected promise
      const ref = getItem("sync-error");
      await expect(ref.value).rejects.toThrow("Sync error");
      ref.unref();

      // Other keys still work
      const ref2 = getItem("ok");
      await expect(ref2.value).resolves.toEqual({ id: "ok" });
      ref2.unref();
    });

    it("should handle non-promise factory return", async () => {
      // Factory returns sync value (not a promise)
      const factory = vi.fn((id: string) => ({ id, sync: true }) as any);

      const getItem = cache("items", factory);

      // Sync value is normalized to promise
      const ref = getItem("123");
      const result = await ref.value;
      expect(result).toEqual({ id: "123", sync: true });
      ref.unref();
    });

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

  describe("onError hook", () => {
    it("should call onError hook when factory throws", async () => {
      const onErrorSpy = vi.fn();
      const customStrategy = () => ({
        onError: onErrorSpy,
      });

      const factory = vi.fn(async (id: string) => {
        throw new Error("Fetch failed");
      });

      const getItem = cache("items", factory, {
        use: [customStrategy],
      });

      const ref = getItem("1");
      await expect(ref.value).rejects.toThrow("Fetch failed");
      ref.unref();

      expect(onErrorSpy).toHaveBeenCalledTimes(1);
      expect(onErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          key: "1",
          isError: true,
        })
      );
    });

    it("should set isError and error on entry when factory throws", async () => {
      let capturedEntry: any;
      const customStrategy = () => ({
        onError: (_error: unknown, entry: any) => {
          capturedEntry = entry;
        },
      });

      const factory = vi.fn(async () => {
        throw new Error("Test error");
      });

      const getItem = cache("items", factory, {
        use: [customStrategy],
      });

      const ref = getItem("1");
      await expect(ref.value).rejects.toThrow("Test error");
      ref.unref();

      expect(capturedEntry.isError).toBe(true);
      expect(capturedEntry.error).toBeInstanceOf(Error);
      expect((capturedEntry.error as Error).message).toBe("Test error");
    });

    it("should clear isError on successful refetch", async () => {
      let capturedEntry: any;
      const customStrategy = () => ({
        onSet: (_key: unknown, _value: unknown, entry: any) => {
          capturedEntry = entry;
        },
      });

      let shouldFail = true;
      const factory = vi.fn(async (id: string) => {
        if (shouldFail) throw new Error("Fetch failed");
        return { id };
      });

      const getItem = cache("items", factory, {
        use: [customStrategy],
      });

      // First access fails
      const ref1 = getItem("1");
      await expect(ref1.value).rejects.toThrow();
      ref1.unref();

      // Mark as stale to allow retry
      getItem.stale("1");
      shouldFail = false;

      // Re-access triggers refetch
      const ref2 = getItem("1");
      await ref2.value;
      ref2.unref();

      expect(capturedEntry.isError).toBe(false);
      expect(capturedEntry.error).toBeUndefined();
    });
  });

  describe("staleOn", () => {
    it("should mark entry stale after specified time", async () => {
      const factory = vi.fn(async (id: string) => ({ id }));
      const getItem = cache("items", factory, {
        use: [staleOn({ after: 5000 })],
      });

      // First access
      const ref1 = getItem("1");
      await ref1.value;
      ref1.unref();

      expect(factory).toHaveBeenCalledTimes(1);

      // Access before stale time
      vi.advanceTimersByTime(3000);
      const ref2 = getItem("1");
      await ref2.value;
      ref2.unref();

      expect(factory).toHaveBeenCalledTimes(1);

      // Access after stale time - marks stale
      vi.advanceTimersByTime(3000);
      const ref3 = getItem("1");
      await ref3.value;
      ref3.unref();

      // Entry is now stale, next access triggers refetch
      const ref4 = getItem("1");
      await ref4.value;
      ref4.unref();

      expect(factory).toHaveBeenCalledTimes(2);
    });

    it("should mark entry stale on error", async () => {
      let shouldFail = true;
      const factory = vi.fn(async (id: string) => {
        if (shouldFail) throw new Error("Fetch failed");
        return { id };
      });

      const getItem = cache("items", factory, {
        use: [staleOn({ error: true })],
      });

      // First access fails
      const ref1 = getItem("1");
      await expect(ref1.value).rejects.toThrow("Fetch failed");
      ref1.unref();

      expect(factory).toHaveBeenCalledTimes(1);

      // Entry is marked stale due to error
      // Next access triggers refetch
      shouldFail = false;
      const ref2 = getItem("1");
      await ref2.value;
      ref2.unref();

      expect(factory).toHaveBeenCalledTimes(2);
    });

    it("should mark entry stale after idle time", async () => {
      const factory = vi.fn(async (id: string) => ({ id }));
      const getItem = cache("items", factory, {
        use: [staleOn({ idle: 5000 })],
      });

      // Access and release
      const ref1 = getItem("1");
      await ref1.value;
      ref1.unref();

      expect(factory).toHaveBeenCalledTimes(1);

      // Wait for idle time
      vi.advanceTimersByTime(6000);

      // Access again - entry is stale
      const ref2 = getItem("1");
      await ref2.value;
      ref2.unref();

      // Entry marked stale, next access refetches
      const ref3 = getItem("1");
      await ref3.value;
      ref3.unref();

      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  describe("evictOn", () => {
    it("should remove entry after specified time", async () => {
      const factory = vi.fn(async (id: string) => ({ id }));
      const getItem = cache("items", factory, {
        use: [evictOn({ after: 5000 })],
      });

      // Add entry
      const ref1 = getItem("1");
      await ref1.value;
      ref1.unref();

      expect(getItem.has("1")).toBe(true);

      // Add another entry to trigger cleanup
      const ref2 = getItem("2");
      await ref2.value;
      ref2.unref();

      // Wait for expire time
      vi.advanceTimersByTime(6000);

      // Access entry 2 - triggers lazy cleanup of entry 1
      const ref3 = getItem("2");
      await ref3.value;
      ref3.unref();

      expect(getItem.has("1")).toBe(false);
    });

    it("should remove entry immediately when idle=0", async () => {
      const factory = vi.fn(async (id: string) => ({ id }));
      const getItem = cache("items", factory, {
        use: [evictOn({ idle: 0 })],
      });

      // Access and release
      const ref1 = getItem("1");
      await ref1.value;

      expect(getItem.has("1")).toBe(true);

      ref1.unref();

      // Should be removed immediately
      expect(getItem.has("1")).toBe(false);
    });

    it("should remove entry on error", async () => {
      const factory = vi.fn(async (id: string) => {
        throw new Error("Fetch failed");
      });

      const getItem = cache("items", factory, {
        use: [evictOn({ error: true })],
      });

      // Access - triggers error
      const ref1 = getItem("1");
      await expect(ref1.value).rejects.toThrow("Fetch failed");
      ref1.unref();

      // Entry should be removed due to error
      expect(getItem.has("1")).toBe(false);
    });

    it("should remove entry after idle time", async () => {
      const factory = vi.fn(async (id: string) => ({ id }));
      const getItem = cache("items", factory, {
        use: [evictOn({ idle: 5000 })],
      });

      // Access and release
      const ref1 = getItem("1");
      await ref1.value;
      ref1.unref();

      // Add another entry
      const ref2 = getItem("2");
      await ref2.value;
      ref2.unref();

      // Wait for idle time
      vi.advanceTimersByTime(6000);

      // Access entry 2 - triggers cleanup
      const ref3 = getItem("2");
      await ref3.value;
      ref3.unref();

      expect(getItem.has("1")).toBe(false);
    });

    it("should not remove entry if still referenced", async () => {
      const factory = vi.fn(async (id: string) => ({ id }));
      const getItem = cache("items", factory, {
        use: [evictOn({ idle: 5000 })],
      });

      // Access - keep reference
      const ref1 = getItem("1");
      await ref1.value;
      // Don't unref

      // Add another entry
      const ref2 = getItem("2");
      await ref2.value;
      ref2.unref();

      // Wait for idle time
      vi.advanceTimersByTime(6000);

      // Access entry 2 - triggers cleanup
      const ref3 = getItem("2");
      await ref3.value;
      ref3.unref();

      // Entry 1 should still exist (has refs)
      expect(getItem.has("1")).toBe(true);

      ref1.unref();
    });

    it("should handle combined conditions (OR)", async () => {
      let shouldFail = false;
      const factory = vi.fn(async (id: string) => {
        if (shouldFail) throw new Error("Fetch failed");
        return { id };
      });

      const getItem = cache("items", factory, {
        use: [evictOn({ idle: 5000, error: true })],
      });

      // Access successful entry
      const ref1 = getItem("1");
      await ref1.value;
      ref1.unref();

      expect(getItem.has("1")).toBe(true);

      // Entry with error is removed immediately
      shouldFail = true;
      const ref2 = getItem("2");
      await expect(ref2.value).rejects.toThrow();
      ref2.unref();

      expect(getItem.has("2")).toBe(false);

      // Entry 1 still exists (not idle yet, no error)
      expect(getItem.has("1")).toBe(true);

      // Wait for idle time
      vi.advanceTimersByTime(6000);

      // Need to trigger cleanup
      shouldFail = false;
      const ref3 = getItem("3");
      await ref3.value;
      ref3.unref();

      // Entry 1 should now be removed (idle)
      expect(getItem.has("1")).toBe(false);
    });
  });

  describe("staleOn + evictOn combined", () => {
    it("should mark stale on error and evict when idle", async () => {
      let shouldFail = true;
      const factory = vi.fn(async (id: string) => {
        if (shouldFail) throw new Error("Fetch failed");
        return { id };
      });

      const getItem = cache("items", factory, {
        use: [staleOn({ error: true }), evictOn({ idle: 0 })],
      });

      // First access fails
      const ref1 = getItem("1");
      await expect(ref1.value).rejects.toThrow("Fetch failed");
      // Keep ref for now

      expect(factory).toHaveBeenCalledTimes(1);

      // Entry is stale (error), still exists (has ref)
      expect(getItem.has("1")).toBe(true);

      // Release - entry is evicted (idle=0)
      ref1.unref();
      expect(getItem.has("1")).toBe(false);

      // Next access triggers fresh fetch
      shouldFail = false;
      const ref2 = getItem("1");
      const result = await ref2.value;
      ref2.unref();

      expect(result).toEqual({ id: "1" });
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });
});
