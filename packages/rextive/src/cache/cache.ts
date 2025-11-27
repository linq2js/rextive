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

/**
 * Internal cache entry with mutable state
 */
interface InternalEntry<T, K> extends CacheEntry<T, K> {
  value: T;
  promise: Promise<T>;
  refCount: number;
  createdAt: number;
  accessedAt: number;
  isStale: boolean;
  isFetching: boolean;
}

/**
 * Create a cache entry
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
  };
}

/**
 * Create a single cache instance
 */
function createCache<T, K>(
  name: string,
  factory: (key: K) => Promise<T>,
  options: CacheOptions<T, K> = {}
): Cache<T, K> {
  // Use custom stringify if provided, otherwise use stableStringify
  const entries = new ObjectKeyedMap<K, InternalEntry<T, K>>({
    stringify: options.stringify,
  });
  const strategyHooks: CacheStrategyHooks<T, K>[] = [];
  let disposed = false;

  // Create the API for strategies
  const api: CacheApi<T, K> = {
    name,

    set(key: K, value: T) {
      let entry = entries.get(key);

      if (!entry) {
        entry = createEntry(key, Promise.resolve(value), false);
        entries.set(key, entry);
      }

      entry.value = value;
      entry.promise = Promise.resolve(value);
      entry.isFetching = false;
      entry.isStale = false;

      // Notify strategies
      for (const hooks of strategyHooks) {
        hooks.onSet?.(key, value, entry);
      }
    },

    get(key: K) {
      return entries.get(key);
    },

    has(key: K) {
      return entries.has(key);
    },

    delete(key: K) {
      const entry = entries.get(key);
      if (entry) {
        entries.delete(key);
        // Notify strategies
        for (const hooks of strategyHooks) {
          hooks.onDelete?.(key, entry);
        }
        return true;
      }
      return false;
    },

    clear() {
      entries.clear();
      // Notify strategies
      for (const hooks of strategyHooks) {
        hooks.onClear?.();
      }
    },

    stale(key: K) {
      const entry = entries.get(key);
      if (entry) {
        entry.isStale = true;
        // Notify strategies
        for (const hooks of strategyHooks) {
          hooks.onStale?.(entry);
        }
      }
    },

    get size() {
      return entries.size;
    },

    forEach(fn) {
      for (const [key, entry] of entries) {
        fn(entry, key);
      }
    },

    *[Symbol.iterator]() {
      for (const [key, entry] of entries) {
        yield [key, entry] as [K, InternalEntry<T, K>];
      }
    },

    keys() {
      return entries.keys();
    },

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

  // Initialize strategies
  const strategies = options.use ?? [];
  for (const strategy of strategies) {
    const hooks = strategy(api);
    if (hooks) {
      strategyHooks.push(hooks);
    }
  }

  // Call onInit for all strategies
  for (const hooks of strategyHooks) {
    hooks.onInit?.();
  }

  /**
   * Fetch or get cached value
   */
  function fetchOrGet(key: K): InternalEntry<T, K> {
    let entry = entries.get(key);

    // If entry exists and not stale, return it
    if (entry && !entry.isStale) {
      entry.accessedAt = Date.now();
      return entry;
    }

    // If entry is stale, trigger background re-fetch
    if (entry?.isStale && !entry.isFetching) {
      entry.isFetching = true;
      entry.isStale = false;

      const promise = factory(key);

      // Notify strategies about fetch
      for (const hooks of strategyHooks) {
        hooks.onFetch?.(entry);
      }

      promise
        .then((value) => {
          if (!disposed && entries.has(key)) {
            entry!.value = value;
            entry!.promise = Promise.resolve(value);
            entry!.isFetching = false;

            // Notify strategies
            for (const hooks of strategyHooks) {
              hooks.onSet?.(key, value, entry!);
            }
          }
        })
        .catch(() => {
          if (entry) {
            entry.isFetching = false;
          }
        });

      entry.accessedAt = Date.now();
      return entry;
    }

    // Create new entry
    const promise = factory(key);
    entry = createEntry(key, promise, true);
    entries.set(key, entry);

    // Notify strategies about fetch
    for (const hooks of strategyHooks) {
      hooks.onFetch?.(entry);
    }

    // When promise resolves, update entry
    promise
      .then((value) => {
        if (!disposed && entries.has(key)) {
          entry!.value = value;
          entry!.isFetching = false;

          // Notify strategies
          for (const hooks of strategyHooks) {
            hooks.onSet?.(key, value, entry!);
          }
        }
      })
      .catch(() => {
        if (entry) {
          entry.isFetching = false;
        }
      });

    return entry;
  }

  /**
   * The cache function
   */
  const cacheInstance = ((key: K): CacheAccessResult<T> => {
    if (disposed) {
      throw new Error(`Cache "${name}" has been disposed`);
    }

    const entry = fetchOrGet(key);
    entry.refCount++;
    entry.accessedAt = Date.now();

    // Notify strategies about access
    for (const hooks of strategyHooks) {
      hooks.onAccess?.(entry);
    }

    let released = false;

    return {
      value: entry.promise,
      unref() {
        if (released) return;
        released = true;

        entry.refCount = Math.max(0, entry.refCount - 1);

        // Notify strategies about release
        for (const hooks of strategyHooks) {
          hooks.onRelease?.(entry);
        }
      },
    };
  }) as Cache<T, K>;

  // Add properties and methods to the cache instance
  Object.defineProperties(cacheInstance, {
    name: { value: name, enumerable: true },
    size: {
      get: () => entries.size,
      enumerable: true,
    },
  });

  cacheInstance.stale = (key: K) => {
    api.stale(key);
  };

  cacheInstance.staleAll = () => {
    for (const [, entry] of entries) {
      entry.isStale = true;
      for (const hooks of strategyHooks) {
        hooks.onStale?.(entry);
      }
    }
  };

  cacheInstance.refresh = async (key: K): Promise<T> => {
    const entry = entries.get(key);

    if (entry) {
      entry.isStale = true;
      entry.isFetching = true;

      const promise = factory(key);
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

  cacheInstance.refreshAll = async (): Promise<T[]> => {
    const promises: Promise<T>[] = [];
    for (const [, entry] of entries) {
      promises.push(cacheInstance.refresh(entry.key));
    }
    return Promise.all(promises);
  };

  cacheInstance.delete = (key: K): boolean => {
    return api.delete(key);
  };

  cacheInstance.clear = () => {
    api.clear();
  };

  cacheInstance.has = (key: K): boolean => {
    return api.has(key);
  };

  cacheInstance.peek = (key: K): T | undefined => {
    const entry = api.get(key);
    return entry?.value;
  };

  cacheInstance.prefetch = async (key: K): Promise<T> => {
    const entry = fetchOrGet(key);
    return entry.promise;
  };

  cacheInstance.extract = (): Record<string, T> => {
    return api.extract();
  };

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

/**
 * Create a cache group containing multiple related caches
 */
function createCacheGroup<TFactoryMap extends CacheFactoryMap>(
  name: string,
  factoryMap: TFactoryMap,
  options: CacheOptions = {}
): CacheGroup<TFactoryMap> {
  const caches = new Map<string, Cache<unknown, unknown>>();

  // Create individual caches
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

    staleAll() {
      for (const cache of caches.values()) {
        cache.staleAll();
      }
    },

    clearAll() {
      for (const cache of caches.values()) {
        cache.clear();
      }
    },

    async refreshAll() {
      const promises: Promise<unknown[]>[] = [];
      for (const cache of caches.values()) {
        promises.push(cache.refreshAll());
      }
      await Promise.all(promises);
    },

    extract() {
      const data: Record<string, Record<string, unknown>> = {};
      for (const [factoryName, cache] of caches) {
        data[factoryName] = cache.extract();
      }
      return data as {
        [Name in keyof TFactoryMap]: Record<string, unknown>;
      };
    },

    dispose() {
      for (const cache of caches.values()) {
        cache.dispose();
      }
      caches.clear();
    },
  } as CacheGroup<TFactoryMap>;

  // Add individual cache accessors
  for (const [factoryName, cache] of caches) {
    (group as any)[factoryName] = cache;
  }

  return group;
}

/**
 * Cache factory with overloads for single cache and cache group
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
