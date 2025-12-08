import { AnyFunc, EqualsFn, EqualsStrategy } from "../types";
import { resolveEquals } from "./resolveEquals";

/**
 * Symbol used to identify wrapped state functions.
 * @internal
 */
const STATE_FUNCTION_SYMBOL = Symbol("stateFunction");

/**
 * A wrapped function that maintains a stable reference while allowing
 * the underlying implementation to be updated.
 */
export type StateFunction<T extends AnyFunc = AnyFunc> = T & {
  /** Update the underlying function implementation */
  update(fn: T): void;
};

/**
 * Compare two values and return a stable reference.
 *
 * This function is designed for React's `useMemo`/`useCallback` patterns where
 * maintaining stable references prevents unnecessary re-renders.
 *
 * **Return value:** `[isEqual, stableValue]`
 * - `isEqual`: Whether the values are considered equal
 * - `stableValue`: The value to use (either `prev` if equal, or a stable wrapper for functions)
 *
 * **Special handling:**
 *
 * | Type | Behavior |
 * |------|----------|
 * | **Functions** | Wrapped in a stable reference that delegates to the latest implementation |
 * | **Dates** | Compared by timestamp value |
 * | **Objects/Arrays** | Compared using the provided equality strategy |
 * | **Primitives** | Compared using Object.is (default) |
 *
 * @param prev - The previous cached value
 * @param next - The new value to compare
 * @param equals - Equality strategy: "strict" (default), "shallow", "deep", or custom function
 * @returns Tuple of [isEqual, stableValue]
 *
 * @example Basic usage
 * ```ts
 * const [isEqual, stable] = stableEquals(cached, newValue);
 * if (!isEqual) {
 *   setCached(stable);
 * }
 * ```
 *
 * @example Function stability
 * ```ts
 * // First call: wraps function in stable reference
 * const [, fn1] = stableEquals(undefined, () => console.log("v1"));
 *
 * // Second call: updates the wrapper, returns same reference
 * const [isEqual, fn2] = stableEquals(fn1, () => console.log("v2"));
 * console.log(isEqual); // true
 * console.log(fn1 === fn2); // true
 *
 * fn2(); // logs "v2" (uses latest implementation)
 * ```
 *
 * @example With shallow equality
 * ```ts
 * const [isEqual, stable] = stableEquals(
 *   { a: 1, b: 2 },
 *   { a: 1, b: 2 },
 *   "shallow"
 * );
 * console.log(isEqual); // true (shallow equal)
 * ```
 */
export function stableEquals<T>(
  prev: T | undefined,
  next: T,
  equals?: EqualsFn<T> | EqualsStrategy
): [result: boolean, stableValue: T] {
  // Fast path: same reference
  if (next === prev) {
    return [true, next];
  }

  // Functions: wrap in stable reference that can be updated
  if (typeof next === "function") {
    if (isStateFunction(prev)) {
      // Update existing wrapper with new implementation
      prev.update(next as AnyFunc);
      return [true, prev as T];
    }
    // Create new stable wrapper
    return [false, stateFunction(next as AnyFunc) as T];
  }

  // Dates: compare by timestamp
  if (next instanceof Date) {
    if (prev instanceof Date && prev.getTime() === next.getTime()) {
      return [true, prev as T];
    }
    return [false, next];
  }

  // General comparison using equality strategy
  // Only compare if prev is defined (undefined is never equal to a defined value)
  if (prev !== undefined) {
    const resolvedEquals = resolveEquals(equals) ?? Object.is;
    if (resolvedEquals(prev, next)) {
      return [true, prev];
    }
  }

  return [false, next];
}

/**
 * Create a stable function wrapper that delegates to an updatable implementation.
 *
 * The returned function:
 * - Maintains the same reference across updates
 * - Delegates all calls to the current underlying function
 * - Can be updated via `.update(newFn)` method
 *
 * @param fn - The initial function implementation
 * @returns A stable wrapper function with an `update` method
 * @internal
 */
function stateFunction<T extends AnyFunc>(fn: T): StateFunction<T> {
  let current = fn;

  const wrapper = ((...args: Parameters<T>): ReturnType<T> => {
    return current(...args);
  }) as StateFunction<T>;

  Object.defineProperties(wrapper, {
    [STATE_FUNCTION_SYMBOL]: { value: true, writable: false },
    update: {
      value: (newFn: T) => {
        current = newFn;
      },
      writable: false,
    },
  });

  return wrapper;
}

/**
 * Type guard to check if a value is a state function wrapper.
 *
 * @param fn - Value to check
 * @returns True if the value is a state function with an `update` method
 * @internal
 */
function isStateFunction<T extends AnyFunc>(
  fn: unknown
): fn is StateFunction<T> {
  return (
    typeof fn === "function" && (fn as any)[STATE_FUNCTION_SYMBOL] === true
  );
}
