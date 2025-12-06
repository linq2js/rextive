/**
 * Creates a function that is restricted to invoking `fn` once.
 * Repeat calls return the value of the first invocation.
 *
 * @param fn - The function to restrict
 * @returns A new function that only invokes `fn` once
 *
 * @example
 * ```ts
 * const initialize = once(() => {
 *   console.log("Initialized!");
 *   return { ready: true };
 * });
 *
 * initialize(); // logs "Initialized!", returns { ready: true }
 * initialize(); // returns { ready: true } (no log)
 * initialize(); // returns { ready: true } (no log)
 * ```
 */
export function once<T extends (...args: any[]) => any>(fn: T): T {
  let called = false;
  let result: ReturnType<T>;
  return ((...args: Parameters<T>) => {
    if (!called) {
      called = true;
      result = fn(...args);
    }
    return result;
  }) as T;
}

