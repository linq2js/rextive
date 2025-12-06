import { signal } from "../signal";
import type { Signal, Computed } from "../types";
import type { Operator, OperatorNameOptions } from "./types";
import { autoPrefix } from "../utils/nameGenerator";
import { wrapDispose } from "../disposable";
import { emitter } from "../utils/emitter";

/**
 * Comparer function for comparing two values.
 * Should return:
 * - negative if a < b
 * - zero if a === b
 * - positive if a > b
 */
export type Comparer<T> = (a: T, b: T) => number;

/**
 * Options for min/max operators.
 */
export interface MinMaxOptions<T> extends OperatorNameOptions {
  /**
   * Custom comparison function.
   * Should return negative if a < b, zero if a === b, positive if a > b.
   */
  comparer?: Comparer<T>;
}

/**
 * Default comparer that works for numbers, strings, and other comparable types.
 */
const defaultComparer = <T>(a: T, b: T): number => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

/**
 * Emits the maximum value seen so far from the source signal.
 * Updates whenever a new maximum is found.
 *
 * @param options - Optional configuration with comparer and name
 * @returns An operator function
 *
 * @example
 * const source = signal(5);
 * const maximum = max<number>()(source);
 *
 * source.set(3);  // maximum = 5 (still the max)
 * source.set(7);  // maximum = 7 (new max)
 * source.set(6);  // maximum = 7 (still the max)
 *
 * @example
 * // With custom comparer for objects
 * const source = signal({ value: 5 });
 * const maximum = max<{ value: number }>({ comparer: (a, b) => a.value - b.value })(source);
 */
export function max<T>(options: MinMaxOptions<T> = {}): Operator<T> {
  const { comparer, name } = options;
  const compare = comparer ?? defaultComparer;

  return (source: Signal<T>): Computed<T> => {
    const baseName = name ?? `max(${source.displayName})`;
    // Use peek() to avoid triggering render tracking
    let maxValue = source.peek();

    const internal = signal(maxValue, {
      name: autoPrefix(`${baseName}_internal`),
    });

    const result = signal({ internal }, ({ deps }) => deps.internal, {
      name: autoPrefix(baseName),
    });

    const cleanup = emitter();

    cleanup.on(
      source.on(() => {
        if (disposed()) return;

        // Use peek() to avoid triggering render tracking
        const value = source.peek();
        if (compare(value, maxValue) > 0) {
          maxValue = value;
          internal.set(maxValue);
        }
      })
    );

    const disposed = wrapDispose(
      result,
      [cleanup.emitAndClear, internal],
      "after"
    );

    return result;
  };
}

/**
 * Emits the minimum value seen so far from the source signal.
 * Updates whenever a new minimum is found.
 *
 * @param options - Optional configuration with comparer and name
 * @returns An operator function
 *
 * @example
 * const source = signal(5);
 * const minimum = min<number>()(source);
 *
 * source.set(7);  // minimum = 5 (still the min)
 * source.set(3);  // minimum = 3 (new min)
 * source.set(4);  // minimum = 3 (still the min)
 *
 * @example
 * // With custom comparer for objects
 * const source = signal({ value: 5 });
 * const minimum = min<{ value: number }>({ comparer: (a, b) => a.value - b.value })(source);
 */
export function min<T>(options: MinMaxOptions<T> = {}): Operator<T> {
  const { comparer, name } = options;
  const compare = comparer ?? defaultComparer;

  return (source: Signal<T>): Computed<T> => {
    const baseName = name ?? `min(${source.displayName})`;
    // Use peek() to avoid triggering render tracking
    let minValue = source.peek();

    const internal = signal(minValue, {
      name: autoPrefix(`${baseName}_internal`),
    });

    const result = signal({ internal }, ({ deps }) => deps.internal, {
      name: autoPrefix(baseName),
    });

    const cleanup = emitter();

    cleanup.on(
      source.on(() => {
        if (disposed()) return;

        // Use peek() to avoid triggering render tracking
        const value = source.peek();
        if (compare(value, minValue) < 0) {
          minValue = value;
          internal.set(minValue);
        }
      })
    );

    const disposed = wrapDispose(
      result,
      [cleanup.emitAndClear, internal],
      "after"
    );

    return result;
  };
}

