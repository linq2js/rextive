import { signal } from "../signal";
import type { Signal, Computed } from "../types";
import type { Operator } from "./types";
import { autoPrefix } from "../utils/nameGenerator";
import { wrapDispose } from "../disposable";
import { emitter } from "../utils/emitter";

/**
 * Takes only the first `count` emissions from the source signal.
 * After `count` emissions, the derived signal stops updating.
 *
 * @param count - The maximum number of emissions to take
 * @returns An operator function
 *
 * @example
 * const source = signal(0);
 * const first3 = take(3)(source);
 *
 * source.set(1); // first3 = 1
 * source.set(2); // first3 = 2
 * source.set(3); // first3 = 3
 * source.set(4); // first3 = 3 (stopped)
 */
export function take<T>(count: number): Operator<T> {
  return (source: Signal<T>): Computed<T> => {
    const internal = signal(source(), {
      name: autoPrefix(`take_internal(${source.displayName})`),
    });

    const result = signal({ internal }, ({ deps }) => deps.internal, {
      name: autoPrefix(`take(${source.displayName})`),
    });

    let emissions = 0;
    const cleanup = emitter();

    cleanup.on(
      source.on(() => {
        if (disposed() || emissions >= count) return;
        emissions++;
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
 * Options for takeWhile operator.
 */
export interface TakeWhileOptions {
  /**
   * If true, includes the value that caused the predicate to return false.
   * @default false
   */
  inclusive?: boolean;
}

/**
 * Takes emissions while the predicate returns true.
 * Once the predicate returns false, the derived signal stops updating.
 *
 * @param predicate - Function to test each value (receives value and index)
 * @param options - Configuration options
 * @returns An operator function
 *
 * @example
 * const source = signal(0);
 * const underFive = takeWhile<number>(x => x < 5)(source);
 *
 * source.set(3); // underFive = 3
 * source.set(5); // underFive = 3 (stopped, predicate failed)
 *
 * @example
 * // With inclusive option
 * const inclusive = takeWhile<number>(x => x < 5, { inclusive: true })(source);
 * source.set(5); // inclusive = 5 (includes failing value)
 */
export function takeWhile<T>(
  predicate: (value: T, index: number) => boolean,
  options?: TakeWhileOptions
): Operator<T> {
  const { inclusive = false } = options ?? {};

  return (source: Signal<T>): Computed<T> => {
    const internal = signal(source(), {
      name: autoPrefix(`takeWhile_internal(${source.displayName})`),
    });

    const result = signal({ internal }, ({ deps }) => deps.internal, {
      name: autoPrefix(`takeWhile(${source.displayName})`),
    });

    let index = 0;
    let stopped = false;
    const cleanup = emitter();

    cleanup.on(
      source.on(() => {
        if (disposed() || stopped) return;

        const value = source();
        const passes = predicate(value, index);
        index++;

        if (passes) {
          internal.set(value);
        } else {
          stopped = true;
          if (inclusive) {
            internal.set(value);
          }
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
 * Keeps track of the last `count` values from the source signal.
 * Returns an array of the most recent values.
 *
 * @param count - The number of values to keep
 * @returns An operator function that returns an array of the last N values
 *
 * @example
 * const source = signal(0);
 * const last3 = takeLast<number>(3)(source);
 *
 * source.set(1); // last3 = [0, 1]
 * source.set(2); // last3 = [0, 1, 2]
 * source.set(3); // last3 = [1, 2, 3]
 * source.set(4); // last3 = [2, 3, 4]
 */
export function takeLast<T>(
  count: number
): (source: Signal<T>) => Computed<T[]> {
  return (source: Signal<T>): Computed<T[]> => {
    const buffer: T[] = [source()];

    const internal = signal<T[]>([...buffer], {
      name: autoPrefix(`takeLast_internal(${source.displayName})`),
      equals: "shallow",
    });

    const result = signal({ internal }, ({ deps }) => deps.internal, {
      name: autoPrefix(`takeLast(${source.displayName})`),
    });

    const cleanup = emitter();

    cleanup.on(
      source.on(() => {
        if (disposed()) return;

        buffer.push(source());
        if (buffer.length > count) {
          buffer.shift();
        }
        internal.set([...buffer]);
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
 * Takes emissions until a notifier signal (or any signal in an array) emits.
 * Once any notifier changes, the derived signal stops updating.
 *
 * @param notifier - A signal or array of signals that trigger completion
 * @returns An operator function
 *
 * @example
 * const source = signal(0);
 * const stop = signal(false);
 * const taken = takeUntil(stop)(source);
 *
 * source.set(1); // taken = 1
 * stop.set(true); // Triggers stop
 * source.set(2); // taken = 1 (stopped)
 *
 * @example
 * // With multiple notifiers
 * const cancel = signal(false);
 * const timeout = signal(false);
 * const taken = takeUntil([cancel, timeout])(source);
 * // Stops when either cancel or timeout changes
 */
export function takeUntil<T>(
  notifier: Signal<unknown> | Signal<unknown>[]
): Operator<T> {
  const notifiers = Array.isArray(notifier) ? notifier : [notifier];

  return (source: Signal<T>): Computed<T> => {
    const internal = signal(source(), {
      name: autoPrefix(`takeUntil_internal(${source.displayName})`),
    });

    const result = signal({ internal }, ({ deps }) => deps.internal, {
      name: autoPrefix(`takeUntil(${source.displayName})`),
    });

    let stopped = false;
    const cleanup = emitter();

    // Subscribe to source
    cleanup.on(
      source.on(() => {
        if (disposed() || stopped) return;
        internal.set(source());
      })
    );

    // Subscribe to notifiers
    for (const n of notifiers) {
      cleanup.on(
        n.on(() => {
          if (disposed()) return;
          stopped = true;
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
