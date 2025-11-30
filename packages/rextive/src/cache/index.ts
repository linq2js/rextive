/**
 * @module rextive/cache
 *
 * Data caching with strategies for rextive.
 *
 * Create cached async data sources with built-in strategies for LRU eviction,
 * stale-while-revalidate, and more.
 *
 * @example
 * ```ts
 * import { cache, lru, staleOn, evictOn } from 'rextive/cache';
 *
 * // Create a cached data fetcher
 * const getUser = cache('users', async (userId: string) => {
 *   const res = await fetch(`/api/users/${userId}`);
 *   return res.json();
 * }, {
 *   strategy: [lru(100), staleOn({ maxAge: 60_000 })]
 * });
 *
 * // Access cached data
 * const { value, unref } = getUser('123');
 * const user = await value;
 * unref(); // Release reference
 *
 * // Cache operations
 * getUser.stale('123');   // Mark stale
 * getUser.refresh('123'); // Force re-fetch
 * getUser.delete('123');  // Remove
 * getUser.clear();        // Clear all
 * ```
 */

// Core cache
export { cache } from "./cache";

// Object keyed map utilities
export { ObjectKeyedMap, stableStringify } from "./objectKeyedMap";
export type { ObjectKeyedMapOptions } from "./objectKeyedMap";

// Types
export type {
  Cache,
  CacheAccessResult,
  CacheApi,
  CacheEntry,
  CacheFactoryMap,
  CacheFromFactory,
  CacheGroup,
  CacheOptions,
  CacheStrategy,
  CacheStrategyHooks,
} from "./types";

// Built-in strategies
export { lru, hydrate, staleOn, evictOn } from "./strategies";

export type {
  LruOptions,
  HydrateOptions,
  StaleOnConditions,
  EvictOnConditions,
} from "./strategies";
