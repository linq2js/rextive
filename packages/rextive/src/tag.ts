/**
 * Tag system for grouping and managing signals.
 *
 * ## Automatic Cleanup
 *
 * **Important:** When a signal is disposed (via `signal.dispose()`), it is
 * automatically removed from ALL tags it belongs to. This is handled internally
 * by the signal implementation to prevent memory leaks.
 *
 * The lifecycle flow:
 * 1. Signal is created with `tags: [tag1, tag2]` option
 * 2. Signal is automatically added to tag1 and tag2
 * 3. When `signal.dispose()` is called:
 *    - Signal removes itself from tag1 and tag2
 *    - Tag's `onDelete` callback is invoked for each tag
 *    - Tag's `onChange` callback is invoked for each tag
 * 4. Tag no longer references the signal (prevents memory leak)
 *
 * ## Implementation Details
 *
 * The automatic cleanup is implemented in:
 * - `createMutableSignal.ts` - Lines with `tags.forEach((tag) => tag._delete(instanceRef))`
 * - `createComputedSignal.ts` - Lines with `tags.forEach((tag) => tag._delete(instanceRef))`
 *
 * This ensures signals and tags don't hold references to each other after disposal.
 *
 * @module tag
 */

import type { Signal } from "./types";
import { is } from "./is";

/**
 * Configuration options for creating a tag.
 *
 * @template T - The type of values held by signals in this tag
 */
export type TagOptions<T> = {
  /**
   * Debug name for this tag.
   * Useful for debugging and logging.
   *
   * @example
   * ```ts
   * const formFields = tag<string>({ name: 'formFields' });
   * ```
   */
  name?: string;

  /**
   * Maximum number of signals allowed in this tag.
   * When the limit is reached, adding new signals will throw an error.
   *
   * Useful for preventing memory leaks in long-running applications.
   *
   * @example
   * ```ts
   * const recentItems = tag<Item>({ maxSize: 100 });
   * ```
   */
  maxSize?: number;

  /**
   * Callback invoked when a signal is added to this tag.
   *
   * **Note:** This is called AFTER the signal is added to the tag.
   *
   * @param signal - The signal that was added
   * @param tag - The tag instance (useful for chaining operations)
   *
   * @example Log when signals are added
   * ```ts
   * const myTag = tag<number>({
   *   onAdd: (signal) => {
   *     console.log('Signal added:', signal.displayName);
   *   }
   * });
   * ```
   *
   * @example Track signal metadata
   * ```ts
   * const metadata = new WeakMap();
   * const trackedTag = tag<User>({
   *   onAdd: (signal) => {
   *     metadata.set(signal, { addedAt: Date.now() });
   *   }
   * });
   * ```
   */
  onAdd?: (signal: Signal<T>, tag: Tag<T>) => void;

  /**
   * Callback invoked when a signal is removed from this tag.
   *
   * **Note:** This is called AFTER the signal is removed from the tag.
   *
   * Signals are automatically removed from tags when:
   * - The signal is disposed (via `signal.dispose()`)
   * - Explicitly removed with `tag.delete(signal)`
   * - The tag is cleared with `tag.clear()`
   *
   * @param signal - The signal that was removed
   * @param tag - The tag instance (useful for chaining operations)
   *
   * @example Cleanup resources
   * ```ts
   * const myTag = tag<User>({
   *   onDelete: (signal) => {
   *     console.log('Signal removed:', signal.displayName);
   *   }
   * });
   * ```
   *
   * @example Track removal
   * ```ts
   * const trackedTag = tag<Item>({
   *   onDelete: (signal) => {
   *     analytics.track('signal_removed', {
   *       name: signal.displayName,
   *       removedAt: Date.now()
   *     });
   *   }
   * });
   * ```
   */
  onDelete?: (signal: Signal<T>, tag: Tag<T>) => void;

  /**
   * Callback invoked whenever the tag's signals change (add or remove).
   *
   * **Note:** This is called AFTER the change has occurred.
   *
   * Useful for:
   * - Tracking tag size changes
   * - Triggering UI updates
   * - Syncing with external state
   *
   * @param type - The type of change: 'add' or 'delete'
   * @param signal - The signal that was added or removed
   * @param tag - The tag instance
   *
   * @example Track tag size
   * ```ts
   * const myTag = tag<string>({
   *   onChange: (type, signal, tag) => {
   *     console.log(`Tag size: ${tag.size} (${type})`);
   *   }
   * });
   * ```
   *
   * @example Sync with UI
   * ```ts
   * const visibleItems = tag<Item>({
   *   onChange: (type, signal, tag) => {
   *     updateItemCount(tag.size);
   *   }
   * });
   * ```
   */
  onChange?: (type: "add" | "delete", signal: Signal<T>, tag: Tag<T>) => void;

  /**
   * If true, automatically dispose signals when they are removed from this tag.
   *
   * **Warning:** Use with caution! Disposed signals cannot be used anymore.
   * Only enable this if the tag owns the lifecycle of its signals.
   *
   * Useful for:
   * - Temporary signal pools
   * - Resource cleanup patterns
   * - Garbage collection helpers
   *
   * @default false
   *
   * @example Temporary signal pool
   * ```ts
   * const temporaryPool = tag<number>({ autoDispose: true });
   *
   * // Add some signals
   * const sig1 = signal(1, { tags: [temporaryPool] });
   * const sig2 = signal(2, { tags: [temporaryPool] });
   *
   * // Remove from pool - signals are automatically disposed
   * temporaryPool.delete(sig1); // sig1 is now disposed
   *
   * // Clear pool - all signals are disposed
   * temporaryPool.clear(); // sig2 is now disposed
   * ```
   */
  autoDispose?: boolean;
};

export type SignalKind = "mutable" | "computed";

/**
 * A tag for grouping signals together.
 *
 * Tags allow you to perform batch operations on multiple signals,
 * such as resetting form fields or disposing resources.
 *
 * @template TValue - The type of values held by signals in this tag
 */
export type Tag<TValue, TKind extends SignalKind = SignalKind> = {
  kind: TKind;
  /**
   * Iterates over all signals in this tag.
   *
   * @param fn - Function to call for each signal
   */
  forEach(fn: (signal: Signal<TValue>) => void): void;

  /**
   * Returns all signals in this tag as an array.
   *
   * @returns Array of signals
   */
  signals(): Signal<TValue>[];

  /**
   * Checks if a signal is in this tag.
   *
   * @param signal - Signal to check
   * @returns True if signal is in tag
   */
  has(signal: Signal<TValue>): boolean;

  /**
   * Removes a signal from this tag.
   *
   * @param signal - Signal to remove
   * @returns True if signal was in tag and removed
   */
  delete(signal: Signal<TValue>): boolean;

  /**
   * Removes all signals from this tag.
   */
  clear(): void;

  /**
   * Number of signals in this tag.
   */
  readonly size: number;

  /**
   * Internal method to add a signal to this tag.
   * Called automatically by signal() when tags option is provided.
   *
   * @internal
   */
  _add(signal: Signal<TValue>): void;

  /**
   * Internal method to delete a signal from this tag.
   * Called automatically when signal is disposed.
   *
   * @internal
   */
  _delete(signal: Signal<TValue>): void;
};

/**
 * Type helper to extract the union of value types from an array of tags.
 *
 * @internal
 */
export type UnionOfTagTypes<T extends readonly Tag<any>[]> =
  T extends readonly [Tag<infer U>, ...infer Rest]
    ? U | UnionOfTagTypes<Rest extends readonly Tag<any>[] ? Rest : never>
    : never;

/**
 * Creates a tag for grouping signals together.
 *
 * Tags enable batch operations on multiple signals, such as:
 * - Resetting groups of signals
 * - Disposing resources
 * - Debugging and logging
 *
 * **Automatic Cleanup:**
 * Signals are automatically removed from their tags when disposed.
 * This prevents memory leaks and ensures tags stay up-to-date.
 *
 * @template TValue - The type of values held by signals in this tag
 * @param options - Configuration options for the tag
 * @returns A new tag instance
 *
 * @example Basic usage
 * ```ts
 * const formFields = tag<string>();
 *
 * const name = signal('', { tags: [formFields] });
 * const email = signal('', { tags: [formFields] });
 *
 * // Reset all form fields
 * formFields.forEach(field => field.reset());
 * ```
 *
 * @example With options
 * ```ts
 * const limitedPool = tag<number>({
 *   name: 'limitedPool',
 *   maxSize: 10,
 *   onChange: (type, signal, tag) => {
 *     console.log(`Pool size: ${tag.size}`);
 *   }
 * });
 * ```
 */
export function tag<TValue, TKind extends SignalKind = SignalKind>(
  options: TagOptions<NoInfer<TValue>> = {}
): Tag<TValue, TKind> {
  // Internal storage for signals in this tag
  // Using Set for O(1) lookups, additions, and deletions
  const signals = new Set<Signal<TValue>>();
  const { name, maxSize, onAdd, onDelete, onChange, autoDispose } = options;

  const tagInstance: Tag<TValue, TKind> = {
    // Kind is a compile-time marker only, not used at runtime
    // Set to null because we don't track signal kinds at runtime
    kind: null as unknown as TKind,
    forEach(fn: (signal: Signal<TValue>) => void): void {
      signals.forEach(fn);
    },

    signals(): Signal<TValue>[] {
      return Array.from(signals);
    },

    has(signal: Signal<TValue>): boolean {
      return signals.has(signal);
    },

    delete(signal: Signal<TValue>): boolean {
      // Check if signal exists before attempting deletion
      const existed = signals.has(signal);

      if (!existed) {
        return false; // Signal not in tag, nothing to do
      }

      // Step 1: Remove from set first
      // This prevents re-entrance if callbacks trigger other operations
      signals.delete(signal);

      // Step 2: Call callbacks BEFORE disposing
      // This allows callbacks to access signal state before disposal
      onDelete?.(signal, tagInstance);
      onChange?.("delete", signal, tagInstance);

      // Step 3: Dispose signal if autoDispose is enabled
      // Do this last so callbacks can still access the signal
      // Note: signal.dispose() will call _delete() on all its tags,
      // but since we already removed it from our set, it's a no-op
      if (autoDispose) {
        signal.dispose();
      }

      return true;
    },

    clear(): void {
      // Early exit if tag is already empty
      if (signals.size === 0) {
        return; // Nothing to clear
      }

      // Step 1: Capture signals before clearing
      // Create array copy because we'll iterate while modifying the set
      const signalsToRemove = Array.from(signals);

      // Step 2: Clear the set first
      // This prevents re-entrance issues if callbacks trigger other operations
      signals.clear();

      // Step 3: Process each signal removal
      for (const signal of signalsToRemove) {
        // Call callbacks BEFORE disposing
        // This allows callbacks to access signal state
        onDelete?.(signal, tagInstance);
        onChange?.("delete", signal, tagInstance);

        // Dispose signal if autoDispose is enabled
        // Note: signal.dispose() will call _delete() on all its tags,
        // but since we already cleared our set, it's a no-op
        if (autoDispose) {
          signal.dispose();
        }
      }
    },

    get size(): number {
      return signals.size;
    },

    _add(signal: Signal<TValue>): void {
      // Internal method called by signal() during creation
      // Not meant to be called directly by users

      // Step 1: Validate signal is from rextive
      // Prevents tagging non-signal objects
      if (!is(signal)) {
        throw new Error("Only signals created by rextive can be tagged");
      }

      // Step 2: Check for duplicates
      // Idempotent - safe to call multiple times with same signal
      if (signals.has(signal)) {
        return; // Already in tag, nothing to do
      }

      // Step 3: Enforce max size limit (if configured)
      // Prevents unbounded growth and potential memory leaks
      if (maxSize !== undefined && signals.size >= maxSize) {
        throw new Error(
          `Tag${
            name ? ` "${name}"` : ""
          } has reached maximum size of ${maxSize}`
        );
      }

      // Step 4: Add signal to internal set
      signals.add(signal);

      // Step 5: Notify via callbacks
      // Called AFTER signal is added so tag.size is correct
      onAdd?.(signal, tagInstance);
      onChange?.("add", signal, tagInstance);
    },

    _delete(signal: Signal<TValue>): void {
      // Internal method called by signal.dispose()
      // This is the automatic cleanup path when a signal is disposed

      // Key difference from delete():
      // - delete() is user-initiated and MAY auto-dispose the signal
      // - _delete() is signal-initiated (disposal already happening)

      // Remove from set
      const existed = signals.delete(signal);

      if (existed) {
        // Note: Don't auto-dispose here!
        // The signal is already being disposed (this is called FROM signal.dispose())
        // Calling dispose() again would be redundant and could cause issues

        // Still call callbacks to notify about the removal
        onDelete?.(signal, tagInstance);
        onChange?.("delete", signal, tagInstance);
      }
    },
  };

  return tagInstance;
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
   */
  export function forEach<const T extends readonly Tag<any>[]>(
    tags: T,
    fn: (signal: Signal<UnionOfTagTypes<T>>) => void
  ): void {
    // De-duplication: Track signals we've already processed
    // A signal might belong to multiple tags in the array
    const seen = new Set<Signal<any>>();

    // Iterate through each tag
    for (const t of tags) {
      t.forEach((signal) => {
        // Only process each signal once
        if (!seen.has(signal)) {
          seen.add(signal);
          fn(signal as Signal<UnionOfTagTypes<T>>);
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
   */
  export function signals<const T extends readonly Tag<any>[]>(
    tags: T
  ): Signal<UnionOfTagTypes<T>>[] {
    const result: Signal<UnionOfTagTypes<T>>[] = [];

    // De-duplication: Track signals we've already added
    // A signal might belong to multiple tags in the array
    const seen = new Set<Signal<any>>();

    // Collect signals from all tags
    for (const t of tags) {
      t.forEach((signal) => {
        // Only add each signal once
        if (!seen.has(signal)) {
          seen.add(signal);
          result.push(signal as Signal<UnionOfTagTypes<T>>);
        }
      });
    }

    return result;
  }
}
