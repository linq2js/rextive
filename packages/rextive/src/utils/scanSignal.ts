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
 * @param equals - Optional custom equality function for accumulator
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
 * // Build statistics object
 * const stats = scanSignal(
 *   count,
 *   (acc, curr) => ({
 *     sum: acc.sum + curr,
 *     count: acc.count + 1,
 *     avg: (acc.sum + curr) / (acc.count + 1)
 *   }),
 *   { sum: 0, count: 0, avg: 0 }
 * );
 * ```
 */
export function scanSignal<T, U>(
  source: Signal<T>,
  fn: (accumulator: U, current: T) => U,
  initialValue: U,
  equals?: (a: U, b: U) => boolean
): ComputedSignal<U> {
  let acc = initialValue;
  const options: SignalOptions<U> | undefined = equals
    ? { equals }
    : undefined;

  return signal(
    { source },
    (ctx) => {
      acc = fn(acc, ctx.deps.source);
      return acc;
    },
    options
  );
}

