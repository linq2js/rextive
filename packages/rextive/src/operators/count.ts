import { signal } from "../signal";
import type { Signal, Computed } from "../types";
import type { OperatorNameOptions } from "./types";
import { autoPrefix } from "../utils/nameGenerator";
import { wrapDispose } from "../disposable";
import { emitter } from "../utils/emitter";

/**
 * Options for count operator.
 */
export interface CountOptions extends OperatorNameOptions {
  /**
   * Optional predicate to filter which values to count.
   */
  predicate?: (value: any, index: number) => boolean;
}

/**
 * Counts the number of emissions from the source signal.
 * Optionally, only counts emissions that satisfy a predicate.
 *
 * @param options - Optional configuration with predicate and name
 * @returns An operator function that returns a Computed<number>
 *
 * @example
 * const source = signal(0);
 * const total = count<number>()(source);
 *
 * source.set(1); // total = 1
 * source.set(2); // total = 2
 * source.set(3); // total = 3
 *
 * @example
 * // Count only even numbers
 * const evenCount = count<number>({ predicate: x => x % 2 === 0 })(source);
 *
 * source.set(1); // evenCount = 0 (odd)
 * source.set(2); // evenCount = 1 (even)
 * source.set(3); // evenCount = 1 (odd)
 * source.set(4); // evenCount = 2 (even)
 */
export function count<T>(
  options: CountOptions = {}
): (source: Signal<T>) => Computed<number> {
  const { predicate, name } = options;

  return (source: Signal<T>): Computed<number> => {
    const baseName = name ?? `count(${source.displayName})`;

    const internal = signal(0, {
      name: autoPrefix(`${baseName}_internal`),
    });

    const result = signal({ internal }, ({ deps }) => deps.internal, {
      name: autoPrefix(baseName),
    });

    let index = 0;
    const cleanup = emitter();

    cleanup.on(
      source.on(() => {
        if (disposed()) return;

        const value = source();
        const shouldCount = predicate ? predicate(value, index) : true;
        index++;

        if (shouldCount) {
          internal.set((prev) => prev + 1);
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
