import { signal } from "../signal";
import type { Signal, Computed } from "../types";
import type { Operator } from "./types";
import { AUTO_NAME_PREFIX } from "../utils/nameGenerator";
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
 * @param comparer - Optional comparison function (default uses < and > operators)
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
 * const maximum = max<{ value: number }>((a, b) => a.value - b.value)(source);
 */
export function max<T>(comparer?: Comparer<T>): Operator<T> {
  const compare = comparer ?? defaultComparer;

  return (source: Signal<T>): Computed<T> => {
    let maxValue = source();

    const internal = signal(maxValue, {
      name: `${AUTO_NAME_PREFIX}max_internal(${source.displayName})`,
    });

    const result = signal({ internal }, ({ deps }) => deps.internal, {
      name: `${AUTO_NAME_PREFIX}max(${source.displayName})`,
    });

    const cleanup = emitter();

    cleanup.on(
      source.on(() => {
        if (disposed()) return;

        const value = source();
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
 * @param comparer - Optional comparison function (default uses < and > operators)
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
 * const minimum = min<{ value: number }>((a, b) => a.value - b.value)(source);
 */
export function min<T>(comparer?: Comparer<T>): Operator<T> {
  const compare = comparer ?? defaultComparer;

  return (source: Signal<T>): Computed<T> => {
    let minValue = source();

    const internal = signal(minValue, {
      name: `${AUTO_NAME_PREFIX}min_internal(${source.displayName})`,
    });

    const result = signal({ internal }, ({ deps }) => deps.internal, {
      name: `${AUTO_NAME_PREFIX}min(${source.displayName})`,
    });

    const cleanup = emitter();

    cleanup.on(
      source.on(() => {
        if (disposed()) return;

        const value = source();
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

