/**
 * signal.from() - Combine multiple signals into a single computed signal
 *
 * Two overloads:
 * 1. signal.from({ a, b, c }) -> Computed<{ a: A, b: B, c: C }>
 * 2. signal.from([a, b, c]) -> Computed<[A, B, C]>
 */

import type {
  Signal,
  Computed,
  SignalMap,
  ComputedSignalContext,
} from "./types";
import { signal } from "./signal";

// =============================================================================
// Types for extracting values from signals
// =============================================================================

/**
 * Extract the value type from a Signal
 */
type SignalValue<T> = T extends Signal<infer V> ? V : never;

/**
 * Map a record of signals to a record of their values
 */
type SignalRecordValues<T extends Record<string, Signal<any>>> = {
  [K in keyof T]: SignalValue<T[K]>;
};

/**
 * Map a tuple of signals to a tuple of their values
 */
type SignalTupleValues<T extends readonly Signal<any>[]> = {
  [K in keyof T]: SignalValue<T[K]>;
};

// =============================================================================
// Overloads
// =============================================================================

/**
 * Combine a record of signals into a single computed signal
 *
 * @param signals - Record of signals { key: Signal<Value> }
 * @returns Computed signal containing record of values { key: Value }
 *
 * @example
 * ```ts
 * const name = signal("Alice");
 * const age = signal(30);
 *
 * const user = signal.from({ name, age });
 * console.log(user()); // { name: "Alice", age: 30 }
 *
 * name.set("Bob");
 * console.log(user()); // { name: "Bob", age: 30 }
 * ```
 */
export function signalFrom<T extends Record<string, Signal<any>>>(
  signals: T
): Computed<SignalRecordValues<T>>;

/**
 * Combine a tuple of signals into a single computed signal
 *
 * @param signals - Tuple/array of signals [Signal<A>, Signal<B>, ...]
 * @returns Computed signal containing tuple of values [A, B, ...]
 *
 * @example
 * ```ts
 * const x = signal(10);
 * const y = signal(20);
 *
 * const coords = signal.from([x, y]);
 * console.log(coords()); // [10, 20]
 *
 * x.set(100);
 * console.log(coords()); // [100, 20]
 * ```
 */
export function signalFrom<const T extends readonly Signal<any>[]>(
  signals: T
): Computed<SignalTupleValues<T>>;

// =============================================================================
// Implementation
// =============================================================================

export function signalFrom(
  signals: Record<string, Signal<any>> | readonly Signal<any>[]
): Computed<any> {
  // Tuple overload: signal.from([a, b, c])
  if (Array.isArray(signals)) {
    // Handle empty array
    if (signals.length === 0) {
      return signal({} as SignalMap, () => [] as any) as Computed<any>;
    }

    // Convert array to numbered dependencies object
    const deps: SignalMap = {};
    for (let i = 0; i < signals.length; i++) {
      deps[i] = signals[i] as SignalMap[string];
    }

    return signal(deps, ({ deps: d }: ComputedSignalContext<SignalMap>) => {
      const result: any[] = [];
      for (let i = 0; i < signals.length; i++) {
        result.push(d[i]);
      }
      return result;
    }) as Computed<any>;
  }

  // Record overload: signal.from({ a, b, c })
  // Handle empty object
  if (Object.keys(signals).length === 0) {
    return signal({} as SignalMap, () => ({} as any)) as Computed<any>;
  }

  return signal(
    signals as SignalMap,
    ({ deps }: ComputedSignalContext<SignalMap>) => {
      const result: Record<string, any> = {};
      for (const key in deps) {
        result[key] = deps[key];
      }
      return result;
    }
  ) as Computed<any>;
}
