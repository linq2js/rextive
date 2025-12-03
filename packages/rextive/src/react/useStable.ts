/**
 * useStable - Creates a stable reference proxy for objects.
 *
 * This hook solves the common React problem where passing inline objects/functions
 * as props causes unnecessary re-renders because the reference changes every render.
 *
 * ## When to use
 *
 * ### 1. Callbacks for memoized children
 * Prevents `React.memo` children from re-rendering when parent re-renders:
 * ```tsx
 * const handlers = useStable({
 *   onClick: () => doSomething(latestState),
 *   onHover: () => doOther(latestProps),
 * });
 * return <MemoizedChild {...handlers} />; // Won't re-render unnecessarily
 * ```
 *
 * ### 2. Effect dependencies
 * Avoid infinite loops or unnecessary effect runs:
 * ```tsx
 * const config = useStable({ endpoint, headers, timeout });
 * useEffect(() => {
 *   fetchData(config); // Effect won't re-run if config values are the same
 * }, [config]); // Safe to use as dependency
 * ```
 *
 * ### 3. Memo dependencies
 * Stable references for `useMemo`/`useCallback` dependencies:
 * ```tsx
 * const filters = useStable({ search, sort, page });
 * const results = useMemo(() => {
 *   return processData(data, filters);
 * }, [data, filters]); // Won't recompute if filters are shallowly equal
 * ```
 *
 * ## How it works
 *
 * 1. Creates a Proxy that wraps the input object
 * 2. For **functions**: Returns the same wrapper function reference that delegates to the latest implementation
 * 3. For **objects/arrays**: Returns the cached reference if shallowly equal to the new value
 * 4. For **primitives**: Returns the value directly (no caching needed)
 *
 * ## Full Example
 *
 * ```tsx
 * function Parent() {
 *   const [count, setCount] = useState(0);
 *
 *   // Without useStable: callbacks object is recreated every render
 *   // causing Child to re-render even with React.memo
 *   const callbacks = useStable({
 *     increment: () => setCount(c => c + 1),
 *     decrement: () => setCount(c => c - 1),
 *     items: [1, 2, 3], // Also stabilized
 *   });
 *
 *   return <MemoizedChild callbacks={callbacks} />;
 * }
 * ```
 *
 * ## Why not useCallback?
 *
 * - `useCallback` requires listing all dependencies manually
 * - Multiple callbacks need multiple `useCallback` calls
 * - `useStable` automatically handles any number of functions/objects
 * - Functions always have access to the latest closure values
 *
 * @module useStable
 */

import { useState } from "react";
import { shallowEquals } from "../utils/shallowEquals";

/**
 * Options for useStable hook.
 */
export type UseStableOptions = {
  /**
   * Custom equality function for comparing values.
   * Defaults to Object.is for element comparison within shallowEquals.
   */
  equals?: (a: unknown, b: unknown) => boolean;
};

/**
 * The result type of useStable - preserves the shape but ensures functions
 * have stable references.
 */
export type UseStableResult<T extends object> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? (...args: Parameters<T[K]>) => ReturnType<T[K]>
    : T[K];
};

/**
 * Creates a stable reference proxy for an object.
 *
 * - Functions are wrapped in stable references that delegate to the latest implementation
 * - Objects and arrays are cached and returned if shallowly equal
 * - Dates are compared by timestamp
 * - Primitives are returned directly
 *
 * @param value - The object to stabilize
 * @param options - Optional configuration
 * @returns A proxy with stable references
 *
 * @example
 * ```tsx
 * const handlers = useStable({
 *   onClick: () => console.log('clicked'),
 *   onHover: () => console.log('hovered'),
 *   config: { theme: 'dark' },
 * });
 *
 * // handlers.onClick is always the same reference
 * // handlers.config is cached if shallowly equal
 * ```
 */
export function useStable<T extends object>(
  value: T,
  options: UseStableOptions = {}
): UseStableResult<T> {
  // Controller is created once and persists across renders
  const [controller] = useState(() => new UseStableController(value, options));

  // Update the controller with latest values on each render
  controller.onRender(value, options);

  return controller.proxy;
}

/**
 * Internal controller class that manages the proxy and cache.
 *
 * Separated from the hook to allow direct usage in non-React contexts
 * or for testing purposes.
 */
export class UseStableController<T extends object> {
  /** Current value being proxied */
  value: T;
  /** Current options */
  options: UseStableOptions;
  /** The stable proxy object */
  proxy: UseStableResult<T>;

  constructor(value: T, options: UseStableOptions = {}) {
    // Cache stores stable references for functions and objects
    const cache = new Map<keyof T, unknown>();

    this.value = value;
    this.options = options;

    this.proxy = new Proxy(this.value, {
      /**
       * Intercept property access to return stable references.
       */
      get: (_target, prop) => {
        const key = prop as keyof T;
        const current = this.value[key];
        let cachedValue = cache.get(key);

        // Functions: Return stable wrapper that delegates to latest implementation
        if (typeof current === "function") {
          if (typeof cachedValue !== "function") {
            // Create a stable wrapper function
            cachedValue = (...args: any[]) => {
              // Always call the LATEST function from this.value
              return (this.value[key] as Function).call(this.value, ...args);
            };
            cache.set(key, cachedValue);
          }
          return cachedValue;
        }

        // Arrays: Return cached if shallowly equal
        if (Array.isArray(current)) {
          if (
            Array.isArray(cachedValue) &&
            shallowEquals(current, cachedValue, this.options.equals)
          ) {
            return cachedValue;
          }
          cache.set(key, current);
          return current;
        }

        // Objects (including Date)
        if (current && typeof current === "object") {
          // Dates: Compare by timestamp
          if (current instanceof Date) {
            if (
              cachedValue instanceof Date &&
              cachedValue.getTime() === current.getTime()
            ) {
              return cachedValue;
            }
            cache.set(key, current);
            return current;
          }

          // Other objects: Return cached if shallowly equal
          if (
            cachedValue &&
            shallowEquals(current, cachedValue, this.options.equals)
          ) {
            return cachedValue;
          }
          cache.set(key, current);
          return current;
        }

        // Primitives: Return directly (no caching needed)
        return current;
      },

      /**
       * Enable Object.keys(), Object.entries(), Object.getOwnPropertyNames(), for...in, etc.
       * Returns keys from the current value (not the original target).
       */
      ownKeys: () => Reflect.ownKeys(this.value),

      /**
       * Required for ownKeys to work properly with Object.keys().
       * Returns property descriptors from the current value.
       */
      getOwnPropertyDescriptor: (_target, prop) =>
        Reflect.getOwnPropertyDescriptor(this.value, prop),

      /**
       * Enable 'key' in proxy checks.
       * Checks against the current value.
       */
      has: (_target, prop) => Reflect.has(this.value, prop),
    }) as UseStableResult<T>;
  }

  /**
   * Called on every render to update the current value and options.
   * The proxy will use these new values for subsequent property accesses.
   */
  onRender(value: T, options: UseStableOptions) {
    this.value = value;
    this.options = options;
  }
}
