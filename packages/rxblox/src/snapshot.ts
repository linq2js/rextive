import { isSignal } from "./signal";

/**
 * Deep traverses an object or array and extracts all signal values.
 *
 * This utility is useful for preparing reactive state for API submission,
 * logging, or serialization to JSON.
 *
 * @param input - The input value to extract signals from (can be object, array, or primitive)
 * @param peek - If true (default), uses signal.peek() to avoid tracking dependencies. If false, uses signal() to enable reactive tracking.
 * @returns A plain JavaScript value with all signals replaced by their current values
 *
 * @example
 * ```ts
 * const todos = signal([{ id: 1, text: signal("Buy milk") }]);
 * const filter = signal("all");
 *
 * const data = snapshot({ todos, filter });
 * // { todos: [{ id: 1, text: "Buy milk" }], filter: "all" }
 *
 * // Use for API submission
 * await fetch('/api/todos', {
 *   method: 'POST',
 *   body: JSON.stringify(snapshot({ todos, filter }))
 * });
 * ```
 *
 * @example
 * ```ts
 * // Works with nested structures
 * const state = {
 *   user: {
 *     name: signal("John"),
 *     email: signal("john@example.com")
 *   },
 *   todos: signal([
 *     { id: 1, completed: signal(false) },
 *     { id: 2, completed: signal(true) }
 *   ])
 * };
 *
 * const plain = snapshot(state);
 * // {
 * //   user: { name: "John", email: "john@example.com" },
 * //   todos: [
 * //     { id: 1, completed: false },
 * //     { id: 2, completed: true }
 * //   ]
 * // }
 * ```
 *
 * @example
 * ```ts
 * // Handles mixed signals and plain values
 * const form = {
 *   name: nameSignal,
 *   age: 25, // plain value
 *   settings: {
 *     theme: themeSignal,
 *     lang: "en" // plain value
 *   }
 * };
 *
 * const data = snapshot(form);
 * // All signals extracted, plain values preserved
 * ```
 */
export function snapshot<T>(input: T, peek = true): T {
  const seen = new WeakSet<object>();

  function extract(value: unknown): unknown {
    // Handle signals
    if (isSignal(value)) {
      return extract(peek ? value.peek() : value());
    }

    // Handle primitives and functions
    if (
      value === null ||
      value === undefined ||
      typeof value !== "object" ||
      value instanceof Date ||
      value instanceof RegExp
    ) {
      return value;
    }

    // Handle circular references
    if (seen.has(value)) {
      return value;
    }
    seen.add(value);

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item) => extract(item));
    }

    // Handle plain objects
    const result: Record<string, unknown> = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        result[key] = extract((value as Record<string, unknown>)[key]);
      }
    }
    return result;
  }

  return extract(input) as T;
}
