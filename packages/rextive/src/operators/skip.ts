import { signal } from "../signal";
import type { Signal, Computed } from "../types";
import type { Operator } from "./types";
import { autoPrefix } from "../utils/nameGenerator";
import { wrapDispose } from "../disposable";
import { emitter } from "../utils/emitter";

/**
 * Skips the first `count` emissions from the source signal.
 * After `count` emissions are skipped, all subsequent values pass through.
 *
 * @param count - The number of emissions to skip
 * @returns An operator function
 *
 * @example
 * const source = signal(0);
 * const skipped = skip(2)(source);
 *
 * source.set(1); // Skipped
 * source.set(2); // Skipped
 * source.set(3); // skipped = 3
 * source.set(4); // skipped = 4
 */
export function skip<T>(count: number): Operator<T> {
  return (source: Signal<T>): Computed<T> => {
    const internal = signal(source(), {
      name: autoPrefix(`skip_internal(${source.displayName})`),
    });

    const result = signal({ internal }, ({ deps }) => deps.internal, {
      name: autoPrefix(`skip(${source.displayName})`),
    });

    let skipped = 0;
    const cleanup = emitter();

    cleanup.on(
      source.on(() => {
        if (disposed()) return;
        if (skipped < count) {
          skipped++;
          return;
        }
        internal.set(source());
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
 * Skips emissions while the predicate returns true.
 * Once the predicate returns false, all subsequent values pass through.
 *
 * @param predicate - Function to test each value (receives value and index)
 * @returns An operator function
 *
 * @example
 * const source = signal(0);
 * const skipped = skipWhile<number>(x => x < 3)(source);
 *
 * source.set(1); // Skipped (1 < 3)
 * source.set(2); // Skipped (2 < 3)
 * source.set(3); // skipped = 3 (3 >= 3, stop skipping)
 * source.set(1); // skipped = 1 (no longer skipping)
 */
export function skipWhile<T>(
  predicate: (value: T, index: number) => boolean
): Operator<T> {
  return (source: Signal<T>): Computed<T> => {
    const internal = signal(source(), {
      name: autoPrefix(`skipWhile_internal(${source.displayName})`),
    });

    const result = signal({ internal }, ({ deps }) => deps.internal, {
      name: autoPrefix(`skipWhile(${source.displayName})`),
    });

    let index = 0;
    let skipping = true;
    const cleanup = emitter();

    cleanup.on(
      source.on(() => {
        if (disposed()) return;

        const value = source();

        if (skipping) {
          if (predicate(value, index)) {
            index++;
            return;
          }
          skipping = false;
        }

        internal.set(value);
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
 * Skips the last `count` values from the source signal.
 * Maintains a buffer and only emits values that have "aged out" of the buffer.
 *
 * @param count - The number of values to skip from the end
 * @returns An operator function that may return undefined until enough values arrive
 *
 * @example
 * const source = signal(0);
 * const skipped = skipLast<number>(2)(source);
 *
 * // skipped = undefined (buffer: [0])
 * source.set(1); // skipped = undefined (buffer: [0, 1])
 * source.set(2); // skipped = 0 (buffer: [1, 2])
 * source.set(3); // skipped = 1 (buffer: [2, 3])
 */
export function skipLast<T>(
  count: number
): (source: Signal<T>) => Computed<T | undefined> {
  return (source: Signal<T>): Computed<T | undefined> => {
    if (count === 0) {
      // Special case: skip nothing, just pass through
      const internal = signal<T | undefined>(source(), {
        name: autoPrefix(`skipLast_internal(${source.displayName})`),
      });

      const result = signal({ internal }, ({ deps }) => deps.internal, {
        name: autoPrefix(`skipLast(${source.displayName})`),
      });

      const cleanup = emitter();

      cleanup.on(
        source.on(() => {
          if (disposed()) return;
          internal.set(source());
        })
      );

      const disposed = wrapDispose(
        result,
        [cleanup.emitAndClear, internal],
        "after"
      );

      return result;
    }

    const buffer: T[] = [source()];

    const internal = signal<T | undefined>(undefined, {
      name: autoPrefix(`skipLast_internal(${source.displayName})`),
    });

    const result = signal({ internal }, ({ deps }) => deps.internal, {
      name: autoPrefix(`skipLast(${source.displayName})`),
    });

    const cleanup = emitter();

    cleanup.on(
      source.on(() => {
        if (disposed()) return;

        buffer.push(source());

        if (buffer.length > count) {
          const emitValue = buffer.shift()!;
          internal.set(emitValue);
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
 * Skips emissions until a notifier signal (or any signal in an array) emits.
 * Once any notifier changes, all subsequent source values pass through.
 *
 * @param notifier - A signal or array of signals that trigger the start of emissions
 * @returns An operator function
 *
 * @example
 * const source = signal(0);
 * const start = signal(false);
 * const skipped = skipUntil(start)(source);
 *
 * source.set(1); // Skipped
 * source.set(2); // Skipped
 * start.set(true); // Start emitting
 * source.set(3); // skipped = 3
 *
 * @example
 * // With multiple notifiers
 * const ready = signal(false);
 * const timeout = signal(false);
 * const skipped = skipUntil([ready, timeout])(source);
 * // Starts emitting when either ready or timeout changes
 */
export function skipUntil<T>(
  notifier: Signal<unknown> | Signal<unknown>[]
): Operator<T> {
  const notifiers = Array.isArray(notifier) ? notifier : [notifier];

  return (source: Signal<T>): Computed<T> => {
    const internal = signal(source(), {
      name: autoPrefix(`skipUntil_internal(${source.displayName})`),
    });

    const result = signal({ internal }, ({ deps }) => deps.internal, {
      name: autoPrefix(`skipUntil(${source.displayName})`),
    });

    let skipping = true;
    const cleanup = emitter();

    // Subscribe to source
    cleanup.on(
      source.on(() => {
        if (disposed() || skipping) return;
        internal.set(source());
      })
    );

    // Subscribe to notifiers
    for (const n of notifiers) {
      cleanup.on(
        n.on(() => {
          if (disposed()) return;
          skipping = false;
        })
      );
    }

    const disposed = wrapDispose(
      result,
      [cleanup.emitAndClear, internal],
      "after"
    );

    return result;
  };
}
