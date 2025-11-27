/**
 * Execute a function and ensure the result is a Promise.
 *
 * Similar to the TC39 `Promise.try` proposal, this utility:
 * 1. Executes the function
 * 2. If it throws sync error → returns rejected promise
 * 3. If it returns sync value → returns resolved promise
 * 4. If it returns promise → returns that promise
 *
 * This is useful for normalizing sync/async factory functions
 * and handling sync errors gracefully.
 *
 * @example
 * ```ts
 * // Sync value → resolved promise
 * await promiseTry(() => 42); // Promise<42>
 *
 * // Sync error → rejected promise
 * await promiseTry(() => { throw new Error("sync"); }); // rejects
 *
 * // Async value → passthrough
 * await promiseTry(() => Promise.resolve(42)); // Promise<42>
 *
 * // Async error → passthrough
 * await promiseTry(() => Promise.reject(new Error("async"))); // rejects
 * ```
 *
 * @param fn - Function to execute (can return sync value, promise, or throw)
 * @returns Always returns a Promise
 */
export function promiseTry<T>(fn: () => T | Promise<T>): Promise<T> {
  try {
    // Execute function and normalize result to Promise
    // Promise.resolve handles both sync values and promises correctly
    return Promise.resolve(fn());
  } catch (error) {
    // Convert sync errors to rejected promise
    return Promise.reject(error);
  }
}

