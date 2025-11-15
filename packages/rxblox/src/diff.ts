/**
 * Deep compares two values and returns the differences.
 *
 * This utility compares any two JavaScript values and returns only the changed properties.
 * Useful for:
 * - Detecting form changes
 * - Optimizing API calls (PATCH with only changed fields)
 * - Change tracking and dirty checks
 * - Undo/redo functionality
 *
 * @param current - The current value
 * @param previous - The previous value to compare against
 * @returns An object containing only changed properties, or undefined if no changes
 *
 * @example
 * ```ts
 * const before = { count: 0, name: "John", age: 30 };
 * const after = { count: 5, name: "John", age: 30 };
 *
 * const delta = diff(after, before);
 * // { count: 5 }  (only changed properties)
 * ```
 *
 * @example
 * ```ts
 * // Works with nested objects
 * const before = { user: { name: "John", age: 30 }, count: 5 };
 * const after = { user: { name: "Jane", age: 30 }, count: 5 };
 *
 * const delta = diff(after, before);
 * // { user: { name: "Jane" } }  (only nested changes)
 * ```
 *
 * @example
 * ```ts
 * // Use with signal.snapshot for change tracking
 * import { signal, diff } from "rxblox";
 *
 * const formData = {
 *   name: signal("John"),
 *   email: signal("john@example.com"),
 *   age: signal(30),
 * };
 *
 * const before = signal.snapshot(formData);
 *
 * // Make changes
 * formData.name.set("Jane");
 * formData.age.set(31);
 *
 * const after = signal.snapshot(formData);
 * const changes = diff(after, before);
 * // { name: "Jane", age: 31 }
 *
 * // Send only changes to API
 * await fetch("/api/users/123", {
 *   method: "PATCH",
 *   body: JSON.stringify(changes),
 * });
 * ```
 */
export function diff<T>(current: T, previous: T): Partial<T> | undefined {
  return diffValues(current, previous) as Partial<T> | undefined;
}

/**
 * Internal recursive diff implementation.
 * Handles primitives, objects, arrays, and nested structures.
 */
function diffValues(current: unknown, previous: unknown): any {
  // Same reference or strict equality
  if (current === previous) {
    return undefined;
  }

  // Different types or one is primitive
  const currentType = typeof current;
  const previousType = typeof previous;

  if (
    currentType !== previousType ||
    currentType !== "object" ||
    current === null ||
    previous === null
  ) {
    // Values are different and at least one is primitive/null
    return current;
  }

  // Handle Date objects - compare by value
  if (current instanceof Date && previous instanceof Date) {
    return current.getTime() === previous.getTime() ? undefined : current;
  }

  // Handle RegExp objects - compare by source and flags
  if (current instanceof RegExp && previous instanceof RegExp) {
    return current.toString() === previous.toString() ? undefined : current;
  }

  // Handle other special objects (Date, RegExp) when only one is that type
  if (
    current instanceof Date ||
    previous instanceof Date ||
    current instanceof RegExp ||
    previous instanceof RegExp
  ) {
    return current;
  }

  // Both are arrays
  if (Array.isArray(current) && Array.isArray(previous)) {
    // If lengths differ or any element differs, return the entire array
    if (current.length !== previous.length) {
      return current;
    }

    let hasChanges = false;
    for (let i = 0; i < current.length; i++) {
      if (diffValues(current[i], previous[i]) !== undefined) {
        hasChanges = true;
        break;
      }
    }

    return hasChanges ? current : undefined;
  }

  // One is array, other is object
  if (Array.isArray(current) !== Array.isArray(previous)) {
    return current;
  }

  // Both are objects - compare properties
  const currentObj = current as Record<string, unknown>;
  const previousObj = previous as Record<string, unknown>;

  const changes: Record<string, unknown> = {};
  let hasChanges = false;

  // Check for changed or new properties in current
  for (const key in currentObj) {
    if (Object.prototype.hasOwnProperty.call(currentObj, key)) {
      const diff = diffValues(currentObj[key], previousObj[key]);
      if (diff !== undefined) {
        changes[key] = diff;
        hasChanges = true;
      }
    }
  }

  // Check for deleted properties (exist in previous but not in current)
  for (const key in previousObj) {
    if (
      Object.prototype.hasOwnProperty.call(previousObj, key) &&
      !(key in currentObj)
    ) {
      changes[key] = undefined;
      hasChanges = true;
    }
  }

  return hasChanges ? changes : undefined;
}

