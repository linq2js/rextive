import debounce from "lodash/debounce";
import { signal as createSignal } from "./signal";
import { effect } from "./effect";
import { snapshot } from "./snapshot";
import type { Signal } from "./types";
import { withDispatchers } from "./dispatcher";
import { effectToken, globalEffectDispatcher } from "./effectDispatcher";

/**
 * Represents a single entry in the history.
 */
export type HistoryEntry<T> = {
  /** The captured value at this point in time */
  value: T;
  /** Unix timestamp (ms) when this entry was recorded */
  timestamp: number;
  /** Sequential index in the history (0-based) */
  index: number;
};

/**
 * Query utilities for history signal.
 */
export type HistoryQuery<T> = {
  /** Clear all history entries */
  clear(): void;

  /** Get the most recent entry */
  latest(): HistoryEntry<T> | undefined;

  /** Get the oldest entry */
  oldest(): HistoryEntry<T> | undefined;

  /** Get entry at specific index (negative indices count from end) */
  at(index: number): HistoryEntry<T> | undefined;

  /** Get a range of entries */
  slice(start?: number, end?: number): HistoryEntry<T>[];

  /** Filter entries by predicate */
  filter(predicate: (entry: HistoryEntry<T>) => boolean): HistoryEntry<T>[];

  /** Find first entry matching predicate */
  find(
    predicate: (entry: HistoryEntry<T>) => boolean
  ): HistoryEntry<T> | undefined;

  /** Get entries between two timestamps (inclusive) */
  between(startTime: number, endTime: number): HistoryEntry<T>[];

  /** Get entries after timestamp (exclusive) */
  since(timestamp: number): HistoryEntry<T>[];

  /** Get entries before timestamp (exclusive) */
  before(timestamp: number): HistoryEntry<T>[];

  /** Extract just the values (without metadata) */
  values(): T[];

  /** Get total number of entries */
  count(): number;
};

/**
 * Options for configuring history tracking.
 */
export type HistoryOptions<T> = {
  /**
   * Debounce time in milliseconds before recording a new entry.
   * Prevents recording too many entries during rapid changes.
   * @default 0
   */
  debounce?: number;

  /**
   * Maximum number of entries to keep in history.
   * When exceeded, oldest entries are removed.
   * @default Infinity
   */
  maxLength?: number;

  /**
   * Custom function to determine if a new entry should be added.
   * Receives the previous entry (or undefined if first) and the proposed next entry.
   * Return true to add the entry, false to skip it.
   *
   * @example
   * ```ts
   * // Only record if value actually changed
   * shouldRecord: (prev, next) => {
   *   return !prev || JSON.stringify(prev.value) !== JSON.stringify(next.value);
   * }
   * ```
   */
  shouldRecord?: (
    prev: HistoryEntry<T> | undefined,
    next: HistoryEntry<T>
  ) => boolean;
};

/**
 * Creates a signal that tracks the history of another signal's values over time.
 *
 * The history signal automatically records snapshots of the tracked value whenever it changes,
 * with optional debouncing and filtering. Each entry includes the value, timestamp, and sequential index.
 *
 * @param getValue - Function that returns the value to track (typically reads signals)
 * @param options - Configuration options for history tracking
 * @returns A signal containing an array of history entries
 *
 * @example
 * ```ts
 * const count = signal(0);
 * const history = signal.history(() => count(), { debounce: 300 });
 *
 * count.set(1);
 * count.set(2);
 * count.set(3);
 *
 * // After 300ms debounce
 * console.log(history());
 * // [
 * //   { value: 0, timestamp: 1234567890, index: 0 },
 * //   { value: 3, timestamp: 1234567893, index: 1 }
 * // ]
 * ```
 *
 * @example
 * ```ts
 * // Track form changes with custom filtering
 * const formData = {
 *   name: signal("John"),
 *   email: signal("john@example.com")
 * };
 *
 * const history = signal.history(
 *   () => signal.snapshot({ name: formData.name, email: formData.email }),
 *   {
 *     debounce: 500,
 *     maxLength: 50,
 *     shouldRecord: (prev, next) => {
 *       // Only record if values actually changed
 *       return !prev || JSON.stringify(prev.value) !== JSON.stringify(next.value);
 *     }
 *   }
 * );
 *
 * // Access history
 * history()[history().length - 1]; // Latest entry
 * history()[0]; // Oldest entry
 * ```
 *
 * @example
 * ```ts
 * // Time-travel debugging
 * const appState = signal({ count: 0, user: "Alice" });
 * const history = signal.history(() => appState(), { debounce: 100 });
 *
 * // Make changes
 * appState.set({ count: 1, user: "Alice" });
 * appState.set({ count: 2, user: "Bob" });
 *
 * // Review history
 * history().forEach(entry => {
 *   console.log(`[${new Date(entry.timestamp).toISOString()}] Index ${entry.index}:`, entry.value);
 * });
 *
 * // Restore previous state
 * const previousState = history()[history().length - 2];
 * appState.set(previousState.value);
 * ```
 */
export function history<T>(
  getValue: () => T,
  options: HistoryOptions<T> = {}
): Signal<HistoryEntry<T>[]> & HistoryQuery<T> {
  const {
    debounce: debounceMs = 0,
    maxLength = Infinity,
    shouldRecord,
  } = options;

  const historySignal = createSignal<HistoryEntry<T>[]>([]);
  let nextIndex = 0;

  // Function to add a new entry
  const addEntry = (value: T) => {
    const entries = historySignal.peek();
    const prevEntry = entries[entries.length - 1];

    const newEntry: HistoryEntry<T> = {
      value,
      timestamp: Date.now(),
      index: nextIndex++,
    };

    // Check if we should record this entry
    if (shouldRecord && !shouldRecord(prevEntry, newEntry)) {
      return;
    }

    // Add the new entry
    const newEntries = [...entries, newEntry];

    // Trim to maxLength if needed
    if (newEntries.length > maxLength) {
      newEntries.splice(0, newEntries.length - maxLength);
    }

    historySignal.set(newEntries);
  };

  // Debounced version of addEntry
  const debouncedAddEntry = debounce(addEntry, debounceMs);

  // Use effect to reactively track changes
  // Use global effect dispatcher to ensure the effect runs immediately
  withDispatchers([effectToken(globalEffectDispatcher())], () =>
    effect(() => {
      // Call snapshot with peek=false to enable reactive tracking
      const value = snapshot(getValue(), false);
      debouncedAddEntry(value);
    })
  );

  return Object.assign(historySignal, {
    clear() {
      debouncedAddEntry.cancel();
      historySignal.set([]);
      nextIndex = 0;
    },

    latest() {
      const entries = historySignal();
      return entries[entries.length - 1];
    },

    oldest() {
      const entries = historySignal();
      return entries[0];
    },

    at(index: number) {
      const entries = historySignal();
      if (index < 0) {
        // Negative index counts from end
        return entries[entries.length + index];
      }
      return entries[index];
    },

    slice(start?: number, end?: number) {
      return historySignal().slice(start, end);
    },

    filter(predicate: (entry: HistoryEntry<T>) => boolean) {
      return historySignal().filter(predicate);
    },

    find(predicate: (entry: HistoryEntry<T>) => boolean) {
      return historySignal().find(predicate);
    },

    between(startTime: number, endTime: number) {
      return historySignal().filter(
        (entry) => entry.timestamp >= startTime && entry.timestamp <= endTime
      );
    },

    since(timestamp: number) {
      return historySignal().filter((entry) => entry.timestamp > timestamp);
    },

    before(timestamp: number) {
      return historySignal().filter((entry) => entry.timestamp < timestamp);
    },

    values() {
      return historySignal().map((entry) => entry.value);
    },

    count() {
      return historySignal().length;
    },
  });
}
