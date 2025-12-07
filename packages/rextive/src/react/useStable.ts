/**
 * useStable - Dynamic stable value getter for React components.
 *
 * Returns a function that provides stable references for values across renders.
 * This solves the common React problem where inline objects/functions cause
 * unnecessary re-renders because references change every render.
 *
 * ## When to use
 *
 * ### 1. Callbacks for memoized children
 * Prevents `React.memo` children from re-rendering when parent re-renders:
 * ```tsx
 * const stable = useStable<{ onClick: () => void }>();
 *
 * return <MemoizedChild onClick={stable("onClick", () => doSomething(latestState))} />;
 * ```
 *
 * ### 2. Stable objects with custom equality
 * ```tsx
 * const stable = useStable<{ config: Config }>();
 *
 * const config = stable("config", { endpoint, headers }, "shallow");
 * // Returns cached config if shallowly equal
 * ```
 *
 * ### 3. Multiple values at once
 * ```tsx
 * const stable = useStable<{ handlers: Handlers }>();
 *
 * const { onClick, onHover } = stable({
 *   onClick: () => handleClick(),
 *   onHover: () => handleHover(),
 * });
 * ```
 *
 * ## How it works
 *
 * | Input Type | Behavior |
 * |------------|----------|
 * | **Functions** | Wrapped in stable function that delegates to latest implementation |
 * | **Objects/Arrays** | Cached and returned if equal (based on equality strategy) |
 * | **Primitives** | Returned directly (always equal by reference) |
 *
 * @module useStable
 */

import { useState } from "react";
import { EqualsFn } from "../types";
import { EqualsStrategy, resolveEquals } from "../utils/resolveEquals";

/**
 * Type for the stable getter function returned by useStable.
 *
 * Has two overloads:
 * 1. Single key-value: `stable("key", value, equals?)`
 * 2. Partial object: `stable({ key1: value1, key2: value2 }, equals?)`
 */
export type StableGet<TStable extends Record<string, unknown>> = {
  /**
   * Get a stable reference for a single key-value pair.
   *
   * @param key - The key to cache the value under
   * @param current - The current value
   * @param equals - Optional equality strategy for comparison
   * @returns Stable reference to the value
   *
   * @example
   * ```tsx
   * const handler = stable("onClick", () => doSomething());
   * const config = stable("config", { theme: "dark" }, "shallow");
   * ```
   */
  <K extends keyof TStable>(
    key: K,
    current: TStable[K],
    equals?: EqualsStrategy | EqualsFn<TStable[K]>
  ): TStable[K];

  /**
   * Get stable references for multiple key-value pairs at once.
   *
   * @param partial - Object containing key-value pairs to stabilize
   * @param equals - Optional equality strategy for comparison
   * @returns Object with stable references
   *
   * @example
   * ```tsx
   * const { onClick, onHover } = stable({
   *   onClick: () => handleClick(),
   *   onHover: () => handleHover(),
   * });
   * ```
   */
  <TPartial extends Partial<TStable>>(
    partial: TPartial,
    equals?: EqualsStrategy | EqualsFn<TPartial[keyof TPartial]>
  ): TPartial;
};

/**
 * Creates a dynamic stable getter for values in React components.
 *
 * @template TStable - Record type defining the shape of stable values
 * @returns A getter function for creating stable references
 *
 * @example
 * ```tsx
 * // With type definition
 * const stable = useStable<{
 *   onClick: () => void;
 *   config: { theme: string };
 * }>();
 *
 * // Single value
 * const onClick = stable("onClick", () => console.log("clicked"));
 *
 * // With custom equality
 * const config = stable("config", { theme: "dark" }, "shallow");
 *
 * // Multiple values
 * const handlers = stable({
 *   onSubmit: () => submitForm(),
 *   onCancel: () => cancelForm(),
 * });
 * ```
 */
export function useStable<
  TStable extends Record<string, unknown> = Record<string, unknown>
>(): StableGet<TStable> {
  // Controller persists across renders, manages cache
  const [controller] = useState(() => new StableController<TStable>());
  return controller.get;
}

/**
 * Internal controller that manages the stable value cache.
 */
class StableController<TStable extends Record<string, unknown>> {
  /**
   * Cache for stable values, keyed by string key.
   * Functions are stored as { fn: latestFn, stable: stableWrapper }
   */
  private cache = new Map<
    string,
    { value: unknown; stableWrapper?: (...args: unknown[]) => unknown }
  >();

  /**
   * The stable getter function exposed to consumers.
   */
  get: StableGet<TStable>;

  constructor() {
    // Bind the getter to this instance
    this.get = ((
      keyOrPartial: string | Partial<TStable>,
      currentOrEquals?: unknown,
      equalsForKey?: EqualsStrategy | EqualsFn<unknown>
    ): unknown => {
      // Overload 2: Partial object
      if (typeof keyOrPartial === "object" && keyOrPartial !== null) {
        const partial = keyOrPartial as Partial<TStable>;
        const equals = currentOrEquals as
          | EqualsStrategy
          | EqualsFn<unknown>
          | undefined;

        const result: Record<string, unknown> = {};
        for (const key of Object.keys(partial)) {
          result[key] = this.getStableValue(
            key,
            partial[key as keyof TStable],
            equals
          );
        }
        return result;
      }

      // Overload 1: Single key-value
      const key = keyOrPartial as string;
      const current = currentOrEquals;
      return this.getStableValue(key, current, equalsForKey);
    }) as StableGet<TStable>;
  }

  /**
   * Get or create a stable reference for a value.
   */
  private getStableValue(
    key: string,
    current: unknown,
    equals?: EqualsStrategy | EqualsFn<unknown>
  ): unknown {
    const cached = this.cache.get(key);

    // Functions: Return stable wrapper that delegates to latest implementation
    if (typeof current === "function") {
      if (cached?.stableWrapper) {
        // Update the cached function reference for the stable wrapper to call
        cached.value = current;
        return cached.stableWrapper;
      }

      // Create new stable wrapper
      const entry = {
        value: current,
        stableWrapper: (...args: unknown[]) => {
          // Always call the LATEST function
          return (entry.value as Function)(...args);
        },
      };
      this.cache.set(key, entry);
      return entry.stableWrapper;
    }

    // Non-functions: Compare with equality and return cached if equal
    if (cached && !cached.stableWrapper) {
      const equalsFn = resolveEquals(equals) ?? Object.is;
      if (equalsFn(cached.value, current)) {
        return cached.value;
      }
    }

    // Cache and return new value
    this.cache.set(key, { value: current });
    return current;
  }
}
