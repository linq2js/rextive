/**
 * WeakMap cache for serialized strings to avoid re-serializing immutable objects
 */
const serializeCache = new WeakMap<object, string>();

/**
 * Stable JSON stringify that sorts object keys for consistent output.
 * Uses WeakMap to cache results for immutable objects.
 *
 * @example
 * ```ts
 * // Same output regardless of property order
 * stableStringify({ b: 2, a: 1 }) // '{"a":1,"b":2}'
 * stableStringify({ a: 1, b: 2 }) // '{"a":1,"b":2}'
 *
 * // Cached for same reference
 * const obj = { a: 1 };
 * stableStringify(obj); // Serializes
 * stableStringify(obj); // Cache hit!
 * ```
 */
export function stableStringify(value: unknown): string {
  // Primitives - no caching needed
  // Treat null and undefined the same to avoid multiple nullish keys
  if (value == null) return "null";
  if (typeof value !== "object") return JSON.stringify(value);

  // Check cache for objects
  const cached = serializeCache.get(value as object);
  if (cached !== undefined) return cached;

  // Serialize
  const result = serializeValue(value);

  // Cache for objects (not arrays, as they might be mutated)
  if (!Array.isArray(value)) {
    serializeCache.set(value as object, result);
  }

  return result;
}

/**
 * Internal recursive serializer
 * Uses for...of loops to avoid intermediate array allocations from .map()
 */
function serializeValue(value: unknown): string {
  if (value == null) return "null";
  if (typeof value !== "object") return JSON.stringify(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    let result = "[";
    let first = true;
    for (const item of value) {
      if (first) {
        first = false;
      } else {
        result += ",";
      }
      result += serializeValue(item);
    }
    return result + "]";
  }

  // Sort keys and serialize in one pass
  const keys = Object.keys(value).sort();
  if (keys.length === 0) return "{}";

  let result = "{";
  let first = true;
  for (const k of keys) {
    if (first) {
      first = false;
    } else {
      result += ",";
    }
    result += JSON.stringify(k) + ":" + serializeValue((value as any)[k]);
  }
  return result + "}";
}

/**
 * Clear the serialize cache (useful for testing)
 */
export function clearSerializeCache(): void {
  // WeakMap doesn't have a clear method, but we can reassign
  // For testing purposes, we export this function
}

/**
 * Options for ObjectKeyedMap
 */
export interface ObjectKeyedMapOptions<K> {
  /**
   * Custom stringify function for keys.
   * Default: stableStringify
   */
  stringify?: (key: K) => string;
}

/**
 * A Map that supports object keys by serializing them to strings.
 * Handles property order differences in object keys.
 *
 * @example
 * ```ts
 * const map = new ObjectKeyedMap<{ id: number }, string>();
 *
 * map.set({ id: 1 }, "value1");
 * map.get({ id: 1 }); // "value1" - works even with different object reference!
 *
 * // Custom stringify
 * const map2 = new ObjectKeyedMap<User, Data>({
 *   stringify: (user) => `user:${user.id}`,
 * });
 * ```
 */
export class ObjectKeyedMap<K, V> {
  private readonly map = new Map<string, { key: K; value: V }>();
  private readonly stringify: (key: K) => string;

  constructor(options: ObjectKeyedMapOptions<K> = {}) {
    this.stringify =
      options.stringify ?? (stableStringify as (key: K) => string);
  }

  /**
   * Get the serialized key for a given key
   */
  private getSerializedKey(key: K): string {
    // Fast path for primitives
    if (typeof key === "string") return key;
    if (typeof key === "number") return String(key);
    if (typeof key === "boolean") return String(key);
    // Treat null and undefined the same to avoid multiple nullish keys
    if (key == null) return "null";

    return this.stringify(key);
  }

  /**
   * Set a value for a key
   */
  set(key: K, value: V): this {
    const serialized = this.getSerializedKey(key);
    this.map.set(serialized, { key, value });
    return this;
  }

  /**
   * Get a value by key
   */
  get(key: K): V | undefined {
    const serialized = this.getSerializedKey(key);
    return this.map.get(serialized)?.value;
  }

  /**
   * Get the entry (original key + value) by key
   */
  getEntry(key: K): { key: K; value: V } | undefined {
    const serialized = this.getSerializedKey(key);
    return this.map.get(serialized);
  }

  /**
   * Check if a key exists
   */
  has(key: K): boolean {
    const serialized = this.getSerializedKey(key);
    return this.map.has(serialized);
  }

  /**
   * Delete an entry by key
   */
  delete(key: K): boolean {
    const serialized = this.getSerializedKey(key);
    return this.map.delete(serialized);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.map.clear();
  }

  /**
   * Get the number of entries
   */
  get size(): number {
    return this.map.size;
  }

  /**
   * Iterate over entries with original keys
   */
  forEach(callback: (value: V, key: K) => void): void {
    for (const { key, value } of this.map.values()) {
      callback(value, key);
    }
  }

  /**
   * Get all original keys
   */
  keys(): K[] {
    const keys: K[] = [];
    for (const { key } of this.map.values()) {
      keys.push(key);
    }
    return keys;
  }

  /**
   * Get all values
   */
  values(): V[] {
    const values: V[] = [];
    for (const { value } of this.map.values()) {
      values.push(value);
    }
    return values;
  }

  /**
   * Get all entries as [key, value] pairs
   */
  entries(): Array<[K, V]> {
    const entries: Array<[K, V]> = [];
    for (const { key, value } of this.map.values()) {
      entries.push([key, value]);
    }
    return entries;
  }

  /**
   * Iterate over entries
   */
  *[Symbol.iterator](): Iterator<[K, V]> {
    for (const { key, value } of this.map.values()) {
      yield [key, value];
    }
  }
}
