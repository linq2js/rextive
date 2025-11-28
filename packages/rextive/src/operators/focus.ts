/**
 * Focus operator - Create a bidirectional lens into nested signal data
 *
 * Creates a new mutable signal focused on a specific path within a source signal.
 * Changes flow bidirectionally: source → focused and focused → source.
 */

import type {
  Signal,
  Mutable,
  Path,
  PathValue,
  PredefinedEquals,
  EqualsFn,
} from "../types";
import { signal } from "../signal";

/**
 * Context passed to focus callbacks (set, validate, onError)
 */
export interface FocusContext<T> {
  /**
   * Previous value before the change.
   */
  prev: T;
}

/**
 * Options for the focus operator
 */
export interface FocusOptions<T> {
  /**
   * Equality strategy for the focused value
   * @default "strict"
   */
  equals?: PredefinedEquals | EqualsFn<T>;

  /**
   * Fallback value factory when initial read fails.
   * If not provided, errors will be thrown.
   *
   * Note: After successful creation, the inner signal caches the value,
   * so later read errors won't need fallback.
   *
   * @param error - The error that occurred
   */
  fallback?: (error: unknown) => T;

  /**
   * Debug name for the focused signal
   */
  name?: string;

  /**
   * Transform value when reading from source.
   * Called on every read (initial + source changes).
   */
  get?: (value: T) => T;

  /**
   * Transform value when writing to source.
   * Called on every set before validation.
   *
   * @param value - New value being set
   * @param ctx - Context with previous value
   */
  set?: (value: T, ctx: FocusContext<T>) => T;

  /**
   * Validate before setting.
   * Return false or throw to reject the update.
   *
   * @param value - Value after set transform
   * @param ctx - Context with previous value
   */
  validate?: (value: T, ctx: FocusContext<T>) => boolean | void;

  /**
   * Called when any error occurs (validation, set, path access).
   * Always called if provided, regardless of fallback.
   *
   * @param error - The error that occurred
   * @param ctx - Context with previous value (undefined on initial read error)
   */
  onError?: (error: unknown, ctx: FocusContext<T> | undefined) => void;
}

/**
 * Get value at a nested path
 */
function getAtPath<T extends object, P extends Path<T>>(
  obj: T,
  path: P
): PathValue<T, P> {
  const keys = (path as string).split(".");
  let current: any = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      throw new Error(`Cannot read property '${key}' of ${current}`);
    }
    current = current[key];
  }

  return current;
}

/**
 * Set value at a nested path (immutable update)
 */
function setAtPath<T extends object, P extends Path<T>>(
  obj: T,
  path: P,
  value: PathValue<T, P>
): T {
  const keys = (path as string).split(".");

  if (keys.length === 0) {
    return value as unknown as T;
  }

  const result = Array.isArray(obj) ? [...obj] : { ...obj };
  let current: any = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const next = current[key];
    current[key] = Array.isArray(next) ? [...next] : { ...next };
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return result as T;
}

/**
 * Create a bidirectional focused signal on a specific path.
 *
 * The focused signal reads from and writes to the source signal at the specified path.
 * Changes to either signal are reflected in the other.
 *
 * @param path - Dot-notation path to focus on (e.g., "user.name", "items.0.id")
 * @param options - Optional configuration
 * @returns Operator function that creates a focused Mutable signal
 *
 * @example Basic usage
 * ```ts
 * import { focus } from "rextive/op";
 *
 * const form = signal({ user: { name: "Alice", age: 30 } });
 * const userName = form.pipe(focus("user.name"));
 *
 * userName();           // "Alice"
 * userName.set("Bob");  // form becomes { user: { name: "Bob", age: 30 } }
 * ```
 *
 * @example With validation (using context)
 * ```ts
 * const age = form.pipe(focus("user.age", {
 *   validate: (v, ctx) => {
 *     if (v < 0 || v > 150) return false;
 *     // Rate limit: max change of 10
 *     if (ctx.prev !== undefined && Math.abs(v - ctx.prev) > 10) return false;
 *     return true;
 *   },
 *   onError: (e, ctx) => console.error("Invalid age. Previous:", ctx.prev),
 * }));
 * ```
 *
 * @example With transform
 * ```ts
 * const email = form.pipe(focus("user.email", {
 *   get: (v) => v.toLowerCase(),
 *   set: (v, ctx) => v.toLowerCase().trim(),
 * }));
 * ```
 *
 * @example With fallback
 * ```ts
 * const nickname = form.pipe(focus("user.nickname", {
 *   fallback: () => "Anonymous",
 * }));
 * ```
 */
export function focus<T extends object, P extends Path<T>>(
  path: P,
  options?: FocusOptions<PathValue<T, P>>
): (source: Signal<T>) => Mutable<PathValue<T, P>> {
  type V = PathValue<T, P>;

  return (source: Signal<T>): Mutable<V> => {
    // Runtime check: focus requires a mutable signal
    if (!("set" in source) || typeof (source as any).set !== "function") {
      throw new Error(
        "focus() requires a mutable signal. Use .to() for computed signals."
      );
    }
    const mutableSource = source as Mutable<T>;

    const {
      equals,
      fallback,
      name,
      get: getFn,
      set: setFn,
      validate,
      onError,
    } = options ?? {};

    // Prevent circular updates
    let isUpdating = false;

    // Reference to source (cleared when disposed)
    let sourceRef: Mutable<T> | undefined = mutableSource;

    // Track previous value for context (set after initial read)
    let prevValue: V | undefined = undefined;

    /**
     * Create context object for callbacks (only when prev is available)
     */
    const createContext = (): FocusContext<V> | undefined =>
      prevValue !== undefined ? { prev: prevValue } : undefined;

    /**
     * Read value from source at path
     */
    const readFromSource = (): V => {
      if (!sourceRef || sourceRef.disposed()) {
        sourceRef = undefined;
        const error = new Error("Source signal is disposed");
        onError?.(error, createContext());
        if (fallback) {
          return fallback(error);
        }
        throw error;
      }

      try {
        let value = getAtPath(sourceRef(), path);
        if (getFn) {
          value = getFn(value);
        }
        return value;
      } catch (error) {
        onError?.(error, createContext());
        if (fallback) {
          return fallback(error);
        }
        throw error;
      }
    };

    /**
     * Write value to source at path
     */
    const writeToSource = (value: V, prev: V): boolean => {
      const ctx: FocusContext<V> = { prev };

      if (!sourceRef || sourceRef.disposed()) {
        sourceRef = undefined;
        const error = new Error("Source signal is disposed");
        onError?.(error, ctx);
        return false;
      }

      try {
        // Apply set transform
        const finalValue = setFn ? setFn(value, ctx) : value;

        // Validate
        if (validate) {
          const result = validate(finalValue, ctx);
          if (result === false) {
            throw new Error("Validation failed");
          }
        }

        // Update source (with circular prevention)
        isUpdating = true;
        try {
          sourceRef.set((current) => setAtPath(current, path, finalValue));
        } finally {
          isUpdating = false;
        }

        // Update prevValue after successful write
        prevValue = finalValue;

        return true;
      } catch (error) {
        onError?.(error, ctx);
        return false;
      }
    };

    // Create inner mutable signal with initial value from source
    const initialValue = readFromSource();
    prevValue = initialValue; // Set initial prev
    const inner = signal<V>(initialValue, {
      equals,
      name: name ?? `focus(${path as string})`,
    });

    // Source → Inner: sync when source changes
    const unsubSource = mutableSource.on(() => {
      if (isUpdating) return;
      if (!sourceRef || sourceRef.disposed()) {
        sourceRef = undefined;
        return;
      }

      try {
        const newValue = readFromSource();
        inner.set(newValue);
        prevValue = newValue; // Update prev after sync
      } catch {
        // Error handled in readFromSource
      }
    });

    // Store original methods
    const originalSet = inner.set.bind(inner);
    const originalDispose = inner.dispose.bind(inner);

    // Override set to propagate to source FIRST
    inner.set = ((valueOrUpdater: V | ((prev: V) => V)) => {
      if (isUpdating) return;

      const prev = inner();
      const next =
        typeof valueOrUpdater === "function"
          ? (valueOrUpdater as (prev: V) => V)(prev)
          : valueOrUpdater;

      // Write to source (this will set isUpdating = true)
      const success = writeToSource(next, prev);

      if (success) {
        // Update inner signal (source already updated)
        originalSet(next);
      }
    }) as typeof inner.set;

    // Override dispose to cleanup subscriptions
    inner.dispose = () => {
      unsubSource();
      sourceRef = undefined;
      originalDispose();
    };

    return inner;
  };
}
