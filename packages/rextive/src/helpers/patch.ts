/**
 * patch() - Utility for immutable updates in signal.set()
 *
 * Supports both object and array operations with a unified API.
 *
 * @example Object operations
 * // Partial object update
 * person.set(patch({ name: "Jane" }));
 *
 * // Key-value update
 * person.set(patch("name", "Jane"));
 *
 * // Key with updater function
 * person.set(patch("age", prev => prev + 1));
 *
 * @example Array operations
 * // Index update
 * items.set(patch(0, "new value"));
 * items.set(patch(-1, prev => prev * 2));  // negative index
 *
 * // Array methods
 * items.set(patch(".push", 4, 5, 6));
 * items.set(patch(".pop"));
 * items.set(patch(".shift"));
 * items.set(patch(".unshift", 1, 2));
 * items.set(patch(".splice", 1, 2, "a", "b"));
 * items.set(patch(".reverse"));
 * items.set(patch(".sort", (a, b) => a - b));
 * items.set(patch(".fill", 0, 1, 3));
 * items.set(patch(".filter", x => x > 0));
 * items.set(patch(".map", x => x * 2));
 */

// ============================================================================
// Type definitions
// ============================================================================

/** Updater function type */
type Updater<T> = (prev: T) => T;

// ============================================================================
// Object overloads
// ============================================================================

/** Update with partial object */
export function patch<T extends object>(partial: Partial<T>): (prev: T) => T;

/** Update single property with value */
export function patch<T extends object, K extends keyof T>(
  key: K,
  value: T[K]
): (prev: T) => T;

/** Update single property with updater function */
export function patch<T extends object, K extends keyof T>(
  key: K,
  updater: Updater<T[K]>
): (prev: T) => T;

// ============================================================================
// Array overloads
// ============================================================================

/** Update array item at index with value */
export function patch<T>(index: number, value: T): (prev: T[]) => T[];

/** Update array item at index with updater */
export function patch<T>(
  index: number,
  updater: Updater<T>
): (prev: T[]) => T[];

/** Array pop - remove last item */
export function patch(method: ".pop"): <T>(prev: T[]) => T[];

/** Array shift - remove first item */
export function patch(method: ".shift"): <T>(prev: T[]) => T[];

/** Array reverse */
export function patch(method: ".reverse"): <T>(prev: T[]) => T[];

/** Array push - add items at end */
export function patch<T>(method: ".push", ...values: T[]): (prev: T[]) => T[];

/** Array unshift - add items at start */
export function patch<T>(
  method: ".unshift",
  ...values: T[]
): (prev: T[]) => T[];

/** Array splice - remove/insert items */
export function patch<T>(
  method: ".splice",
  start: number,
  deleteCount?: number,
  ...items: T[]
): (prev: T[]) => T[];

/** Array sort - with optional comparator */
export function patch<T>(
  method: ".sort",
  compareFn?: (a: T, b: T) => number
): (prev: T[]) => T[];

/** Array fill - fill with value */
export function patch<T>(
  method: ".fill",
  value: T,
  start?: number,
  end?: number
): (prev: T[]) => T[];

/** Array filter - filter items */
export function patch<T>(
  method: ".filter",
  predicate: (value: T, index: number, array: T[]) => boolean
): (prev: T[]) => T[];

/** Array map - transform items */
export function patch<T, U = T>(
  method: ".map",
  mapper: (value: T, index: number, array: T[]) => U
): (prev: T[]) => U[];

// ============================================================================
// Implementation
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function patch(
  keyOrPartialOrIndexOrMethod: string | number | symbol | object,
  ...args: unknown[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): (prev: any) => any {
  const first = keyOrPartialOrIndexOrMethod;

  // Array method: patch(".push", ...), patch(".pop"), etc.
  if (typeof first === "string" && first.startsWith(".")) {
    return createArrayMethodPatch(first, args);
  }

  // Array index: patch(0, value) or patch(0, updater)
  // Distinguished from object key by checking if it's a number
  if (typeof first === "number") {
    const valueOrUpdater = args[0];
    return (prev: unknown[]): unknown[] => {
      const arr = prev;
      const result = [...arr];
      const index = first < 0 ? arr.length + first : first;

      if (typeof valueOrUpdater === "function") {
        result[index] = (valueOrUpdater as Updater<unknown>)(arr[index]);
      } else {
        result[index] = valueOrUpdater;
      }

      return result;
    };
  }

  // Object key: patch("name", value) or patch("name", updater)
  if (typeof first === "string" || typeof first === "symbol") {
    const valueOrUpdater = args[0];
    return (
      prev: Record<string | symbol, unknown>
    ): Record<string | symbol, unknown> => {
      const obj = prev;

      if (typeof valueOrUpdater === "function") {
        return {
          ...obj,
          [first]: (valueOrUpdater as Updater<unknown>)(obj[first]),
        };
      }

      return { ...obj, [first]: valueOrUpdater };
    };
  }

  // Partial object: patch({ name: "Jane" })
  return (prev: object): object => ({ ...prev, ...(first as object) });
}

/**
 * Creates a patch function for array methods
 */
function createArrayMethodPatch(
  method: string,
  args: unknown[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): (prev: any[]) => any[] {
  switch (method) {
    case ".pop":
      return (prev) => {
        return prev.slice(0, -1);
      };

    case ".shift":
      return (prev) => {
        return prev.slice(1);
      };

    case ".push":
      return (prev) => {
        return [...prev, ...args];
      };

    case ".unshift":
      return (prev) => {
        return [...args, ...prev];
      };

    case ".splice": {
      const [start, deleteCount = 0, ...items] = args as [
        number,
        number?,
        ...unknown[],
      ];
      return (prev) => {
        const result = [...prev];
        result.splice(start, deleteCount ?? prev.length, ...items);
        return result;
      };
    }

    case ".reverse":
      return (prev) => {
        return [...prev].reverse();
      };

    case ".sort": {
      const [compareFn] = args as [(a: unknown, b: unknown) => number] | [];
      return (prev) => {
        return [...prev].sort(compareFn);
      };
    }

    case ".fill": {
      const [value, start, end] = args as [unknown, number?, number?];
      return (prev) => {
        const result = [...prev];
        result.fill(value, start, end);
        return result;
      };
    }

    case ".filter": {
      const [predicate] = args as [
        (value: unknown, index: number, array: unknown[]) => boolean,
      ];
      return (prev) => {
        return prev.filter(predicate);
      };
    }

    case ".map": {
      const [mapper] = args as [
        (value: unknown, index: number, array: unknown[]) => unknown,
      ];
      return (prev) => {
        return prev.map(mapper);
      };
    }

    default:
      throw new Error(`Unknown array method: ${method}`);
  }
}
