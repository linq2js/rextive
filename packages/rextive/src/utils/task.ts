import { isPromiseLike } from "./isPromiseLike";
import {
  TASK_TYPE,
  type LoadingTask,
  type SuccessTask,
  type ErrorTask,
  type Task,
  Signal,
  SignalContext,
  SignalOptions,
  Computed,
} from "../types";
import { getHooks } from "../hooks";
import { is } from "../is";
import { autoPrefix } from "./nameGenerator";

/**
 * Creates an operator that transforms an async signal into a Task signal with guaranteed `value`.
 *
 * Overrides the Task's `value` property to ensure it's always defined (never undefined),
 * implementing a stale-while-revalidate pattern:
 * - **First load** (`context.nth === 0`): Uses `initial` value while loading
 * - **Loading after success**: Shows previous successful value (stale data)
 * - **Success**: Shows current value (fresh data)
 *
 * This prevents UI flickering by always having a value to display, even during
 * loading states or when refreshing data. The `value` property is guaranteed to be
 * defined, unlike the standard Task where `value` is `undefined` in loading/error states.
 *
 * @template TValue - The type of the value
 * @param initial - Initial value to use on first load
 * @param options - Optional signal options
 * @returns An operator function for use with `.pipe()`
 *
 * @example Basic usage
 * ```typescript
 * const remoteData = signal(async () => fetch("/api/user").then(r => r.json()));
 * const taskSignal = remoteData.pipe(task({ name: "Guest" }));
 *
 * // In UI - value is always defined
 * const t = taskSignal();
 * return <div>{t.value.name}</div>; // Never undefined!
 * ```
 *
 * @example Stale-while-revalidate pattern
 * ```typescript
 * const userData = signal(async () => fetchUser(1));
 * const userTask = userData.pipe(task({ id: 0, name: "Loading..." }));
 *
 * // First load: t.value = { id: 0, name: "Loading..." } (initial)
 * // After success: t.value = { id: 1, name: "Alice" } (fresh)
 * // On refresh: t.value = { id: 1, name: "Alice" } (stale, while loading new data)
 * ```
 */
export function task<TValue>(
  initial: NoInfer<TValue>,
  options?: SignalOptions<Task<TValue> & { value: TValue }>
): (
  source: Signal<PromiseLike<TValue>>
) => Computed<Task<TValue> & { value: TValue }> {
  return (source) => {
    // Store previous successful value for stale-while-revalidate pattern
    let prev: { value: TValue } | undefined;

    return source.to(
      (value, context: SignalContext): Task<TValue> & { value: TValue } => {
        // Reset previous value on first computation (when signal is first created)
        // This ensures we start fresh with the initial value
        if (context.nth === 0) {
          prev = undefined;
        }

        // Get or create task from promise (uses promise cache internally)
        const t = task.from(value);

        if (t.loading) {
          // Promise is still loading - set up handler to cache value when it resolves
          // Use context.safe() to prevent race conditions:
          // - If computation is aborted, the promise handler won't execute
          // - Prevents updating stale state after a new computation has started
          context.safe(t.promise).then((value) => {
            prev = { value };
          });
        } else if (t.status === "success") {
          // Promise already resolved - cache the value immediately
          prev = { value: t.value };
        }

        // Override the task's value property to ensure it's always defined
        // This overrides the standard Task behavior where value is undefined in loading state
        // value is always defined:
        // - If we have a previous value: use it (stale-while-revalidate)
        // - Otherwise: use initial value (first load)
        return {
          ...t,
          value: prev ? prev.value : initial, // Override: always defined, never undefined
        } as Task<TValue> & { value: TValue };
      },
      {
        ...options,
        name: options?.name ?? autoPrefix(`task(${source.displayName})`),
      }
    );
  };
}

// Namespace with factory and helper methods
export namespace task {
  /**
   * Creates a loading task from a promise.
   *
   * @param promise - The promise representing the ongoing operation
   * @returns A LoadingTask wrapping the promise
   *
   * @example
   * ```typescript
   * const userPromise = fetchUser(1);
   * const loading = task.loading(userPromise);
   * ```
   */
  export function loading<TValue>(
    promise: PromiseLike<TValue>
  ): LoadingTask<TValue> {
    return {
      [TASK_TYPE]: true,
      status: "loading",
      promise,
      value: undefined,
      error: undefined,
      loading: true,
    };
  }

  /**
   * Creates a success task with data.
   *
   * @param value - The successful result data
   * @param promise - The resolved promise (optional)
   * @returns A SuccessTask containing the data
   *
   * @example
   * ```typescript
   * const user = { id: 1, name: "Alice" };
   * const success = task.success(user);
   * ```
   */
  export function success<TValue>(
    value: TValue,
    promise?: PromiseLike<TValue>
  ): SuccessTask<TValue> {
    const resolvedPromise = promise || Promise.resolve(value);
    return {
      [TASK_TYPE]: true,
      status: "success",
      promise: resolvedPromise,
      value,
      error: undefined,
      loading: false,
    };
  }

  /**
   * Creates an error task.
   *
   * @param error - The error that occurred
   * @param promise - The rejected promise (optional)
   * @returns An ErrorTask containing the error
   *
   * @example
   * ```typescript
   * const err = new Error("User not found");
   * const error = task.error(err);
   * ```
   */
  export function error<TValue = any>(
    error: unknown,
    promise?: PromiseLike<TValue>
  ): ErrorTask<TValue> {
    const rejectedPromise = promise || Promise.reject(error);
    if (rejectedPromise instanceof Promise) {
      // Prevent unhandled rejection warnings
      rejectedPromise.catch(() => {});
    }
    return {
      [TASK_TYPE]: true,
      status: "error",
      promise: rejectedPromise,
      value: undefined,
      error,
      loading: false,
    };
  }

  /**
   * Associates a task with a promise in the cache.
   *
   * @param promise - The promise to cache
   * @param t - The task to associate with the promise
   * @returns The task that was cached
   *
   * @example
   * ```typescript
   * const promise = fetchUser(1);
   * const t = task.loading(promise);
   * task.set(promise, t);
   * ```
   */
  export function set<T, L extends Task<T>>(promise: PromiseLike<T>, t: L): L {
    getPromiseCache().set(promise, t);
    return t;
  }

  /**
   * Gets or creates a task for a promise.
   *
   * @param promise - The promise to get/create task for
   * @returns Task representing the promise state
   *
   * @example
   * ```typescript
   * const promise = fetchUser(1);
   * const t = task.get(promise);
   * ```
   */
  export function get<T>(promise: PromiseLike<T>): Task<T> {
    const cache = getPromiseCache();
    let t = cache.get(promise) as Task<T> | undefined;
    if (t) return t;

    promise.then(
      (data) => {
        task.set(promise, task.success(data, promise as Promise<T>));
      },
      (error) => {
        task.set(promise, task.error(error, promise as Promise<T>));
      }
    );

    return task.set(promise, task.loading(promise as Promise<T>));
  }

  /**
   * Normalizes an arbitrary value into a Task.
   * This is an alias for the main `task()` function.
   *
   * - If the value is already a Task, returns it as-is.
   * - If the value is a PromiseLike, wraps or reuses a cached Task.
   * - If the value is a Signal, unwraps and normalizes the signal's value.
   * - Otherwise, wraps the value in a "success" Task.
   *
   * @template TValue - The type of the value
   * @param value - The value to convert to a Task
   * @returns A Task wrapping the value
   *
   * @example
   * ```typescript
   * // Convert promise to task
   * const userTask = task.from(fetchUser(1));
   *
   * // Convert plain value to task
   * const dataTask = task.from({ id: 1, name: "Alice" });
   *
   * // Convert signal to task
   * const signalTask = task.from(userSignal);
   *
   * // Already a task? Returns as-is
   * const t = task.success(42);
   * const same = task.from(t); // same === t
   * ```
   */
  export function from<TValue>(
    value: TValue
  ): TValue extends Signal<infer T>
    ? Task<Awaited<T>>
    : TValue extends Task<any>
    ? TValue
    : TValue extends PromiseLike<infer T>
    ? Task<T>
    : Task<TValue> {
    if (is(value)) {
      if (value.error()) {
        return task.error(value.error()) as any;
      }
      value = (value as Signal<any>)();
    }
    const t = toTaskImpl(value) as any;

    getHooks().onTaskAccess(t);

    return t;
  }
}

/**
 * Get or create global promise cache (shared across all module instances).
 * This ensures that tasks for the same promise are shared between entry points.
 */
function getPromiseCache(): WeakMap<PromiseLike<unknown>, Task<unknown>> {
  if (typeof globalThis !== "undefined") {
    if (!(globalThis as any).__REXTIVE_PROMISE_CACHE__) {
      (globalThis as any).__REXTIVE_PROMISE_CACHE__ = new WeakMap<
        PromiseLike<unknown>,
        Task<unknown>
      >();
    }
    return (globalThis as any).__REXTIVE_PROMISE_CACHE__;
  }
  // Fallback for environments without globalThis (shouldn't happen in modern JS)
  return new WeakMap<PromiseLike<unknown>, Task<unknown>>();
}

/**
 * Get or create global static task cache (shared across all module instances).
 * This ensures that tasks for the same object/function are shared between entry points.
 */
function getStaticTaskCache(): WeakMap<object, Task<unknown>> {
  if (typeof globalThis !== "undefined") {
    if (!(globalThis as any).__REXTIVE_STATIC_TASK_CACHE__) {
      (globalThis as any).__REXTIVE_STATIC_TASK_CACHE__ = new WeakMap<
        object,
        Task<unknown>
      >();
    }
    return (globalThis as any).__REXTIVE_STATIC_TASK_CACHE__;
  }
  // Fallback for environments without globalThis
  return new WeakMap<object, Task<unknown>>();
}

/**
 * Internal implementation for normalizing a value to a Task.
 */
function toTaskImpl<T>(value: unknown): Task<T> {
  if (is<T>(value, "task")) {
    return value;
  }

  if (isPromiseLike<T>(value)) {
    return task.get(value);
  }

  // Cache object/function values to reuse their success tasks
  if (
    value !== null &&
    (typeof value === "object" || typeof value === "function")
  ) {
    const staticCache = getStaticTaskCache();
    const existing = staticCache.get(value as object);
    if (existing) {
      return existing as Task<T>;
    }
    const t = task.success(value as T) as Task<T>;
    staticCache.set(value as object, t);
    return t;
  }

  // Primitives are cheap to wrap, no caching needed
  return task.success(value as T) as Task<T>;
}
