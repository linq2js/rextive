import { loadable, Loadable, isLoadable } from "./loadable";
import { Signal } from "./types";
import { isPromiseLike } from "./isPromiseLike";

/**
 * Represents a value that can be awaited in signal.async().
 * Can be a promise, signal containing promise, or signal containing loadable.
 */
export type Awaitable<T> =
  | PromiseLike<T>
  | Signal<PromiseLike<T>>
  | Signal<Loadable<T>>;

/**
 * Cache for tracking promise states across wait() calls.
 * Maps promises to their loadable representations.
 */
const promiseCache = new WeakMap<PromiseLike<unknown>, Loadable<unknown>>();

/**
 * Associates a loadable with a promise in the cache.
 * Used internally to track promise states.
 */
export function setLoadable<T>(promise: PromiseLike<T>, l: Loadable<T>) {
  promiseCache.set(promise, l);
  return l;
}

/**
 * Gets or creates a loadable for a promise.
 *
 * If the promise is already cached, returns the cached loadable.
 * Otherwise, creates a new loading loadable and sets up handlers
 * to update the cache when the promise settles.
 *
 * @param promise - The promise to get/create loadable for
 * @returns Loadable representing the promise state
 */
export function getLoadable<T>(promise: PromiseLike<T>): Loadable<T> {
  let l = promiseCache.get(promise) as Loadable<T> | undefined;
  if (l) return l;

  promise.then(
    (data) => {
      setLoadable(promise, loadable("success", data, promise as Promise<T>));
    },
    (error) => {
      setLoadable(
        promise,
        loadable("error", error, promise as Promise<unknown>)
      );
    }
  );

  return setLoadable(promise, loadable("loading", promise as Promise<T>));
}

/**
 * Checks if a value is a signal by checking for function type.
 */
function isSignal(value: unknown): value is Signal<unknown> {
  return typeof value === "function";
}

/**
 * Resolves an awaitable to a loadable.
 *
 * Handles the following cases:
 * 1. Signal<Loadable<T>> -> Extract and return loadable
 * 2. Signal<PromiseLike<T>> -> Extract promise, get/create loadable
 * 3. PromiseLike<T> -> Get/create loadable
 * 4. Direct value -> Wrap in success loadable
 *
 * @param awaitable - The awaitable value to resolve
 * @returns Loadable representing the current state
 */
function resolveAwaitable<T>(awaitable: Awaitable<T>): Loadable<T> {
  let value: unknown = awaitable;

  // If it's a signal, call it to get the value
  if (isSignal(value)) {
    value = (value as Signal<unknown>)();
  }

  // If value is a loadable, return it
  if (isLoadable<T>(value)) {
    return value;
  }

  // If value is a promise, get/create loadable from cache
  if (isPromiseLike<T>(value)) {
    return getLoadable(value);
  }

  // Otherwise, wrap in success loadable
  return loadable("success", value as T);
}

/**
 * Waits for a single awaitable or all awaitables in an array.
 * Throws the promise if any are still loading.
 * Throws the error if any failed.
 * Returns unwrapped value(s) if all succeeded.
 *
 * @example
 * ```typescript
 * // Single value
 * const user = wait(userSignal);
 *
 * // Multiple values
 * const [user, posts] = wait([userSignal, postsSignal]);
 * ```
 */
function waitAll<T>(awaitable: Awaitable<T>): T;
function waitAll<const TAwaitables extends readonly Awaitable<unknown>[]>(
  awaitables: TAwaitables
): {
  [K in keyof TAwaitables]: TAwaitables[K] extends Awaitable<infer T>
    ? T
    : never;
};
function waitAll(awaitableOrArray: any): any {
  // Handle single awaitable
  if (!Array.isArray(awaitableOrArray)) {
    const l = resolveAwaitable(awaitableOrArray);
    if (l.status === "loading") {
      throw l.promise;
    }
    if (l.status === "error") {
      throw l.error;
    }
    return l.data;
  }

  // Handle array of awaitables
  const loadables = awaitableOrArray.map(resolveAwaitable);

  // Check if any are loading
  const loadingLoadable = loadables.find((l) => l.status === "loading");
  if (loadingLoadable) {
    // Throw Promise.all of all loading promises
    const promises = loadables.map((l) =>
      l.status === "loading" ? l.promise : Promise.resolve(l.data)
    );
    throw Promise.all(promises);
  }

  // Check if any errored
  const errorLoadable = loadables.find((l) => l.status === "error");
  if (errorLoadable) {
    throw errorLoadable.error;
  }

  // All succeeded, return data array
  return loadables.map((l) => l.data);
}

/**
 * Waits for the first successful result from a record of awaitables.
 * Returns [value, key] tuple indicating which succeeded first.
 * Only throws if ALL awaitables fail.
 *
 * @example
 * ```typescript
 * const [data, source] = wait.any({
 *   cache: cacheSignal,
 *   api: apiSignal,
 *   backup: backupSignal
 * });
 * console.log(`Loaded from: ${source}`); // "cache" | "api" | "backup"
 * ```
 */
function waitAny<const TAwaitables extends Record<string, Awaitable<unknown>>>(
  awaitables: TAwaitables
): {
  [K in keyof TAwaitables]: [
    TAwaitables[K] extends Awaitable<infer T> ? T : never,
    K
  ];
}[keyof TAwaitables];
function waitAny(awaitables: Record<string, Awaitable<unknown>>): any {
  const entries = Object.entries(awaitables);
  const loadables = entries.map(([key, awaitable]) => ({
    key,
    loadable: resolveAwaitable(awaitable),
  }));

  // Check if any succeeded
  const succeeded = loadables.find(({ loadable: l }) => l.status === "success");
  if (succeeded) {
    return [succeeded.loadable.data, succeeded.key];
  }

  // Check if all failed
  const allFailed = loadables.every(({ loadable: l }) => l.status === "error");
  if (allFailed) {
    // Throw error with all errors collected
    const errors = loadables.map(({ loadable: l }) => l.error);
    const error = new Error("All promises rejected");
    (error as any).errors = errors;
    throw error;
  }

  // Some are still loading, create Promise.any equivalent
  const promises = loadables.map(({ key, loadable: l }) =>
    l.status === "loading"
      ? l.promise.then((data) => [data, key])
      : l.status === "success"
      ? Promise.resolve([l.data, key])
      : Promise.reject(l.error)
  );

  // Promise.any polyfill: resolve with first success, reject if all fail
  throw new Promise((resolve, reject) => {
    let rejectionCount = 0;
    const rejections: any[] = [];

    promises.forEach((promise, index) => {
      promise.then(resolve, (error) => {
        rejections[index] = error;
        rejectionCount++;
        if (rejectionCount === promises.length) {
          const err = new Error("All promises rejected");
          (err as any).errors = rejections;
          reject(err);
        }
      });
    });
  });
}

/**
 * Waits for the first completed result (success or error) from a record of awaitables.
 * Returns [value, key] tuple indicating which completed first.
 * Throws the error if the first completion was a failure.
 *
 * @example
 * ```typescript
 * const [data, fastest] = wait.race({
 *   server1: server1Signal,
 *   server2: server2Signal,
 *   timeout: timeoutSignal
 * });
 * console.log(`Fastest: ${fastest}`);
 * ```
 */
function waitRace<const TAwaitables extends Record<string, Awaitable<unknown>>>(
  awaitables: TAwaitables
): {
  [K in keyof TAwaitables]: [
    TAwaitables[K] extends Awaitable<infer T> ? T : never,
    K
  ];
}[keyof TAwaitables];
function waitRace(awaitables: Record<string, Awaitable<unknown>>): any {
  const entries = Object.entries(awaitables);
  const loadables = entries.map(([key, awaitable]) => ({
    key,
    loadable: resolveAwaitable(awaitable),
  }));

  // Check if any completed (success or error)
  const completed = loadables.find(
    ({ loadable: l }) => l.status === "success" || l.status === "error"
  );

  if (completed) {
    if (completed.loadable.status === "error") {
      throw completed.loadable.error;
    }
    return [completed.loadable.data, completed.key];
  }

  // All still loading, throw Promise.race
  const promises = loadables.map(({ key, loadable: l }) =>
    l.promise.then(
      (data) => [data, key],
      (error) => Promise.reject(error)
    )
  );
  throw Promise.race(promises);
}

/**
 * Waits for all awaitables to settle (complete with success or error).
 * Never throws - returns PromiseSettledResult for each awaitable.
 *
 * @example
 * ```typescript
 * // Single value
 * const result = wait.settled(userSignal);
 * if (result.status === 'fulfilled') {
 *   console.log(result.value);
 * }
 *
 * // Multiple values
 * const results = wait.settled([sig1, sig2, sig3]);
 * const successes = results.filter(r => r.status === 'fulfilled');
 * ```
 */
function waitSettled<T>(awaitable: Awaitable<T>): PromiseSettledResult<T>;
function waitSettled<const TAwaitables extends readonly Awaitable<unknown>[]>(
  awaitables: TAwaitables
): {
  [K in keyof TAwaitables]: TAwaitables[K] extends Awaitable<infer T>
    ? PromiseSettledResult<T>
    : never;
};
function waitSettled(awaitableOrArray: any): any {
  // Handle single awaitable
  if (!Array.isArray(awaitableOrArray)) {
    const l = resolveAwaitable(awaitableOrArray);
    if (l.status === "loading") {
      throw l.promise.then(
        (value) => ({ status: "fulfilled" as const, value }),
        (reason) => ({ status: "rejected" as const, reason })
      );
    }
    if (l.status === "error") {
      return { status: "rejected" as const, reason: l.error };
    }
    return { status: "fulfilled" as const, value: l.data };
  }

  // Handle array of awaitables
  const loadables = awaitableOrArray.map(resolveAwaitable);

  // Check if any are loading
  const anyLoading = loadables.some((l) => l.status === "loading");
  if (anyLoading) {
    // Create Promise.allSettled equivalent
    const promises = loadables.map((l) =>
      l.status === "loading"
        ? l.promise
        : l.status === "success"
        ? Promise.resolve(l.data)
        : Promise.reject(l.error)
    );

    // Promise.allSettled polyfill
    throw Promise.all(
      promises.map((p) =>
        p.then(
          (value) => ({ status: "fulfilled" as const, value }),
          (reason) => ({ status: "rejected" as const, reason })
        )
      )
    );
  }

  // All settled, return results
  return loadables.map((l) =>
    l.status === "success"
      ? { status: "fulfilled" as const, value: l.data }
      : { status: "rejected" as const, reason: l.error }
  );
}

/**
 * Main wait function with variants for different async coordination patterns.
 *
 * - `wait()` or `wait.all()` - Wait for all (default)
 * - `wait.any()` - Wait for first success
 * - `wait.race()` - Wait for first completion
 * - `wait.settled()` - Wait for all to settle (never throws)
 *
 * @example
 * ```typescript
 * const data = signal.async(({ wait }) => {
 *   // Wait for all
 *   const [user, posts] = wait([userSig, postsSig]);
 *
 *   // First success
 *   const [data, source] = wait.any({ cache, api, backup });
 *
 *   // First complete
 *   const [result, fastest] = wait.race({ server1, server2 });
 *
 *   // All settled
 *   const results = wait.settled([sig1, sig2, sig3]);
 * });
 * ```
 */
export const wait = Object.assign(waitAll, {
  all: waitAll,
  any: waitAny,
  race: waitRace,
  settled: waitSettled,
});
