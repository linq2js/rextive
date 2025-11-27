import type { Disposable } from "../types";

/**
 * Cache entry representing a single cached value
 */
export interface CacheEntry<T, K = unknown> {
  /** The cache key/payload */
  key: K;
  /** The cached value (resolved) */
  value: T;
  /** The promise that resolves to the value */
  promise: Promise<T>;
  /** Number of active references */
  refCount: number;
  /** Timestamp when entry was created */
  createdAt: number;
  /** Timestamp when entry was last accessed */
  accessedAt: number;
  /** Whether the entry is marked as stale */
  isStale: boolean;
  /** Whether the entry is currently fetching */
  isFetching: boolean;
  /** Whether the entry has an error (promise rejected) */
  isError: boolean;
  /** The error if isError is true */
  error?: unknown;
}

/**
 * API available to cache strategies
 */
export interface CacheApi<T, K = unknown> {
  /** Cache name for debugging */
  readonly name: string;

  /** Set a value in the cache */
  set(key: K, value: T): void;

  /** Get an entry from the cache */
  get(key: K): CacheEntry<T, K> | undefined;

  /** Check if a key exists in the cache */
  has(key: K): boolean;

  /** Delete an entry from the cache */
  delete(key: K): boolean;

  /** Clear all entries from the cache */
  clear(): void;

  /** Mark an entry as stale */
  stale(key: K): void;

  /** Get the number of entries in the cache */
  readonly size: number;

  /** Iterate over all entries */
  forEach(fn: (entry: CacheEntry<T, K>, key: K) => void): void;

  /** Iterator for for...of loops - yields [key, entry] pairs */
  [Symbol.iterator](): Iterator<[K, CacheEntry<T, K>]>;

  /** Get all keys */
  keys(): K[];

  /** Extract all data (for SSR) */
  extract(): Record<string, T>;
}

/**
 * Cache strategy definition
 */
export type CacheStrategy<T = unknown, K = unknown> = (
  api: CacheApi<T, K>
) => CacheStrategyHooks<T, K> | void;

/**
 * Hooks that a cache strategy can implement
 */
export interface CacheStrategyHooks<T = unknown, K = unknown> {
  /** Called when cache is initialized */
  onInit?(): void | Promise<void>;

  /** Called when cache is disposed */
  onDispose?(): void;

  /** Called when factory is invoked to fetch data */
  onFetch?(entry: CacheEntry<T, K>): void;

  /** Called when an entry is accessed */
  onAccess?(entry: CacheEntry<T, K>): void;

  /** Called when a reference is released */
  onRelease?(entry: CacheEntry<T, K>): void;

  /** Called when an entry is marked stale */
  onStale?(entry: CacheEntry<T, K>): void;

  /** Called when data is set (fetch complete or injected) */
  onSet?(key: K, value: T, entry: CacheEntry<T, K>): void;

  /** Called when fetch fails (promise rejects) */
  onError?(error: unknown, entry: CacheEntry<T, K>): void;

  /** Called when an entry is deleted/evicted */
  onDelete?(key: K, entry: CacheEntry<T, K>): void;

  /** Called when cache is cleared */
  onClear?(): void;
}

/**
 * Options for creating a cache
 */
export interface CacheOptions<T = unknown, K = unknown> {
  /** Strategies to apply to the cache */
  use?: CacheStrategy<NoInfer<T>, NoInfer<K>>[];

  /**
   * Custom key stringify function for object keys.
   * By default uses stableStringify which sorts keys for consistent serialization.
   *
   * @example
   * ```ts
   * // Custom stringify for user keys
   * cache('users', fetchUser, {
   *   stringify: (key) => `user:${key.id}`,
   * });
   * ```
   */
  stringify?: (key: K) => string;
}

/**
 * Result of accessing a cache entry
 */
export interface CacheAccessResult<T> {
  /** The cached value as a promise */
  value: Promise<T>;
  /** Release the reference when done */
  unref(): void;
}

/**
 * Single cache instance
 */
export interface Cache<T, K = unknown> extends Disposable {
  /** Access a cached value by key */
  (key: K): CacheAccessResult<T>;

  /** Cache name */
  readonly name: string;

  /** Number of entries in the cache */
  readonly size: number;

  /** Mark an entry as stale (lazy re-fetch on next access) */
  stale(key: K): void;

  /** Mark all entries as stale */
  staleAll(): void;

  /** Force immediate re-fetch */
  refresh(key: K): Promise<T>;

  /** Refresh all entries */
  refreshAll(): Promise<T[]>;

  /** Delete an entry from the cache */
  delete(key: K): boolean;

  /** Clear all entries */
  clear(): void;

  /** Check if a key exists */
  has(key: K): boolean;

  /** Get value without creating entry or incrementing refCount */
  peek(key: K): T | undefined;

  /** Prefetch a key (for SSR warming) */
  prefetch(key: K): Promise<T>;

  /** Extract all data (for SSR) */
  extract(): Record<string, T>;

  /** Dispose the cache */
  dispose(): void;
}

/**
 * Factory function for cache group
 */
export type CacheFactoryMap = Record<string, (key: any) => Promise<any>>;

/**
 * Infer the cache type from a factory function
 */
export type CacheFromFactory<F> = F extends (key: infer K) => Promise<infer T>
  ? Cache<T, K>
  : never;

/**
 * Cache group containing multiple related caches
 */
export type CacheGroup<TFactoryMap extends CacheFactoryMap> = {
  /** Access individual caches */
  [Name in keyof TFactoryMap]: CacheFromFactory<TFactoryMap[Name]>;
} & {
  /** Group name */
  readonly name: string;

  /** Mark all entries in all caches as stale */
  staleAll(): void;

  /** Clear all entries in all caches */
  clearAll(): void;

  /** Refresh all entries in all caches */
  refreshAll(): Promise<void>;

  /** Extract all data from all caches (for SSR) */
  extract(): {
    [Name in keyof TFactoryMap]: Record<string, unknown>;
  };

  /** Dispose all caches in the group */
  dispose(): void;
};
