import { isPromiseLike } from "../isPromiseLike";
import { devWarn } from "./dev";

/**
 * Options for syncOnly execution validation.
 */
export type SyncOnlyOptions = {
  /**
   * Error message to show when promise is detected.
   * Should explain why async is not supported and suggest alternatives.
   */
  message: string;

  /**
   * How to handle promise detection:
   * - "error": Throw an error (strict, prevents execution)
   * - "warn": Log a dev warning (lenient, allows execution but warns)
   *
   * @default "error"
   */
  mode?: "error" | "warn";

  /**
   * Optional context prefix for the error message.
   * Will be prepended to the message: `${context}: ${message}`
   *
   * @example "batch()" → "batch(): Function cannot return a promise"
   */
  context?: string;
};

/**
 * Executes a function and validates that it doesn't return a promise.
 *
 * This utility prevents async functions from being used in contexts where
 * synchronous execution is required, such as:
 * - React rendering (blox, rx)
 * - Signal batching
 * - Computed signal evaluation
 * - Any context expecting immediate results
 *
 * **Why this matters:**
 * Async functions return promises that resolve later, breaking the synchronous
 * contract of these APIs and leading to bugs like:
 * - Incomplete rendering
 * - Batches ending before async work completes
 * - Subscriptions in inconsistent state
 * - Race conditions
 *
 * @template T - The return type of the function
 * @param fn - The function to execute synchronously
 * @param options - Configuration for error handling
 * @returns The function result (if not a promise)
 * @throws Error if result is promise-like and mode is "error"
 *
 * @example
 * ```typescript
 * // Throw error on async (default)
 * const result = syncOnly(() => computeValue(), {
 *   message: "This operation must be synchronous",
 *   context: "batch()"
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Warn in dev mode only
 * const result = syncOnly(() => operation(), {
 *   message: "This should be synchronous for best performance",
 *   mode: "warn"
 * });
 * ```
 *
 * @example
 * ```typescript
 * // With detailed error message
 * const result = syncOnly(() => builder(props), {
 *   message:
 *     "Builder function cannot return a promise. " +
 *     "Use signal.async() or handle async operations in effects.",
 *   context: "blox()",
 *   mode: "error"
 * });
 * ```
 */
export function syncOnly<T>(fn: () => T, options: SyncOnlyOptions): T {
  const result = fn();

  if (isPromiseLike(result)) {
    const fullMessage = options.context
      ? `${options.context}: ${options.message}`
      : options.message;

    if (options.mode === "warn") {
      devWarn(fullMessage);
    } else {
      throw new Error(fullMessage);
    }
  }

  return result;
}

