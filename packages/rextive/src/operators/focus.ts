/**
 * Focus operator - Create a bidirectional lens into nested signal data
 *
 * Creates a new mutable signal focused on a specific path within a source signal.
 * Changes flow bidirectionally: source → focused and focused → source.
 */

import get from "lodash/get.js";
import fpSet from "lodash/fp/set";
import memoize from "lodash/memoize";

import type {
  Mutable,
  Path,
  PathValue,
  PredefinedEquals,
  EqualsFn,
} from "../types";
import { signal } from "../signal";
import { is } from "../is";
import { autoPrefix } from "../utils/nameGenerator";

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
 * Base options for the focus operator (without fallback)
 */
export interface FocusBaseOptions<T> {
  /**
   * Equality strategy for the focused value
   * @default "strict"
   */
  equals?: PredefinedEquals | EqualsFn<T>;

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
 * Fallback factory function type
 */
export type FocusFallback<T> = () => T;

/**
 * Options for the focus operator (alias for FocusBaseOptions)
 */
export type FocusOptions<T> = FocusBaseOptions<T>;

/**
 * Set value at a nested path (immutable update) using lodash/fp/set
 */
function setAtPath<T extends object, P extends Path<T>>(
  obj: T,
  path: P,
  value: PathValue<T, P>
): T {
  return fpSet(path as string, value, obj) as T;
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
 * @example With fallback (guarantees non-nullable return type)
 * ```ts
 * // Fallback factory - Type is Mutable<string> (not string | undefined)
 * const nickname = form.pipe(focus("user.nickname", () => "Anonymous"));
 *
 * // Factory for expensive defaults
 * const config = form.pipe(focus("user.config", () => createDefaultConfig()));
 *
 * // With fallback and options
 * const name = form.pipe(focus("user.name", () => "Guest", { equals: "shallow" }));
 * ```
 */
// Overload 1: With fallback factory - T is fallback type F
export function focus<
  T extends object,
  P extends Path<T>,
  F extends NonNullable<PathValue<T, P>>
>(
  path: P,
  fallback: FocusFallback<F>,
  options?: FocusOptions<F>
): (source: Mutable<T>) => Mutable<F>;

// Overload 2: Without fallback - T is PathValue<T, P>
export function focus<T extends object, P extends Path<T>>(
  path: P,
  options?: FocusOptions<PathValue<T, P>>
): (source: Mutable<T>) => Mutable<PathValue<T, P>>;

// Implementation
export function focus<T extends object, P extends Path<T>>(
  path: P,
  fallbackOrOptions?:
    | FocusFallback<PathValue<T, P>>
    | FocusOptions<PathValue<T, P>>,
  options?: FocusOptions<PathValue<T, P>>
): (source: Mutable<T>) => Mutable<PathValue<T, P>> {
  type V = PathValue<T, P>;

  // Determine if second arg is fallback (function) or options (object)
  const isFallbackArg = typeof fallbackOrOptions === "function";

  const fallback = isFallbackArg
    ? (fallbackOrOptions as FocusFallback<V>)
    : undefined;
  const resolvedOptions = isFallbackArg
    ? options
    : (fallbackOrOptions as FocusOptions<V> | undefined);

  return (source: Mutable<T>): Mutable<V> => {
    // Runtime check: focus requires a mutable signal
    if (!is(source, "mutable")) {
      throw new Error(
        "focus() requires a mutable signal. Use .to() for computed signals."
      );
    }

    const {
      equals,
      name,
      get: getFn,
      set: setFn,
      validate,
      onError,
    } = resolvedOptions ?? {};

    // Prevent circular updates
    let isUpdating = false;

    // Reference to source (cleared when disposed)
    let sourceRef: Mutable<T> | undefined = source;

    // Memoized fallback (computed once on first use)
    const getFallbackValue = fallback ? memoize(fallback) : undefined;

    /**
     * Apply get transform if provided
     */
    const applyGetTransform = (value: V): V => (getFn ? getFn(value) : value);

    /**
     * Read value from source at path using lodash get (nullish → fallback)
     */
    const readFromSource = (): V => {
      // Check if source is disposed
      if (!sourceRef || sourceRef.disposed()) {
        sourceRef = undefined;
        if (getFallbackValue) {
          return applyGetTransform(getFallbackValue());
        }
        throw new Error("Source signal is disposed");
      }

      // Use lodash get - returns undefined for invalid paths (doesn't throw)
      const value = get(sourceRef(), path as string) as V | null | undefined;

      // If value is nullish and we have fallback, use memoized fallback
      if ((value === null || value === undefined) && getFallbackValue) {
        return applyGetTransform(getFallbackValue());
      }

      return applyGetTransform(value as V);
    };

    /**
     * Write value to source at path
     */
    const writeToSource = (value: V, prev: V): boolean => {
      const ctx: FocusContext<V> = { prev };

      if (!sourceRef || sourceRef.disposed()) {
        sourceRef = undefined;
        const error = new Error(
          `Source signal (${source.displayName}) is disposed`
        );
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

        return true;
      } catch (error) {
        onError?.(error, ctx);
        return false;
      }
    };

    // Create inner mutable signal with initial value from source
    const initialValue = readFromSource();
    const inner = signal<V>(initialValue, {
      equals,
      name:
        name ?? autoPrefix(`focus(${source.displayName}.${path as string})`),
    });

    // Store original methods BEFORE creating subscriptions
    const originalSet = inner.set.bind(inner);
    const originalDispose = inner.dispose.bind(inner);

    // Source → Inner: sync when source changes
    // IMPORTANT: Use originalSet to avoid writing back to source (would cause O(n²) updates)
    const unsubSource = source.on(() => {
      if (isUpdating) return;

      // Cascade disposal when source disposes
      if (!sourceRef || sourceRef.disposed()) {
        sourceRef = undefined;
        unsubSource(); // Stop listening to disposed source
        inner.dispose(); // Dispose focus signal too
        return;
      }

      try {
        const newValue = readFromSource();
        // Use originalSet, NOT inner.set - we don't want to propagate back to source
        // inner.set would call writeToSource, causing cascading updates
        originalSet(newValue);
      } catch {
        // Error handled in readFromSource
      }
    });

    // Helper to dispose focus signal (lazy disposal)
    const disposeInner = () => {
      if (!inner.disposed()) {
        sourceRef = undefined;
        unsubSource();
        originalDispose();
      }
    };

    // Override set to propagate to source FIRST
    inner.set = ((valueOrUpdater: V | ((prev: V) => V)) => {
      if (isUpdating) return;

      const prev = inner();
      const next =
        typeof valueOrUpdater === "function"
          ? (valueOrUpdater as (prev: V) => V)(prev)
          : valueOrUpdater;

      // Write to source (this will set isUpdating = true)
      // writeToSource handles disposal detection and calls onError
      const success = writeToSource(next, prev);

      if (success) {
        // Update inner signal (source already updated)
        originalSet(next);
      } else if (!sourceRef || sourceRef.disposed()) {
        // Source was disposed - lazy dispose focus signal too
        disposeInner();
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

// ============================================================================
// LENS - Lightweight getter/setter without creating a signal
// ============================================================================

/**
 * A lens is a getter/setter tuple for accessing nested data.
 * Unlike focus(), lens() doesn't create a reactive signal - just on-demand read/write.
 *
 * @template T - The value type
 */
export type Lens<T> = [
  /** Get the current value */
  () => T,
  /** Set a new value (supports updater function) */
  (value: T | ((prev: T) => T)) => void
];

/**
 * Type guard to check if a value is a Lens tuple
 */
function isLens<T>(value: unknown): value is Lens<T> {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "function" &&
    typeof value[1] === "function"
  );
}

/**
 * Create a lightweight lens (getter/setter) for a path in a signal or another lens.
 * Unlike focus(), this doesn't create a reactive signal - just on-demand read/write.
 *
 * @example From a signal
 * ```ts
 * const [getFirstName, setFirstName] = focus.lens(formData, "contacts.0.firstName");
 * console.log(getFirstName()); // "John"
 * setFirstName("Jane");
 * setFirstName(prev => prev.toUpperCase());
 * ```
 *
 * @example Composable - lens from another lens
 * ```ts
 * const contactsLens = focus.lens(formData, "contacts");
 * const firstContactLens = focus.lens(contactsLens, "0");
 * const [getFirstName, setFirstName] = focus.lens(firstContactLens, "firstName");
 * ```
 *
 * @example With fallback
 * ```ts
 * const [getNickname, setNickname] = focus.lens(user, "nickname", () => "Anonymous");
 * ```
 */

// Overload 1: From Mutable signal
export function lens<T extends object, P extends Path<T>>(
  source: Mutable<T>,
  path: P,
  fallback?: () => PathValue<T, P>
): Lens<PathValue<T, P>>;

// Overload 2: From another Lens
export function lens<T extends object, P extends Path<T>>(
  source: Lens<T>,
  path: P,
  fallback?: () => PathValue<T, P>
): Lens<PathValue<T, P>>;

// Implementation
export function lens<T extends object, P extends Path<T>>(
  source: Mutable<T> | Lens<T>,
  path: P,
  fallback?: () => PathValue<T, P>
): Lens<PathValue<T, P>> {
  type V = PathValue<T, P>;

  // Memoize fallback if provided
  const getFallbackValue = fallback ? memoize(fallback) : undefined;

  // Determine if source is a lens or a mutable signal
  const isSourceLens = isLens(source);

  const getter = (): V => {
    const rootValue = isSourceLens ? source[0]() : (source as Mutable<T>)();
    const value = get(rootValue, path as string) as V | null | undefined;

    // Return fallback if value is nullish
    if ((value === null || value === undefined) && getFallbackValue) {
      return getFallbackValue();
    }

    return value as V;
  };

  const setter = (valueOrUpdater: V | ((prev: V) => V)): void => {
    const currentValue = getter();
    const newValue =
      typeof valueOrUpdater === "function"
        ? (valueOrUpdater as (prev: V) => V)(currentValue)
        : valueOrUpdater;

    if (isSourceLens) {
      // Update through parent lens
      source[1]((root: T) => setAtPath(root, path, newValue));
    } else {
      // Update signal directly
      (source as Mutable<T>).set((root: T) => setAtPath(root, path, newValue));
    }
  };

  return [getter, setter];
}

// Declare the static lens property on focus function
export namespace focus {
  export const lens: typeof import("./focus").lens = undefined as any;
}

// Attach lens as a static method on focus for convenient access
(focus as any).lens = lens;
