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

import {
  type Signal,
  type Tag,
  type SignalKind,
  TAG_TYPE,
  SignalOf,
  UseList,
} from "./types";
import { is } from "./is";
import { nextName } from "./utils/nameGenerator";
import { emit } from "./hooks";

/**
 * Configuration options for creating a tag.
 *
 * @template TValue - The type of values held by signals in this tag
 * @template TKind - The signal kind: "mutable", "computed", or both (default: SignalKind)
 */
export type TagOptions<TValue, TKind extends SignalKind = "any"> = {
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
  onAdd?: (signal: SignalOf<TValue, TKind>, tag: Tag<TValue, TKind>) => void;

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
  onDelete?: (signal: SignalOf<TValue, TKind>, tag: Tag<TValue, TKind>) => void;

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
  onChange?: (
    type: "add" | "delete",
    signal: SignalOf<TValue, TKind>,
    tag: Tag<TValue, TKind>
  ) => void;

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

  /**
   * Plugins to automatically apply to all signals added to this tag.
   *
   * When a signal is added to a tag (via `tags` option during creation),
   * all plugins from the tag are automatically executed on that signal.
   *
   * This enables shared behavior across groups of signals without
   * manually applying plugins to each signal.
   *
   * **Note:** Plugins are executed ONCE when the signal is added to the tag,
   * not on every signal change. Use `signal.on()` inside plugins for reactive behavior.
   *
   * @example Logging all signals in a tag
   * ```ts
   * const logger: Plugin<any> = (signal) => {
   *   console.log('Signal added:', signal.displayName);
   *   return signal.on(() => {
   *     console.log(`[${signal.displayName}]:`, signal());
   *   });
   * };
   *
   * const debugTag = tag({ use: [logger] });
   * const count = signal(0, { name: 'count', tags: [debugTag] });
   * // Logs: "Signal added: count"
   * // Later: "count: 0", "count: 1", etc.
   * ```
   *
   * @example Persistence for tagged signals
   * ```ts
   * const persister: Plugin<any, "mutable"> = (signal) => {
   *   const key = signal.displayName || 'unnamed';
   *   const stored = localStorage.getItem(key);
   *   if (stored) signal.set(JSON.parse(stored));
   *   return signal.on(() => {
   *     localStorage.setItem(key, JSON.stringify(signal()));
   *   });
   * };
   *
   * const persistedTag = tag({ use: [persister] });
   * const settings = signal({}, {
   *   name: 'settings',
   *   tags: [persistedTag]
   * }); // Automatically persisted
   * ```
   *
   * @example Combining plugins from signal and tag
   * ```ts
   * const validator: Plugin<string> = (signal) => {
   *   return signal.on(() => {
   *     if (signal().length > 100) throw new Error('Too long');
   *   });
   * };
   *
   * const tracker: Plugin<any> = (signal) => {
   *   console.log('Tracking:', signal.displayName);
   * };
   *
   * const validatedTag = tag({ use: [validator] });
   *
   * const input = signal('', {
   *   use: [tracker],           // Signal's own plugin
   *   tags: [validatedTag]      // Tag's plugin applied too
   * });
   * // Both tracker and validator plugins are active
   * ```
   */
  use?: UseList<TValue, TKind>;
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
export function tag<TValue, TKind extends SignalKind = "any">(
  options: TagOptions<NoInfer<TValue>, TKind> = {}
): Tag<TValue, TKind> {
  // Internal storage for signals in this tag
  // Using Set for O(1) lookups, additions, and deletions
  const signals = new Set<SignalOf<TValue, TKind>>();
  const { name, maxSize, onAdd, onDelete, onChange, autoDispose, use } =
    options;

  // Generate display name: use provided name or auto-generate for devtools
  const displayName = name ?? nextName("tag");

  const tagInstance: Tag<NoInfer<TValue>, TKind> = {
    [TAG_TYPE]: true,

    // Debug name for development/devtools
    displayName,

    // Store plugins (readonly, cannot be modified after creation)
    use: use || [],

    forEach(fn: (signal: SignalOf<TValue, TKind>) => void): void {
      for (const signal of signals) {
        fn(signal);
      }
    },

    signals(): readonly SignalOf<TValue, TKind>[] {
      return Array.from(signals);
    },

    has(signal: SignalOf<TValue, TKind>): boolean {
      return signals.has(signal);
    },

    delete(signal: SignalOf<TValue, TKind>): boolean {
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

      // Notify devtools
      emit.tagRemove(tagInstance, signal);

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

        // Notify devtools
        emit.tagRemove(tagInstance, signal);

        // Dispose signal if autoDispose is enabled
        // Note: signal.dispose() will call _delete() on all its tags,
        // but since we already cleared our set, it's a no-op
        if (autoDispose) {
          signal.dispose();
        }
      }
    },

    map<TResult>(mapper: (signal: any) => TResult): TResult[] {
      const results: TResult[] = [];
      for (const signal of signals) {
        results.push(mapper(signal));
      }
      return results;
    },

    refreshAll(): void {
      for (const signal of signals) {
        signal.refresh();
      }
    },

    resetAll(): void {
      for (const signal of signals) {
        // Only mutable signals have reset()
        if ("reset" in signal && typeof signal.reset === "function") {
          signal.reset();
        }
      }
    },

    staleAll(): void {
      for (const signal of signals) {
        // Only computed signals have stale()
        if ("stale" in signal && typeof signal.stale === "function") {
          signal.stale();
        }
      }
    },

    disposeAll(): void {
      // Copy to array to avoid mutation during iteration
      const signalsToDispose = [...signals];
      for (const signal of signalsToDispose) {
        signal.dispose();
      }
      // Note: signals are automatically removed from the tag
      // when disposed via the _delete() internal method
    },

    get size(): number {
      return signals.size;
    },

    _add(signal: SignalOf<TValue, TKind>): void {
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

      // Notify devtools
      emit.tagAdd(tagInstance, signal);
    },

    _delete(signal: SignalOf<TValue, TKind>): void {
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

        // Notify devtools
        emit.tagRemove(tagInstance, signal);
      }
    },
  };

  // Notify devtools of tag creation
  emit.tagCreate(tagInstance);

  return tagInstance as Tag<TValue, TKind>;
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
      for (const signal of t.signals()) {
        // Only process each signal once
        if (!seen.has(signal)) {
          seen.add(signal);
          fn(signal as Signal<UnionOfTagTypes<T>>);
        }
      }
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
      for (const signal of t.signals()) {
        // Only add each signal once
        if (!seen.has(signal)) {
          seen.add(signal);
          result.push(signal as Signal<UnionOfTagTypes<T>>);
        }
      }
    }

    return result;
  }
}
