import {
  Cache,
  CacheAccessResult,
  CacheApi,
  CacheEntry,
  CacheFactoryMap,
  CacheGroup,
  CacheOptions,
  CacheStrategyHooks,
} from "./types";
import { ObjectKeyedMap, stableStringify } from "./objectKeyedMap";
import { promiseTry } from "../utils/promiseTry";

/**
 * Internal cache entry with mutable state.
 * Extends the public CacheEntry interface with internal implementation details.
 */
interface InternalEntry<T, K> extends CacheEntry<T, K> {
  /** The resolved value (may be undefined if still loading) */
  value: T;
  /** The promise that resolves to the value */
  promise: Promise<T>;
  /** Number of active consumers holding references to this entry */
  refCount: number;
  /** Timestamp when entry was first created */
  createdAt: number;
  /** Timestamp when entry was last accessed */
  accessedAt: number;
  /** Whether entry is stale and needs re-fetch on next access */
  isStale: boolean;
  /** Whether a fetch is currently in progress */
  isFetching: boolean;
}

/**
 * Create a new cache entry with initial state.
 *
 * @param key - The cache key
 * @param promise - The promise that will resolve to the cached value
 * @param isFetching - Whether the entry is currently fetching (default: true)
 * @returns A new internal entry object
 */
function createEntry<T, K>(
  key: K,
  promise: Promise<T>,
  isFetching: boolean = true
): InternalEntry<T, K> {
  const now = Date.now();
  return {
    key,
    value: undefined as T,
    promise,
    refCount: 0,
    createdAt: now,
    accessedAt: now,
    isStale: false,
    isFetching,
    isError: false,
    error: undefined,
  };
}

/**
 * Create a single cache instance for storing and managing cached data.
 *
 * The cache provides:
 * - Automatic deduplication of concurrent requests for the same key
 * - Reference counting to track active consumers
 * - Stale-while-revalidate pattern support
 * - Pluggable strategies for TTL, LRU, hydration, etc.
 *
 * @param name - Unique name for the cache (used for debugging and error messages)
 * @param factory - Function that fetches data for a given key
 * @param options - Configuration options including strategies
 * @returns A cache instance
 */
function createCache<T, K>(
  name: string,
  factory: (key: K) => Promise<T>,
  options: CacheOptions<T, K> = {}
): Cache<T, K> {
  // Use ObjectKeyedMap for efficient object key handling
  // Supports custom stringify function for key serialization
  const entries = new ObjectKeyedMap<K, InternalEntry<T, K>>({
    stringify: options.stringify,
  });

  // Collect hooks from all registered strategies
  const strategyHooks: CacheStrategyHooks<T, K>[] = [];

  // Track disposal state to prevent operations after dispose
  let disposed = false;

  // ============================================
  // Strategy API
  // ============================================
  // This API is exposed to strategies for cache manipulation.
  // Strategies use this to implement custom caching behaviors
  // like TTL expiration, LRU eviction, SSR hydration, etc.

  const api: CacheApi<T, K> = {
    name,

    /**
     * Set a value directly in the cache.
     * Used by strategies like hydrate() to inject initial data.
     */
    set(key: K, value: T) {
      let entry = entries.get(key);

      if (!entry) {
        // Create new entry with resolved promise (not fetching)
        entry = createEntry(key, Promise.resolve(value), false);
        entries.set(key, entry);
      }

      // Update entry with new value
      entry.value = value;
      entry.promise = Promise.resolve(value);
      entry.isFetching = false;
      entry.isStale = false;

      // Notify strategies about the set operation
      for (const hooks of strategyHooks) {
        hooks.onSet?.(key, value, entry);
      }
    },

    /**
     * Get an entry by key without creating or modifying it.
     */
    get(key: K) {
      return entries.get(key);
    },

    /**
     * Check if a key exists in the cache.
     */
    has(key: K) {
      return entries.has(key);
    },

    /**
     * Delete an entry from the cache.
     * Notifies strategies via onDelete hook.
     */
    delete(key: K) {
      const entry = entries.get(key);
      if (entry) {
        entries.delete(key);
        // Notify strategies about deletion
        for (const hooks of strategyHooks) {
          hooks.onDelete?.(key, entry);
        }
        return true;
      }
      return false;
    },

    /**
     * Clear all entries from the cache.
     * Notifies strategies via onClear hook.
     */
    clear() {
      entries.clear();
      // Notify strategies about clear
      for (const hooks of strategyHooks) {
        hooks.onClear?.();
      }
    },

    /**
     * Mark an entry as stale.
     * Stale entries return cached data immediately but trigger background re-fetch.
     */
    stale(key: K) {
      const entry = entries.get(key);
      if (entry) {
        entry.isStale = true;
        // Notify strategies about stale marking
        for (const hooks of strategyHooks) {
          hooks.onStale?.(entry);
        }
      }
    },

    /**
     * Get the number of entries in the cache.
     */
    get size() {
      return entries.size;
    },

    /**
     * Iterate over all entries.
     */
    forEach(fn) {
      for (const [key, entry] of entries) {
        fn(entry, key);
      }
    },

    /**
     * Iterator for for...of loops - yields [key, entry] pairs.
     */
    *[Symbol.iterator]() {
      for (const [key, entry] of entries) {
        yield [key, entry] as [K, InternalEntry<T, K>];
      }
    },

    /**
     * Get all keys in the cache.
     */
    keys() {
      return entries.keys();
    },

    /**
     * Extract all data from the cache.
     * Used for SSR serialization.
     */
    extract() {
      const data: Record<string, T> = {};
      for (const [key, entry] of entries) {
        if (entry.value !== undefined) {
          // Use stableStringify for consistent key serialization in extract
          const serializedKey =
            typeof key === "string"
              ? key
              : options.stringify
              ? options.stringify(key)
              : stableStringify(key);
          data[serializedKey] = entry.value;
        }
      }
      return data;
    },
  };

  // ============================================
  // Strategy Initialization
  // ============================================

  // Initialize strategies and collect their hooks
  const strategies = options.use ?? [];
  for (const strategy of strategies) {
    const hooks = strategy(api);
    if (hooks) {
      strategyHooks.push(hooks);
    }
  }

  // Call onInit for all strategies (e.g., hydrate loads initial data here)
  for (const hooks of strategyHooks) {
    hooks.onInit?.();
  }

  // ============================================
  // Core Fetch Logic
  // ============================================

  /**
   * Fetch or get cached value.
   *
   * This is the core logic that handles:
   * 1. Fresh entries - return immediately
   * 2. Stale entries - trigger background re-fetch, return cached data
   * 3. Missing entries - create new entry and fetch
   *
   * For stale error entries, the promise is updated immediately so consumers
   * get the fresh result (not the old rejected promise).
   */
  function fetchOrGet(key: K): InternalEntry<T, K> {
    let entry = entries.get(key);

    // CASE 1: Fresh entry exists - return it immediately
    if (entry && !entry.isStale) {
      entry.accessedAt = Date.now();
      return entry;
    }

    // CASE 2: Stale entry - trigger background re-fetch
    if (entry?.isStale && !entry.isFetching) {
      entry.isFetching = true;
      entry.isStale = false;

      const promise = promiseTry(() => factory(key));

      // Notify strategies about fetch start
      for (const hooks of strategyHooks) {
        hooks.onFetch?.(entry);
      }

      // IMPORTANT: For error entries, update promise immediately
      // This ensures consumers get the fresh result, not the old rejected promise.
      // For success entries, keep old promise (SWR pattern - return stale data while revalidating)
      if (entry.isError) {
        entry.promise = promise;
        entry.isError = false;
        entry.error = undefined;
      }

      // Handle promise resolution
      promise
        .then((value) => {
          if (!disposed && entries.has(key)) {
            entry!.value = value;
            entry!.promise = Promise.resolve(value);
            entry!.isFetching = false;
            entry!.isError = false;
            entry!.error = undefined;

            // Notify strategies about successful fetch
            for (const hooks of strategyHooks) {
              hooks.onSet?.(key, value, entry!);
            }
          }
        })
        .catch((error) => {
          if (entry && !disposed && entries.has(key)) {
            entry.isFetching = false;
            entry.isError = true;
            entry.error = error;

            // Notify strategies about error
            // Strategies like staleOn({ error: true }) can mark entry stale here
            for (const hooks of strategyHooks) {
              hooks.onError?.(error, entry);
            }
          }
        });

      entry.accessedAt = Date.now();
      return entry;
    }

    // CASE 3: No entry - create new one and fetch
    const promise = promiseTry(() => factory(key));
    entry = createEntry(key, promise, true);
    entries.set(key, entry);

    // Notify strategies about fetch start
    for (const hooks of strategyHooks) {
      hooks.onFetch?.(entry);
    }

    // Handle promise resolution
    promise
      .then((value) => {
        if (!disposed && entries.has(key)) {
          entry!.value = value;
          entry!.isFetching = false;
          entry!.isError = false;
          entry!.error = undefined;

          // Notify strategies about successful fetch
          for (const hooks of strategyHooks) {
            hooks.onSet?.(key, value, entry!);
          }
        }
      })
      .catch((error) => {
        if (entry && !disposed && entries.has(key)) {
          entry.isFetching = false;
          entry.isError = true;
          entry.error = error;

          // Notify strategies about error
          for (const hooks of strategyHooks) {
            hooks.onError?.(error, entry);
          }
        }
      });

    return entry;
  }

  // ============================================
  // Cache Instance
  // ============================================

  /**
   * The cache function - main entry point for accessing cached data.
   *
   * Usage:
   * ```ts
   * const { value, unref } = cache("key");
   * const data = await value;
   * // ... use data ...
   * unref(); // Release reference when done
   * ```
   */
  const cacheInstance = ((key: K): CacheAccessResult<T> => {
    if (disposed) {
      throw new Error(`Cache "${name}" has been disposed`);
    }

    // Get or create entry
    const entry = fetchOrGet(key);

    // Increment reference count
    entry.refCount++;
    entry.accessedAt = Date.now();

    // Notify strategies about access (e.g., for staleOn time-based checks)
    for (const hooks of strategyHooks) {
      hooks.onAccess?.(entry);
    }

    // Track if this reference has been released
    let released = false;

    return {
      /** The cached value as a promise */
      value: entry.promise,

      /**
       * Release this reference.
       * When all references are released (refCount=0), strategies like
       * evictOn({ idle: 0 }) may delete the entry.
       */
      unref() {
        if (released) return;
        released = true;

        entry.refCount = Math.max(0, entry.refCount - 1);

        // Notify strategies about release (e.g., for evictOn idle tracking)
        for (const hooks of strategyHooks) {
          hooks.onRelease?.(entry);
        }
      },
    };
  }) as Cache<T, K>;

  // ============================================
  // Cache Instance Properties & Methods
  // ============================================

  // Add read-only properties
  Object.defineProperties(cacheInstance, {
    name: { value: name, enumerable: true },
    size: {
      get: () => entries.size,
      enumerable: true,
    },
  });

  /**
   * Mark a specific entry as stale.
   * Next access will trigger background re-fetch.
   */
  cacheInstance.stale = (key: K) => {
    api.stale(key);
  };

  /**
   * Mark all entries as stale.
   * Useful for invalidating entire cache after mutations.
   */
  cacheInstance.staleAll = () => {
    for (const [, entry] of entries) {
      entry.isStale = true;
      for (const hooks of strategyHooks) {
        hooks.onStale?.(entry);
      }
    }
  };

  /**
   * Force immediate re-fetch for a specific key.
   * Unlike stale(), this returns the new value immediately.
   */
  cacheInstance.refresh = async (key: K): Promise<T> => {
    const entry = entries.get(key);

    if (entry) {
      entry.isStale = true;
      entry.isFetching = true;

      const promise = promiseTry(() => factory(key));
      entry.promise = promise;

      // Notify strategies about fetch
      for (const hooks of strategyHooks) {
        hooks.onFetch?.(entry);
      }

      try {
        const value = await promise;
        entry.value = value;
        entry.isFetching = false;
        entry.isStale = false;

        // Notify strategies
        for (const hooks of strategyHooks) {
          hooks.onSet?.(key, value, entry);
        }

        return value;
      } catch (error) {
        entry.isFetching = false;
        throw error;
      }
    }

    // No existing entry, create one
    const result = fetchOrGet(key);
    return result.promise;
  };

  /**
   * Refresh all entries in the cache.
   * Returns array of all refreshed values.
   */
  cacheInstance.refreshAll = async (): Promise<T[]> => {
    const promises: Promise<T>[] = [];
    for (const [, entry] of entries) {
      promises.push(cacheInstance.refresh(entry.key));
    }
    return Promise.all(promises);
  };

  /**
   * Delete a specific entry from the cache.
   */
  cacheInstance.delete = (key: K): boolean => {
    return api.delete(key);
  };

  /**
   * Clear all entries from the cache.
   */
  cacheInstance.clear = () => {
    api.clear();
  };

  /**
   * Check if a key exists in the cache.
   */
  cacheInstance.has = (key: K): boolean => {
    return api.has(key);
  };

  /**
   * Get value without creating entry or incrementing refCount.
   * Returns undefined if key doesn't exist or value hasn't resolved.
   */
  cacheInstance.peek = (key: K): T | undefined => {
    const entry = api.get(key);
    return entry?.value;
  };

  /**
   * Prefetch a key without holding a reference.
   * Useful for SSR warming or preloading data.
   */
  cacheInstance.prefetch = async (key: K): Promise<T> => {
    const entry = fetchOrGet(key);
    return entry.promise;
  };

  /**
   * Extract all cached data for SSR serialization.
   */
  cacheInstance.extract = (): Record<string, T> => {
    return api.extract();
  };

  /**
   * Dispose the cache and release all resources.
   * After disposal, accessing the cache will throw an error.
   */
  cacheInstance.dispose = () => {
    if (disposed) return;
    disposed = true;

    // Notify strategies about dispose
    for (const hooks of strategyHooks) {
      hooks.onDispose?.();
    }

    entries.clear();
  };

  return cacheInstance;
}

// ============================================
// Cache Group
// ============================================

/**
 * Create a cache group containing multiple related caches.
 *
 * Cache groups provide:
 * - Organized related caches under a single namespace
 * - Bulk operations (staleAll, clearAll, refreshAll)
 * - SSR extraction for all caches at once
 *
 * @param name - Group name (individual caches are named "group.cacheName")
 * @param factoryMap - Map of factory names to factory functions
 * @param options - Shared configuration options for all caches
 * @returns A cache group with individual caches as properties
 */
function createCacheGroup<TFactoryMap extends CacheFactoryMap>(
  name: string,
  factoryMap: TFactoryMap,
  options: CacheOptions = {}
): CacheGroup<TFactoryMap> {
  const caches = new Map<string, Cache<unknown, unknown>>();

  // Create individual caches for each factory
  for (const [factoryName, factory] of Object.entries(factoryMap)) {
    const cache = createCache(
      `${name}.${factoryName}`,
      factory as (key: unknown) => Promise<unknown>,
      options as CacheOptions<unknown, unknown>
    );
    caches.set(factoryName, cache);
  }

  const group = {
    name,

    /**
     * Mark all entries in all caches as stale.
     */
    staleAll() {
      for (const cache of caches.values()) {
        cache.staleAll();
      }
    },

    /**
     * Clear all entries in all caches.
     */
    clearAll() {
      for (const cache of caches.values()) {
        cache.clear();
      }
    },

    /**
     * Refresh all entries in all caches.
     */
    async refreshAll() {
      const promises: Promise<unknown[]>[] = [];
      for (const cache of caches.values()) {
        promises.push(cache.refreshAll());
      }
      await Promise.all(promises);
    },

    /**
     * Extract all data from all caches for SSR.
     */
    extract() {
      const data: Record<string, Record<string, unknown>> = {};
      for (const [factoryName, cache] of caches) {
        data[factoryName] = cache.extract();
      }
      return data as {
        [Name in keyof TFactoryMap]: Record<string, unknown>;
      };
    },

    /**
     * Dispose all caches in the group.
     */
    dispose() {
      for (const cache of caches.values()) {
        cache.dispose();
      }
      caches.clear();
    },
  } as CacheGroup<TFactoryMap>;

  // Add individual cache accessors as properties
  for (const [factoryName, cache] of caches) {
    (group as any)[factoryName] = cache;
  }

  return group;
}

// ============================================
// Public API
// ============================================

/**
 * Create a cache for storing and managing async data.
 *
 * @example Single cache
 * ```ts
 * const getUser = cache("users", (id: string) => fetch(`/api/users/${id}`));
 *
 * // Access cached data
 * const { value, unref } = getUser("123");
 * const user = await value;
 * // ... use user ...
 * unref(); // Release reference when done
 * ```
 *
 * @example Cache with strategies
 * ```ts
 * const getUser = cache("users", fetchUser, {
 *   use: [
 *     staleOn({ after: 30000 }),  // Mark stale after 30s
 *     evictOn({ idle: 60000 }),   // Remove if unused for 1min
 *     lru({ maxSize: 100 }),      // Keep max 100 entries
 *   ],
 * });
 * ```
 *
 * @example Cache group
 * ```ts
 * const api = cache("api", {
 *   users: (id: string) => fetch(`/api/users/${id}`),
 *   posts: (userId: string) => fetch(`/api/users/${userId}/posts`),
 * });
 *
 * const { value: user, unref } = api.users("123");
 * ```
 */
export function cache<T, K = unknown>(
  name: string,
  factory: (key: K) => Promise<T>,
  options?: CacheOptions<T, K>
): Cache<T, K>;

export function cache<TFactoryMap extends CacheFactoryMap>(
  name: string,
  factoryMap: TFactoryMap,
  options?: CacheOptions
): CacheGroup<TFactoryMap>;

export function cache(
  name: string,
  factoryOrMap: ((key: unknown) => Promise<unknown>) | CacheFactoryMap,
  options: CacheOptions = {}
): Cache<unknown, unknown> | CacheGroup<CacheFactoryMap> {
  // Check if it's a factory function or a factory map
  if (typeof factoryOrMap === "function") {
    return createCache(name, factoryOrMap, options);
  }

  return createCacheGroup(name, factoryOrMap, options);
}
