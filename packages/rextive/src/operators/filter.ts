/**
 * Filter operator - Filter signal values based on a predicate
 */

import type {
  Signal,
  ComputedSignal,
  SignalOptions,
  PredefinedEquals,
} from "../types";
import { signal } from "../signal";

/**
 * Filter signal values based on a predicate
 *
 * Creates a new computed signal that only emits values that pass the predicate test.
 * If the predicate returns false, the signal keeps its previous value.
 *
 * **Note:** The first value is always emitted, regardless of the predicate.
 * Subsequent values are filtered.
 *
 * @param predicate - Function to test each value
 * @param equalsOrOptions - Optional equality strategy or options
 * @returns Operator function that transforms a signal
 *
 * @example
 * ```ts
 * import { filter } from "rextive/op";
 *
 * const count = signal(1);
 * const evenOnly = count.to(filter(x => x % 2 === 0));
 *
 * count.set(2); // evenOnly() === 2
 * count.set(3); // evenOnly() === 2 (unchanged)
 * count.set(4); // evenOnly() === 4
 * ```
 *
 * @example With type narrowing
 * ```ts
 * const value = signal<string | number>(1);
 * const numbersOnly = value.to(
 *   filter((x): x is number => typeof x === 'number')
 * );
 * // Type: ComputedSignal<number>
 * ```
 */
export function filter<T, S extends T>(
  predicate: (value: T) => value is S,
  equalsOrOptions?: PredefinedEquals | SignalOptions<S>
): (source: Signal<T>) => ComputedSignal<S>;
export function filter<T>(
  predicate: (value: T) => boolean,
  equalsOrOptions?: PredefinedEquals | SignalOptions<T>
): (source: Signal<T>) => ComputedSignal<T>;
export function filter<T>(
  predicate: (value: T) => boolean,
  equalsOrOptions?: PredefinedEquals | SignalOptions<T>
): (source: Signal<T>) => ComputedSignal<T> {
  return (source: Signal<T>) => {
    let lastValidValue: T;
    let isFirst = true;

    const options: SignalOptions<T> | undefined =
      typeof equalsOrOptions === "string"
        ? { equals: equalsOrOptions }
        : equalsOrOptions;

    return signal(
      { source },
      (ctx: any) => {
        const currentValue = ctx.deps.source;

        // Always emit first value
        if (isFirst) {
          isFirst = false;
          lastValidValue = currentValue;
          return currentValue;
        }

        // Filter subsequent values
        if (predicate(currentValue)) {
          lastValidValue = currentValue;
          return currentValue;
        }

        return lastValidValue;
      },
      options
    );
  };
}
