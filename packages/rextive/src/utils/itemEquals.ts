import type { EqualsFn } from "../types";
import { EqualsStrategy } from "../types";
import { resolveEquals } from "./resolveEquals";

/**
 * Creates an equality function for arrays that compares items element-by-element.
 *
 * This is useful for signals holding arrays where you want to prevent updates
 * when the array contents are the same, even if the array reference changed.
 *
 * @template T - The type of items in the array
 * @param equals - Optional equality strategy for comparing individual items.
 *                 Can be a custom function or a predefined strategy ("strict", "shallow", "deep").
 *                 Defaults to `Object.is` (strict reference equality).
 * @returns An equality function that compares two arrays (or null/undefined values)
 *
 * @example
 * ```tsx
 * // Compare arrays of primitives
 * const numbers = signal([1, 2, 3], { equals: itemEquals() });
 * numbers.set([1, 2, 3]); // No update - same items
 *
 * // Compare arrays of objects with shallow equality
 * const users = signal([{ name: "Alice" }], { equals: itemEquals("shallow") });
 * users.set([{ name: "Alice" }]); // No update - objects are shallowly equal
 *
 * // Compare arrays with custom equality
 * const items = signal([], { equals: itemEquals((a, b) => a.id === b.id) });
 * ```
 */
export function itemEquals<T>(
  equals?: EqualsFn<T> | EqualsStrategy
): EqualsFn<T[] | undefined | null> {
  return (a, b) => {
    // Handle null/undefined cases
    if (!a || !b) {
      return a === b;
    }

    // Resolve the equality strategy to a function
    const resolvedEquals = resolveEquals(equals) ?? Object.is;

    // Compare arrays element-by-element
    if (Array.isArray(a) && Array.isArray(b)) {
      return (
        a.length === b.length &&
        a.every((item, index) => resolvedEquals(item, b[index]))
      );
    }

    // Non-array values are not equal (type mismatch)
    return false;
  };
}
