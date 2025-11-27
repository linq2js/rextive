import { CacheStrategy, CacheStrategyHooks } from "./types";

/**
 * Options for LRU (least recently used) strategy
 */
export interface LruOptions {
  /**
   * Maximum number of entries in the cache.
   * When exceeded, least recently used entries are evicted.
   */
  maxSize: number;
}

/**
 * LRU (Least Recently Used) strategy
 *
 * Evicts the least recently accessed entries when the cache
 * exceeds the maximum size. Prefers evicting entries with refCount=0.
 *
 * @example
 * ```ts
 * const getUser = cache("users", fetchUser, {
 *   use: [lru({ maxSize: 100 })],
 * });
 * ```
 */
export function lru(options: LruOptions): CacheStrategy {
  return (api): CacheStrategyHooks => {
    const evictLRU = () => {
      if (api.size <= options.maxSize) return;

      // Find entries to evict (those with 0 refCount first, then oldest)
      const entries: Array<{
        key: unknown;
        accessedAt: number;
        refCount: number;
      }> = [];

      for (const [key, entry] of api) {
        entries.push({
          key,
          accessedAt: entry.accessedAt,
          refCount: entry.refCount,
        });
      }

      // Sort: zero refCount first, then by accessedAt (oldest first)
      entries.sort((a, b) => {
        if (a.refCount === 0 && b.refCount !== 0) return -1;
        if (a.refCount !== 0 && b.refCount === 0) return 1;
        return a.accessedAt - b.accessedAt;
      });

      // Evict until we're under maxSize
      const toEvict = api.size - options.maxSize;
      for (let i = 0; i < toEvict && i < entries.length; i++) {
        api.delete(entries[i].key);
      }
    };

    return {
      onSet() {
        evictLRU();
      },

      onFetch() {
        evictLRU();
      },
    };
  };
}

/**
 * Options for SSR hydration strategy
 */
export interface HydrateOptions<T = unknown> {
  /**
   * Function that returns the hydration data.
   * Called once during cache initialization.
   */
  source: () => Record<string, T> | undefined;

  /**
   * Whether hydrated data should be marked as stale.
   * If true, accessing hydrated data will trigger a background refresh.
   * Default: false
   */
  stale?: boolean;
}

/**
 * SSR hydration strategy
 *
 * Loads initial cache data from a source (e.g., window.__CACHE_STATE__)
 * during cache initialization.
 *
 * @example
 * ```ts
 * const getUser = cache("users", fetchUser, {
 *   use: [
 *     hydrate({
 *       source: () => window.__CACHE_STATE__?.users,
 *       stale: true, // Re-validate after hydration
 *     }),
 *   ],
 * });
 * ```
 */
export function hydrate<T = unknown>(
  options: HydrateOptions<T>
): CacheStrategy {
  return (api): CacheStrategyHooks => {
    return {
      onInit() {
        const data = options.source();
        if (!data) return;

        for (const [key, value] of Object.entries(data)) {
          api.set(key as never, value as never);
          if (options.stale) {
            api.stale(key as never);
          }
        }
      },
    };
  };
}

/**
 * Conditions for staleOn strategy.
 * Multiple conditions are OR'd together.
 */
export interface StaleOnConditions {
  /**
   * Mark stale after X ms from creation.
   */
  after?: number;

  /**
   * Mark stale after X ms of being unused (refCount=0).
   */
  idle?: number;

  /**
   * Mark stale when entry has an error (promise rejected).
   * This enables automatic retry on next access.
   */
  error?: boolean;
}

/**
 * Conditions for evictOn strategy.
 * Multiple conditions are OR'd together.
 */
export interface EvictOnConditions {
  /**
   * Remove after X ms from creation.
   */
  after?: number;

  /**
   * Remove after X ms of being unused (refCount=0).
   * Set to 0 for immediate removal when refCount reaches 0.
   */
  idle?: number;

  /**
   * Remove when entry has an error (promise rejected).
   */
  error?: boolean;

  /**
   * Remove when entry is marked as stale.
   */
  stale?: boolean;
}

/**
 * Mark entries as stale based on conditions.
 *
 * Stale entries return cached data immediately but trigger a background re-fetch.
 * For error entries, the new fetch promise replaces the old rejected promise.
 * Multiple conditions are OR'd together (any condition triggers stale).
 *
 * @example
 * ```ts
 * // Mark stale after 30 seconds (like swr({ staleTime: 30000 }))
 * staleOn({ after: 30000 })
 *
 * // Mark errors as stale (enables auto-retry on next access)
 * staleOn({ error: true })
 *
 * // Combined: stale after 30s OR on error
 * staleOn({ after: 30000, error: true })
 * ```
 */
export function staleOn(conditions: StaleOnConditions): CacheStrategy {
  return (): CacheStrategyHooks => {
    // Track when entries were released (refCount → 0)
    const releasedAt = new Map<unknown, number>();

    return {
      onAccess(entry) {
        // Skip if already stale or fetching
        if (entry.isStale || entry.isFetching) {
          releasedAt.delete(entry.key);
          return;
        }

        // Check after condition (time from creation)
        if (conditions.after) {
          const age = Date.now() - entry.createdAt;
          if (age > conditions.after) {
            entry.isStale = true;
            releasedAt.delete(entry.key);
            return;
          }
        }

        // Check idle condition (time since refCount=0)
        if (conditions.idle) {
          const released = releasedAt.get(entry.key);
          if (released && Date.now() - released > conditions.idle) {
            entry.isStale = true;
            releasedAt.delete(entry.key);
            return;
          }
        }

        // Clear released timestamp after all checks
        releasedAt.delete(entry.key);
      },

      onRelease(entry) {
        if (entry.refCount === 0) {
          releasedAt.set(entry.key, Date.now());
        }
      },

      onError(_error, entry) {
        // Mark stale on error (enables retry on next access)
        if (conditions.error && !entry.isStale) {
          entry.isStale = true;
        }
      },

      onDelete(key) {
        releasedAt.delete(key);
      },

      onClear() {
        releasedAt.clear();
      },

      onDispose() {
        releasedAt.clear();
      },
    };
  };
}

/**
 * Remove entries based on conditions.
 *
 * Multiple conditions are OR'd together (any condition triggers removal).
 * Uses lazy cleanup (checked on access) by default.
 *
 * @example
 * ```ts
 * // Remove immediately when refCount=0 (like ttl({ idle: 0 }))
 * evictOn({ idle: 0 })
 *
 * // Remove after 5 minutes (like ttl({ expire: 300000 }))
 * evictOn({ after: 300000 })
 *
 * // Remove errors immediately
 * evictOn({ error: true })
 *
 * // Combined: remove if idle for 1 min OR has error
 * evictOn({ idle: 60000, error: true })
 * ```
 */
export function evictOn(conditions: EvictOnConditions): CacheStrategy {
  return (api): CacheStrategyHooks => {
    // Track when entries were released (refCount → 0)
    const releasedAt = new Map<unknown, number>();

    /**
     * Check if an entry should be evicted
     */
    const shouldEvict = (entry: {
      key: unknown;
      createdAt: number;
      isStale: boolean;
      isError: boolean;
    }) => {
      const now = Date.now();

      // Check after condition (time from creation)
      if (conditions.after) {
        const age = now - entry.createdAt;
        if (age > conditions.after) return true;
      }

      // Check idle condition (time since refCount=0)
      if (conditions.idle !== undefined) {
        const released = releasedAt.get(entry.key);
        if (released && now - released > conditions.idle) return true;
      }

      // Check error condition
      if (conditions.error && entry.isError) return true;

      // Check stale condition
      if (conditions.stale && entry.isStale) return true;

      return false;
    };

    /**
     * Clean up entries that match eviction conditions
     */
    const cleanup = (excludeKey?: unknown) => {
      const toDelete: unknown[] = [];

      for (const [key, entry] of api) {
        if (key === excludeKey) continue;
        if (shouldEvict(entry)) {
          toDelete.push(key);
        }
      }

      for (const key of toDelete) {
        api.delete(key);
        releasedAt.delete(key);
      }
    };

    return {
      onAccess(entry) {
        // Clear released timestamp when accessed
        releasedAt.delete(entry.key);

        // Lazy cleanup
        cleanup(entry.key);
      },

      onRelease(entry) {
        if (entry.refCount === 0) {
          releasedAt.set(entry.key, Date.now());

          // Immediate eviction if idle=0
          if (conditions.idle === 0) {
            api.delete(entry.key);
            releasedAt.delete(entry.key);
          }
        }
      },

      onError(_error, entry) {
        // Evict on error if configured
        if (conditions.error) {
          api.delete(entry.key);
          releasedAt.delete(entry.key);
        }
      },

      onStale(entry) {
        // Evict on stale if configured
        if (conditions.stale) {
          api.delete(entry.key);
          releasedAt.delete(entry.key);
        }
      },

      onDelete(key) {
        releasedAt.delete(key);
      },

      onClear() {
        releasedAt.clear();
      },

      onDispose() {
        releasedAt.clear();
      },
    };
  };
}
