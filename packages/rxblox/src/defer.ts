/**
 * Types for sync deferred modules
 */
type DeferSync<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => R
    : () => T[K];
};

/**
 * Types for async deferred modules
 */
type DeferAsync<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R>
    : () => Promise<T[K]>;
};

/**
 * Cache for deferred module proxies to ensure referential stability
 */
const proxyCache = new WeakMap<Function, any>();

/**
 * Creates a deferred-loading proxy for a module or object.
 *
 * Automatically detects sync vs async imports:
 * - If `importFn` returns a Promise → async proxy (all access returns Promises)
 * - If `importFn` returns a value → sync proxy (direct access)
 *
 * The module is loaded lazily on first property access.
 *
 * @param importFn - Function that imports/returns the module
 * @returns A proxy that defers loading until first access
 *
 * @example Async import (dynamic import)
 * ```ts
 * // service.ts
 * export default {
 *   settings: { theme: 'dark' },
 *   doSomething() { return true; }
 * }
 *
 * // app.ts
 * const service = defer(() => import('./service'));
 *
 * // Method call - single invocation, returns Promise
 * await service.doSomething();  // Promise<boolean>
 *
 * // Property access - returns async wrapper
 * const settings = await service.settings();  // Promise<{ theme: string }>
 * ```
 *
 * @example Sync import (lazy initialization)
 * ```ts
 * const heavyComputation = defer(() => {
 *   // Expensive initialization only happens on first access
 *   return {
 *     calculate: (x: number) => x * 2,
 *     data: Array.from({ length: 10000 }, (_, i) => i)
 *   };
 * });
 *
 * // Sync access - no Promises
 * const result = heavyComputation.calculate(5);  // 10
 * const data = heavyComputation.data();  // number[]
 * ```
 *
 * @example With default export
 * ```ts
 * const utils = defer(() => import('./utils'));
 * await utils.formatDate(new Date());
 * ```
 */
export function defer<T extends Record<string, any>>(
  importFn: () => Promise<{ default: T }>
): DeferAsync<T>;

export function defer<T extends Record<string, any>>(
  importFn: () => T
): DeferSync<T>;

export function defer<T extends Record<string, any>>(
  importFn: () => T | Promise<{ default: T }>
): DeferSync<T> | DeferAsync<T> {
  // Check cache first for referential stability
  const cached = proxyCache.get(importFn);
  if (cached) {
    return cached;
  }

  let cache: T | Promise<T> | undefined;
  let isAsync = false;

  const load = (): T | Promise<T> => {
    if (cache !== undefined) {
      return cache;
    }

    const result = importFn();

    // Detect if it's a Promise
    if (result && typeof result === "object" && "then" in result) {
      isAsync = true;
      cache = (result as Promise<{ default: T }>).then((mod) => mod.default);
    } else {
      cache = result as T;
    }

    return cache;
  };

  const proxy = new Proxy({} as any, {
    get(_, prop) {
      // Return a wrapper function for each property
      const wrapper = (...args: any[]) => {
        const moduleOrPromise = load();

        // Handle async case
        if (isAsync) {
          return (moduleOrPromise as Promise<T>).then((mod) => {
            const value = (mod as any)[prop];

            // If it's a function, call it with args
            if (typeof value === "function") {
              return value.apply(mod, args);
            }

            // Otherwise return the property value
            return value;
          });
        }

        // Handle sync case
        const mod = moduleOrPromise as T;
        const value = (mod as any)[prop];

        // If it's a function, call it with args
        if (typeof value === "function") {
          return value.apply(mod, args);
        }

        // Otherwise return the property value
        return value;
      };

      return wrapper;
    },
  });

  // Cache the proxy with the importFn as key
  proxyCache.set(importFn, proxy);

  return proxy;
}

