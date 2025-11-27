import { CacheStrategy, CacheStrategyHooks } from "./types";

/**
 * Options for stale-while-revalidate strategy
 */
export interface SwrOptions {
  /**
   * Time in milliseconds after which data is considered stale.
   * When accessed after this time, cached data is returned immediately
   * but a background refresh is triggered.
   */
  staleTime: number;
}

/**
 * Stale-while-revalidate strategy
 *
 * Returns cached data immediately but triggers a background refresh
 * if the data is older than `staleTime`.
 *
 * @example
 * ```ts
 * const getUser = cache("users", fetchUser, {
 *   use: [swr({ staleTime: 30000 })], // 30 seconds
 * });
 * ```
 */
export function swr(options: SwrOptions): CacheStrategy {
  return (): CacheStrategyHooks => {
    return {
      onAccess(entry) {
        const age = Date.now() - entry.createdAt;
        if (age > options.staleTime && !entry.isStale && !entry.isFetching) {
          entry.isStale = true;
        }
      },
    };
  };
}

/**
 * Options for TTL (time-to-live) strategy
 *
 * Combines time-based, idle-based, and reference-count-based cleanup.
 */
export interface TtlOptions {
  /**
   * Time in milliseconds after which data is marked stale (from creation).
   * Stale entries return cached data but trigger background refresh.
   */
  stale?: number;

  /**
   * Time in milliseconds after which data is removed (from creation).
   * Hard expiration regardless of usage.
   */
  expire?: number;

  /**
   * Time in milliseconds after which unused entries are removed.
   * "Unused" means refCount=0 for this duration.
   * Uses lazy cleanup by default (checked on access).
   */
  idle?: number;

  /**
   * Optional interval for periodic cleanup.
   * If not set, cleanup happens lazily on access (more efficient).
   * If set, a timer runs periodic scans (guaranteed cleanup even without activity).
   */
  interval?: number;
}

/**
 * Time-to-live strategy
 *
 * Unified strategy for time-based, idle-based, and reference-count cleanup.
 * - `stale`: Mark entries stale after X ms (from creation)
 * - `expire`: Remove entries after X ms (from creation)
 * - `idle`: Remove entries unused for X ms (from last release when refCount=0)
 *
 * By default uses lazy cleanup (on access). Set `interval` for periodic cleanup.
 *
 * @example
 * ```ts
 * // Time-based only
 * ttl({ stale: 30000, expire: 300000 })
 *
 * // Idle-based only (remove if unused for 1 minute)
 * ttl({ idle: 60000 })
 *
 * // Combined with periodic cleanup
 * ttl({ stale: 30000, expire: 300000, idle: 60000, interval: 10000 })
 * ```
 */
export function ttl(options: TtlOptions): CacheStrategy {
  return (api): CacheStrategyHooks => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    // Track when entries were released (refCount → 0)
    const releasedAt = new Map<unknown, number>();

    /**
     * Check and clean up entries based on TTL rules
     */
    const cleanup = (excludeKey?: unknown) => {
      const now = Date.now();
      const toDelete: unknown[] = [];

      for (const [key, entry] of api) {
        // Skip the entry we're currently accessing
        if (key === excludeKey) continue;

        const age = now - entry.createdAt;

        // Check expire (time from creation)
        if (options.expire && age > options.expire) {
          toDelete.push(key);
          continue;
        }

        // Check idle (time since refCount=0)
        if (options.idle && entry.refCount === 0) {
          const released = releasedAt.get(key);
          if (released && now - released > options.idle) {
            toDelete.push(key);
            continue;
          }
        }

        // Check stale (time from creation)
        if (
          options.stale &&
          age > options.stale &&
          !entry.isStale &&
          !entry.isFetching
        ) {
          api.stale(key);
        }
      }

      // Delete expired/idle entries
      for (const key of toDelete) {
        api.delete(key);
        releasedAt.delete(key);
      }
    };

    return {
      onInit() {
        // Start periodic cleanup if interval is set
        if (options.interval) {
          intervalId = setInterval(cleanup, options.interval);
        }
      },

      onDispose() {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = undefined;
        }
        releasedAt.clear();
      },

      onAccess(entry) {
        // Clear released timestamp when accessed
        releasedAt.delete(entry.key);

        // Check stale on access
        if (options.stale) {
          const age = Date.now() - entry.createdAt;
          if (age > options.stale && !entry.isStale && !entry.isFetching) {
            entry.isStale = true;
          }
        }

        // Lazy cleanup (if no interval set)
        if (!options.interval && (options.expire || options.idle)) {
          cleanup(entry.key);
        }
      },

      onRelease(entry) {
        if (entry.refCount === 0) {
          // Record when this entry became unused
          releasedAt.set(entry.key, Date.now());

          // Immediate cleanup if idle=0
          if (options.idle === 0) {
            api.delete(entry.key);
            releasedAt.delete(entry.key);
          }
        }
      },

      onDelete(key) {
        releasedAt.delete(key);
      },

      onClear() {
        releasedAt.clear();
      },
    };
  };
}

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
