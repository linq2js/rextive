import { signal } from "../signal";
import type { Signal, Computed } from "../types";
import type { Operator } from "./types";
import { autoPrefix } from "../utils/nameGenerator";
import { wrapDispose } from "../disposable";
import { emitter } from "../utils/emitter";

/**
 * Only emits when the current value is different from the previous value.
 * Similar to RxJS's distinctUntilChanged.
 *
 * @param comparer - Optional function to compare two values (default: Object.is)
 * @param keySelector - Optional function to select a key for comparison
 * @returns An operator function
 *
 * @example
 * const source = signal(1);
 * const distinct = distinctUntilChanged<number>()(source);
 *
 * source.set(1); // No emit (same as previous)
 * source.set(2); // Emits 2
 * source.set(2); // No emit (same as previous)
 * source.set(1); // Emits 1
 *
 * @example
 * // With custom comparer
 * const distinct = distinctUntilChanged<User>((a, b) => a.id === b.id)(source);
 *
 * @example
 * // With key selector
 * const distinct = distinctUntilChanged<User>(undefined, u => u.id)(source);
 */
export function distinctUntilChanged<T, K = T>(
  comparer?: (previous: T, current: T) => boolean,
  keySelector?: (value: T) => K
): Operator<T> {
  const compare = comparer ?? ((a: T, b: T) => Object.is(a, b));

  return (source: Signal<T>): Computed<T> => {
    let previousValue = source();
    let previousKey: K | undefined = keySelector
      ? keySelector(previousValue)
      : undefined;

    const internal = signal(previousValue, {
      name: autoPrefix(`distinctUntilChanged_internal(${source.displayName})`),
    });

    const result = signal({ internal }, ({ deps }) => deps.internal, {
      name: autoPrefix(`distinctUntilChanged(${source.displayName})`),
    });

    const cleanup = emitter();

    cleanup.on(
      source.on(() => {
        if (disposed()) return;

        const currentValue = source();

        let isDifferent: boolean;

        if (keySelector) {
          const currentKey = keySelector(currentValue);
          isDifferent = !Object.is(previousKey, currentKey);
          previousKey = currentKey;
        } else {
          isDifferent = !compare(previousValue, currentValue);
        }

        if (isDifferent) {
          previousValue = currentValue;
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
 * Only emits values that have never been emitted before (all-time unique).
 * Maintains a Set of seen values or keys.
 *
 * Note: This can cause memory growth for long-running signals with many unique values.
 *
 * @param keySelector - Optional function to select a key for uniqueness check
 * @returns An operator function
 *
 * @example
 * const source = signal(1);
 * const unique = distinct<number>()(source);
 *
 * source.set(2); // Emits 2 (new)
 * source.set(1); // No emit (seen before - initial value)
 * source.set(3); // Emits 3 (new)
 * source.set(2); // No emit (seen before)
 *
 * @example
 * // With key selector for objects
 * const unique = distinct<User>(u => u.id)(source);
 */
export function distinct<T, K = T>(
  keySelector?: (value: T) => K
): Operator<T> {
  return (source: Signal<T>): Computed<T> => {
    const initialValue = source();
    const seen = new Set<K | T>();

    // Add initial value to seen set
    const initialKey = keySelector ? keySelector(initialValue) : initialValue;
    seen.add(initialKey);

    const internal = signal(initialValue, {
      name: autoPrefix(`distinct_internal(${source.displayName})`),
    });

    const result = signal({ internal }, ({ deps }) => deps.internal, {
      name: autoPrefix(`distinct(${source.displayName})`),
    });

    const cleanup = emitter();

    cleanup.on(
      source.on(() => {
        if (disposed()) return;

        const currentValue = source();
        const key = keySelector ? keySelector(currentValue) : currentValue;

        if (!seen.has(key)) {
          seen.add(key);
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

