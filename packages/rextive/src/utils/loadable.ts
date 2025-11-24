import { isPromiseLike } from "./isPromiseLike";
import {
  LOADABLE_TYPE,
  type LoadableStatus,
  type LoadingLoadable,
  type SuccessLoadable,
  type ErrorLoadable,
  type Loadable,
  SignalContext,
} from "../types";

// Re-export types
export { LOADABLE_TYPE };
export type {
  LoadableStatus,
  LoadingLoadable,
  SuccessLoadable,
  ErrorLoadable,
  Loadable,
};

/**
 * Normalizes an arbitrary value into a Loadable.
 *
 * - If the value is already a Loadable, returns it as-is.
 * - If the value is a PromiseLike, wraps or reuses a cached Loadable.
 * - Otherwise, wraps the value in a "success" Loadable.
 *
 * @template TValue - The type of the value
 * @param value - The value to convert to a Loadable
 * @returns A Loadable wrapping the value
 *
 * @example
 * ```typescript
 * // Convert promise to loadable
 * const userLoadable = loadable(fetchUser(1));
 *
 * // Convert plain value to loadable
 * const dataLoadable = loadable({ id: 1, name: "Alice" });
 *
 * // Already a loadable? Returns as-is
 * const l = loadable.success(42);
 * const same = loadable(l); // same === l
 * ```
 */
export function loadable<TValue>(
  value: TValue,
  context?: SignalContext
): TValue extends Loadable<any>
  ? TValue
  : TValue extends PromiseLike<infer T>
  ? Loadable<T>
  : Loadable<TValue> {
  const l = toLoadableImpl(value) as any;

  if (context && l.status === "loading") {
    l.promise.finally(context.refresh);
  }

  return l;
}

// Namespace with factory and helper methods
export namespace loadable {
  /**
   * Creates a loading loadable from a promise.
   *
   * @param promise - The promise representing the ongoing operation
   * @returns A LoadingLoadable wrapping the promise
   *
   * @example
   * ```typescript
   * const userPromise = fetchUser(1);
   * const loading = loadable.loading(userPromise);
   * ```
   */
  export function loading<TValue>(
    promise: PromiseLike<TValue>
  ): LoadingLoadable<TValue> {
    return {
      [LOADABLE_TYPE]: true,
      status: "loading",
      promise,
      value: undefined,
      error: undefined,
      loading: true,
    };
  }

  /**
   * Creates a success loadable with data.
   *
   * @param value - The successful result data
   * @param promise - The resolved promise (optional)
   * @returns A SuccessLoadable containing the data
   *
   * @example
   * ```typescript
   * const user = { id: 1, name: "Alice" };
   * const success = loadable.success(user);
   * ```
   */
  export function success<TValue>(
    value: TValue,
    promise?: PromiseLike<TValue>
  ): SuccessLoadable<TValue> {
    const resolvedPromise = promise || Promise.resolve(value);
    return {
      [LOADABLE_TYPE]: true,
      status: "success",
      promise: resolvedPromise,
      value,
      error: undefined,
      loading: false,
    };
  }

  /**
   * Creates an error loadable.
   *
   * @param error - The error that occurred
   * @param promise - The rejected promise (optional)
   * @returns An ErrorLoadable containing the error
   *
   * @example
   * ```typescript
   * const err = new Error("User not found");
   * const error = loadable.error(err);
   * ```
   */
  export function error<TValue = any>(
    error: unknown,
    promise?: PromiseLike<TValue>
  ): ErrorLoadable<TValue> {
    const rejectedPromise = promise || Promise.reject(error);
    if (rejectedPromise instanceof Promise) {
      // Prevent unhandled rejection warnings
      rejectedPromise.catch(() => {});
    }
    return {
      [LOADABLE_TYPE]: true,
      status: "error",
      promise: rejectedPromise,
      value: undefined,
      error,
      loading: false,
    };
  }

  /**
   * Type guard to check if a value is a Loadable.
   *
   * @param value - The value to check
   * @returns True if value is a Loadable
   *
   * @example
   * ```typescript
   * if (loadable.is(value)) {
   *   console.log(value.status);
   * }
   * ```
   */
  export function is<T = unknown>(value: unknown): value is Loadable<T> {
    return (
      typeof value === "object" &&
      value !== null &&
      LOADABLE_TYPE in value &&
      (value as any)[LOADABLE_TYPE] === true
    );
  }

  /**
   * Associates a loadable with a promise in the cache.
   *
   * @param promise - The promise to cache
   * @param l - The loadable to associate with the promise
   * @returns The loadable that was cached
   *
   * @example
   * ```typescript
   * const promise = fetchUser(1);
   * const l = loadable.loading(promise);
   * loadable.set(promise, l);
   * ```
   */
  export function set<T, L extends Loadable<T>>(
    promise: PromiseLike<T>,
    l: L
  ): L {
    promiseCache.set(promise, l);
    return l;
  }

  /**
   * Gets or creates a loadable for a promise.
   *
   * @param promise - The promise to get/create loadable for
   * @returns Loadable representing the promise state
   *
   * @example
   * ```typescript
   * const promise = fetchUser(1);
   * const l = loadable.get(promise);
   * ```
   */
  export function get<T>(promise: PromiseLike<T>): Loadable<T> {
    let l = promiseCache.get(promise) as Loadable<T> | undefined;
    if (l) return l;

    promise.then(
      (data) => {
        loadable.set(promise, loadable.success(data, promise as Promise<T>));
      },
      (error) => {
        loadable.set(promise, loadable.error(error, promise as Promise<T>));
      }
    );

    return loadable.set(promise, loadable.loading(promise as Promise<T>));
  }
}

/**
 * Cache for tracking promise states across calls.
 * Maps promises to their loadable representations.
 */
const promiseCache = new WeakMap<PromiseLike<unknown>, Loadable<unknown>>();

/**
 * Cache for static (non-promise) values to reuse their success loadables.
 * Only object/function values are cached via WeakMap to avoid memory leaks.
 */
const staticLoadableCache = new WeakMap<object, Loadable<unknown>>();

/**
 * Internal implementation for normalizing a value to a Loadable.
 */
function toLoadableImpl<T>(value: unknown): Loadable<T> {
  if (loadable.is<T>(value)) {
    return value;
  }

  if (isPromiseLike<T>(value)) {
    return loadable.get(value);
  }

  // Cache object/function values to reuse their success loadables
  if (
    value !== null &&
    (typeof value === "object" || typeof value === "function")
  ) {
    const existing = staticLoadableCache.get(value as object);
    if (existing) {
      return existing as Loadable<T>;
    }
    const l = loadable.success(value as T) as Loadable<T>;
    staticLoadableCache.set(value as object, l);
    return l;
  }

  // Primitives are cheap to wrap, no caching needed
  return loadable.success(value as T) as Loadable<T>;
}
