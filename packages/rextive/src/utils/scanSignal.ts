import { Signal, ComputedSignal, SignalOptions } from "../types";
import { signal } from "../signal";

/**
 * Accumulate values with state (stateful operation)
 * 
 * Creates a new computed signal that maintains an accumulator value,
 * similar to Array.reduce(). The accumulator is updated on each
 * source signal change.
 * 
 * @param source - Source signal to accumulate
 * @param fn - Accumulator function (accumulator: U, current: T) => U
 * @param initialValue - Initial accumulator value (determines output type)
 * @param equalsOrOptions - Optional custom equality function or full options object
 * @returns New computed signal with accumulated values
 * 
 * @example
 * ```ts
 * const count = signal(0);
 * 
 * // Running total
 * const total = scanSignal(count, (sum, curr) => sum + curr, 0);
 * 
 * // Delta from previous
 * const delta = scanSignal(count, (prev, curr) => curr - prev, 0);
 * 
 * // Keep last N values
 * const last5 = scanSignal(
 *   count,
 *   (acc, curr) => [...acc, curr].slice(-5),
 *   [] as number[]
 * );
 * 
 * // With custom equals function
 * const stats = scanSignal(
 *   count,
 *   (acc, curr) => ({ sum: acc.sum + curr, count: acc.count + 1 }),
 *   { sum: 0, count: 0 },
 *   (a, b) => a.sum === b.sum
 * );
 *
 * // With full options
 * const stats = scanSignal(
 *   count,
 *   (acc, curr) => ({ sum: acc.sum + curr, count: acc.count + 1 }),
 *   { sum: 0, count: 0 },
 *   { equals: shallowEquals, name: 'stats' }
 * );
 * ```
 */
export function scanSignal<T, U>(
  source: Signal<T>,
  fn: (accumulator: U, current: T) => U,
  initialValue: U,
  equalsOrOptions?: "is" | "shallow" | "deep" | ((a: U, b: U) => boolean) | SignalOptions<U>
): ComputedSignal<U> {
  let acc = initialValue;
  // If it's a function or string, treat it as equals; otherwise use as-is
  const options: SignalOptions<U> | undefined =
    typeof equalsOrOptions === "function" || typeof equalsOrOptions === "string"
      ? { equals: equalsOrOptions }
      : equalsOrOptions;

  return signal(
    { source },
    (ctx) => {
      acc = fn(acc, ctx.deps.source);
      return acc;
    },
    options
  );
}

