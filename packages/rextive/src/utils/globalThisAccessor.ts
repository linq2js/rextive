/**
 * Global reference for cross-module state sharing.
 * Falls back to empty object if globalThis is unavailable.
 */
const g: any = typeof globalThis !== "undefined" ? globalThis : {};

/**
 * Creates a typed accessor for a globalThis property.
 *
 * Useful for sharing state across multiple module instances (e.g., when
 * different parts of an app bundle different copies of the library).
 *
 * @param key - The property name on globalThis (e.g., "__REXTIVE_HOOKS__")
 * @param defaultValue - Returned by get() when the property is not set
 * @returns Object with get() and set() methods for the global property
 *
 * @example
 * ```ts
 * const hooksAccessor = getGlobalThisAccessor<Hooks>("__REXTIVE_HOOKS__", defaultHooks);
 *
 * hooksAccessor.get();           // Returns current value or defaultHooks
 * hooksAccessor.set(newHooks);   // Sets and returns the new value
 * ```
 */
export function getGlobalThisAccessor<T>(key: string, defaultValue: T) {
  return {
    /** Get the current value, or defaultValue if not set */
    get: (): T => {
      return (g[key] ?? defaultValue) as T;
    },
    /** Set the value and return it */
    set: (value: T): T => {
      g[key] = value;
      return value;
    },
  };
}
