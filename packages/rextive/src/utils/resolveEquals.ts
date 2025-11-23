import { isEqual } from "lodash";
import { shallowEquals } from "./shallowEquals";

/**
 * Equality function type
 */
export type EqualsFn<T = any> = (a: T, b: T) => boolean;

/**
 * Built-in equality strategies
 */
export type EqualsStrategy = "is" | "shallow" | "deep";

/**
 * Equals option that can be a strategy string or a custom function
 */
export type EqualsOption<T = any> = EqualsStrategy | EqualsFn<T> | undefined;

/**
 * Resolves an equals option to an actual equality function.
 *
 * Supports string shortcuts for common equality strategies:
 * - `'is'` or `undefined` → Object.is (default, reference equality)
 * - `'shallow'` → Shallow equality (compares object keys/array elements)
 * - `'deep'` → Deep equality (lodash isEqual, recursive comparison)
 * - Custom function → Returns as-is
 *
 * @param equals - Equality option (string, function, or undefined)
 * @returns The resolved equality function
 *
 * @example
 * ```ts
 * // String shortcuts
 * const isEquals = resolveEquals('is');        // Object.is
 * const shallow = resolveEquals('shallow');    // shallowEquals
 * const deep = resolveEquals('deep');          // lodash isEqual
 *
 * // Custom function
 * const custom = resolveEquals((a, b) => a.id === b.id);
 *
 * // Undefined defaults to Object.is
 * const defaultEquals = resolveEquals(undefined); // Object.is
 * ```
 */
export function resolveEquals<T = any>(
  equals: EqualsOption<T>
): EqualsFn<T> | undefined {
  // Undefined or 'is' → use default Object.is (return undefined to use default)
  if (equals === undefined || equals === "is") {
    return undefined; // Let signal use Object.is by default
  }

  // String strategies
  if (equals === "shallow") {
    return shallowEquals as EqualsFn<T>;
  }

  if (equals === "deep") {
    return isEqual as EqualsFn<T>;
  }

  // Custom function
  return equals;
}

