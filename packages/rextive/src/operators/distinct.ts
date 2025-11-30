import { signal } from "../signal";
import type { Signal, Computed } from "../types";
import type { Operator } from "./types";
import { autoPrefix } from "../utils/nameGenerator";
import { wrapDispose } from "../disposable";
import { emitter } from "../utils/emitter";

/**
 * Options for the distinct operator.
 */
export interface DistinctOptions<T, K = T> {
  /**
   * Mode of distinctness checking:
   * - "consecutive": Only emits when different from previous value (like RxJS distinctUntilChanged)
   * - "all": Only emits values never seen before (maintains a Set of all seen values)
   *
   * @default "consecutive"
   */
  mode?: "consecutive" | "all";

  /**
   * Extract a key from the value for comparison.
   * If not provided, the value itself is used as the key.
   */
  getKey?: (value: T) => K;

  /**
   * Custom equality function to compare keys.
   * Only used in "consecutive" mode.
   *
   * @default Object.is
   */
  equals?: (previous: K, current: K) => boolean;

  /**
   * Custom name for the output signal.
   */
  name?: string;
}

/**
 * Filters out duplicate values from a signal.
 *
 * Two modes are available:
 * - `"consecutive"` (default): Only emits when the current value is different from the previous value.
 *   Similar to RxJS's `distinctUntilChanged`.
 * - `"all"`: Only emits values that have never been emitted before. Maintains a Set of seen values.
 *   Note: This can cause memory growth for long-running signals with many unique values.
 *
 * @param options - Configuration options
 * @returns An operator function
 *
 * @example Basic consecutive (default)
 * ```ts
 * const source = signal(1);
 * const unique = distinct<number>()(source);
 *
 * source.set(1); // No emit (same as previous)
 * source.set(2); // Emits 2
 * source.set(2); // No emit (same as previous)
 * source.set(1); // Emits 1 (different from previous)
 * ```
 *
 * @example All-time unique
 * ```ts
 * const source = signal(1);
 * const unique = distinct<number>({ mode: "all" })(source);
 *
 * source.set(2); // Emits 2 (new)
 * source.set(1); // No emit (seen before - initial value)
 * source.set(3); // Emits 3 (new)
 * source.set(2); // No emit (seen before)
 * ```
 *
 * @example With key selector
 * ```ts
 * const source = signal({ id: 1, name: "Alice" });
 * const unique = distinct<User>({ getKey: u => u.id })(source);
 *
 * source.set({ id: 1, name: "Bob" });  // No emit (same id)
 * source.set({ id: 2, name: "Carol" }); // Emits (new id)
 * ```
 *
 * @example With custom equality
 * ```ts
 * const source = signal({ id: 1, name: "Alice" });
 * const unique = distinct<User>({
 *   equals: (a, b) => a.id === b.id
 * })(source);
 * ```
 *
 * @example With custom name
 * ```ts
 * const unique = distinct<number>({ name: "uniqueValues" })(source);
 * // Signal name: "#uniqueValues-1"
 * ```
 */
export function distinct<T, K = T>(
  options: DistinctOptions<T, K> = {}
): Operator<T> {
  const { mode = "consecutive", getKey, equals, name } = options;

  if (mode === "all") {
    return createDistinctAll<T, K>(getKey, name);
  }

  return createDistinctConsecutive<T, K>(getKey, equals, name);
}

/**
 * Creates a distinct operator for "consecutive" mode (distinctUntilChanged behavior).
 */
function createDistinctConsecutive<T, K>(
  getKey?: (value: T) => K,
  equals?: (previous: K, current: K) => boolean,
  name?: string
): Operator<T> {
  const compare = equals ?? ((a: K, b: K) => Object.is(a, b));

  return (source: Signal<T>): Computed<T> => {
    const initialValue = source();
    let previousKey: K = getKey
      ? getKey(initialValue)
      : (initialValue as unknown as K);

    const baseName = name ?? `distinct(${source.displayName})`;

    const internal = signal(initialValue, {
      name: autoPrefix(`${baseName}_internal`),
    });

    const result = signal({ internal }, ({ deps }) => deps.internal, {
      name: autoPrefix(baseName),
    });

    const cleanup = emitter();

    cleanup.on(
      source.on(() => {
        if (disposed()) return;

        const currentValue = source();
        const currentKey: K = getKey
          ? getKey(currentValue)
          : (currentValue as unknown as K);

        const isDifferent = !compare(previousKey, currentKey);

        if (isDifferent) {
          previousKey = currentKey;
          internal.set(currentValue);
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
 * Creates a distinct operator for "all" mode (all-time unique values).
 */
function createDistinctAll<T, K>(
  getKey?: (value: T) => K,
  name?: string
): Operator<T> {
  return (source: Signal<T>): Computed<T> => {
    const initialValue = source();
    const seen = new Set<K | T>();

    // Add initial value to seen set
    const initialKey = getKey ? getKey(initialValue) : initialValue;
    seen.add(initialKey as K | T);

    const baseName = name ?? `distinct.all(${source.displayName})`;

    const internal = signal(initialValue, {
      name: autoPrefix(`${baseName}_internal`),
    });

    const result = signal({ internal }, ({ deps }) => deps.internal, {
      name: autoPrefix(baseName),
    });

    const cleanup = emitter();

    cleanup.on(
      source.on(() => {
        if (disposed()) return;

        const currentValue = source();
        const key = getKey ? getKey(currentValue) : currentValue;

        if (!seen.has(key as K | T)) {
          seen.add(key as K | T);
          internal.set(currentValue);
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
