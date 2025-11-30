/**
 * Scan operator - Accumulate signal values with state
 */

import type {
  Signal,
  Computed,
  SignalOptions,
  EqualsOrOptions,
} from "../types";
import { signal } from "../signal";
import { autoPrefix } from "../utils/nameGenerator";

/**
 * Accumulate signal values with state
 *
 * Creates a new computed signal that maintains an accumulator value,
 * similar to Array.reduce(). The accumulator is updated on each
 * source signal change.
 *
 * @param fn - Accumulator function
 * @param initialValue - Initial accumulator value
 * @param equalsOrOptions - Optional equality strategy or options
 * @returns Operator function that transforms a signal
 *
 * @example
 * ```ts
 * import { scan } from "rextive/op";
 *
 * const count = signal(1);
 * const sum = count.to(scan((acc, curr) => acc + curr, 0));
 *
 * count.set(2); // sum() === 3
 * count.set(3); // sum() === 6
 * ```
 */
export function scan<T, U>(
  fn: (accumulator: U, current: T) => U,
  initialValue: U,
  equalsOrOptions?: EqualsOrOptions<U>
): (source: Signal<T>) => Computed<U> {
  return (source: Signal<T>) => {
    let acc = initialValue;
    const options: SignalOptions<U> | undefined =
      typeof equalsOrOptions === "string"
        ? { equals: equalsOrOptions }
        : equalsOrOptions;

    const baseName = options?.name ?? `scan(${source.displayName})`;

    return signal(
      { source: source as any },
      (ctx: any) => {
        acc = fn(acc, ctx.deps.source);
        return acc;
      },
      {
        ...options,
        name: autoPrefix(baseName),
      }
    );
  };
}
