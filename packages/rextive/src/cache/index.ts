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
export { swr, ttl, lru, hydrate } from "./strategies";

export type {
  SwrOptions,
  TtlOptions,
  LruOptions,
  HydrateOptions,
} from "./strategies";
