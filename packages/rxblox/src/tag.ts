import type { MutableSignal } from "./types";
import { isMutableSignal } from "./signal";

/**
 * A tag for grouping signals together.
 *
 * Tags allow you to perform batch operations on multiple signals,
 * such as resetting form fields, disposing resources, or debugging.
 *
 * @template T - The type of values held by signals in this tag
 *
 * @example
 * ```ts
 * const formTag = tag<string>();
 * const name = signal("", { tags: [formTag] });
 * const email = signal("", { tags: [formTag] });
 *
 * // Reset all form fields
 * formTag.forEach(signal => signal.reset());
 * ```
 */
export type Tag<T> = {
  /**
   * Iterates over all signals in this tag.
   *
   * @param fn - Function to call for each signal
   *
   * @example
   * ```ts
   * const formTag = tag<string>();
   * formTag.forEach(signal => signal.reset());
   * ```
   */
  forEach(fn: (signal: MutableSignal<T>) => void): void;

  /**
   * Returns all signals in this tag as an array.
   *
   * @returns Array of signals
   *
   * @example
   * ```ts
   * const allFields = formTag.signals();
   * console.log(`${allFields.length} fields in form`);
   * ```
   */
  signals(): MutableSignal<T>[];

  /**
   * Checks if a signal is in this tag.
   *
   * @param signal - Signal to check
   * @returns True if signal is in tag
   *
   * @example
   * ```ts
   * if (formTag.has(nameSignal)) {
   *   console.log("Name field is part of form");
   * }
   * ```
   */
  has(signal: MutableSignal<T>): boolean;

  /**
   * Removes a signal from this tag.
   *
   * @param signal - Signal to remove
   * @returns True if signal was in tag and removed
   *
   * @example
   * ```ts
   * formTag.delete(nameSignal);
   * ```
   */
  delete(signal: MutableSignal<T>): boolean;

  /**
   * Removes all signals from this tag.
   *
   * @example
   * ```ts
   * formTag.clear();
   * ```
   */
  clear(): void;

  /**
   * Number of signals in this tag.
   *
   * @example
   * ```ts
   * console.log(`Form has ${formTag.size} fields`);
   * ```
   */
  readonly size: number;

  /**
   * Internal method to add a signal to this tag.
   * Called automatically by signal() when tags option is provided.
   *
   * @internal
   */
  _add(signal: MutableSignal<T>): void;

  /**
   * Internal method to remove a signal from this tag.
   * Called automatically when signal is disposed.
   *
   * @internal
   */
  _remove(signal: MutableSignal<T>): void;
};

/**
 * Type helper to extract the union of value types from an array of tags.
 *
 * @internal
 */
export type UnionOfTagTypes<T extends readonly Tag<any>[]> =
  T extends readonly Tag<infer U>[] ? U : never;

/**
 * Creates a tag for grouping signals together.
 *
 * Tags enable batch operations on multiple signals, such as:
 * - Resetting form fields
 * - Disposing resources
 * - Debugging and logging
 * - Batch updates
 *
 * @template T - The type of values held by signals in this tag
 * @returns A new tag instance
 *
 * @example
 * Basic usage - form reset
 * ```ts
 * const formTag = tag<string>();
 * const name = signal("", { tags: [formTag] });
 * const email = signal("", { tags: [formTag] });
 *
 * const resetForm = () => {
 *   formTag.forEach(signal => signal.reset());
 * };
 * ```
 *
 * @example
 * Resource disposal
 * ```ts
 * const resourceTag = tag<Connection>();
 * const conn1 = signal(connection1, { tags: [resourceTag] });
 * const conn2 = signal(connection2, { tags: [resourceTag] });
 *
 * onCleanup(() => {
 *   resourceTag.forEach(signal => signal.peek()?.close());
 *   resourceTag.clear();
 * });
 * ```
 *
 * @example
 * Debugging
 * ```ts
 * const debugTag = tag<unknown>();
 * const count = signal(0, { tags: [debugTag] });
 * const name = signal("John", { tags: [debugTag] });
 *
 * effect(() => {
 *   console.group("Debug Signals");
 *   debugTag.forEach(signal => {
 *     console.log(signal.peek());
 *   });
 *   console.groupEnd();
 * });
 * ```
 */
export function tag<T>(): Tag<T> {
  const signals = new Set<MutableSignal<T>>();

  return {
    forEach(fn: (signal: MutableSignal<T>) => void): void {
      signals.forEach(fn);
    },

    signals(): MutableSignal<T>[] {
      return Array.from(signals);
    },

    has(signal: MutableSignal<T>): boolean {
      return signals.has(signal);
    },

    delete(signal: MutableSignal<T>): boolean {
      return signals.delete(signal);
    },

    clear(): void {
      signals.clear();
    },

    get size(): number {
      return signals.size;
    },

    _add(signal: MutableSignal<T>): void {
      if (!isMutableSignal(signal)) {
        throw new Error("Only mutable signals can be tagged");
      }
      signals.add(signal);
    },

    _remove(signal: MutableSignal<T>): void {
      signals.delete(signal);
    },
  };
}

/**
 * Static namespace for multi-tag operations.
 */
export namespace tag {
  /**
   * Iterates over all signals from multiple tags.
   *
   * The callback receives signals typed as a union of all tag types.
   *
   * @param tags - Array of tags to iterate over
   * @param fn - Function to call for each signal
   *
   * @example
   * ```ts
   * const stringTag = tag<string>();
   * const numberTag = tag<number>();
   *
   * tag.forEach([stringTag, numberTag], (signal) => {
   *   // signal: MutableSignal<string | number>
   *   console.log(signal.peek());
   * });
   * ```
   */
  export function forEach<T extends readonly Tag<any>[]>(
    tags: T,
    fn: (signal: MutableSignal<UnionOfTagTypes<T>>) => void
  ): void {
    const seen = new Set<MutableSignal<any>>();

    for (const t of tags) {
      t.forEach((signal) => {
        if (!seen.has(signal)) {
          seen.add(signal);
          fn(signal as MutableSignal<UnionOfTagTypes<T>>);
        }
      });
    }
  }

  /**
   * Returns all signals from multiple tags as an array.
   *
   * Signals are de-duplicated (if a signal belongs to multiple tags,
   * it appears only once in the result).
   *
   * @param tags - Array of tags
   * @returns Array of signals from all tags
   *
   * @example
   * ```ts
   * const stringTag = tag<string>();
   * const numberTag = tag<number>();
   *
   * const allSignals = tag.signals([stringTag, numberTag]);
   * // allSignals: MutableSignal<string | number>[]
   * ```
   */
  export function signals<T extends readonly Tag<any>[]>(
    tags: T
  ): MutableSignal<UnionOfTagTypes<T>>[] {
    const result: MutableSignal<UnionOfTagTypes<T>>[] = [];
    const seen = new Set<MutableSignal<any>>();

    for (const t of tags) {
      t.forEach((signal) => {
        if (!seen.has(signal)) {
          seen.add(signal);
          result.push(signal as MutableSignal<UnionOfTagTypes<T>>);
        }
      });
    }

    return result;
  }
}
