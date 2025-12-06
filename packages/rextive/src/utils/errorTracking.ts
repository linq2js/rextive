import { isPromiseLike } from "./isPromiseLike";
import { task } from "./task";

// ============================================================================
// ERROR TRACING
// ============================================================================

/**
 * When the error occurred in the signal lifecycle.
 */
export type SignalErrorWhen =
  | "compute:initial" // First computation when signal is created
  | "compute:refresh" // When refresh() is called explicitly
  | "compute:dependency" // When dependency changes trigger recompute
  | "set" // When set() is called
  | "when:filter" // When .when() filter function throws
  | "when:reducer" // When .when() reducer function throws
  | "when:action"; // When .when() action function throws

/**
 * Trace information attached to an error.
 * One error can have multiple traces as it propagates through signals.
 */
export interface SignalErrorTrace {
  /** Signal display name */
  signal: string;
  /** When the error occurred */
  when: SignalErrorWhen;
  /** true = Promise rejection, false = sync throw */
  async: boolean;
  /** Timestamp when error was captured */
  timestamp: number;
}

/** Internal storage for error traces (WeakMap allows GC) */
const errorTraces = new WeakMap<object, SignalErrorTrace[]>();

/**
 * Add trace info to an error.
 * Can be called multiple times for the same error as it propagates.
 *
 * @param error - The error object (must be object, primitives are ignored)
 * @param trace - Trace info (timestamp is added automatically)
 */
export function addErrorTrace(
  error: unknown,
  trace: Omit<SignalErrorTrace, "timestamp">
): void {
  if (typeof error !== "object" || error === null) return;
  const existing = errorTraces.get(error) ?? [];
  existing.push({ ...trace, timestamp: Date.now() });
  errorTraces.set(error, existing);
}

/**
 * Get trace info from an error.
 * Returns array of traces showing the error propagation path.
 *
 * @param error - The error to get traces for
 * @returns Array of traces, or undefined if no traces or not an object
 *
 * @example
 * ```ts
 * const traces = getErrorTrace(error);
 * if (traces) {
 *   console.log("Error path:", traces.map(t => t.signal).join(" → "));
 * }
 * ```
 */
export function getErrorTrace(error: unknown): SignalErrorTrace[] | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  return errorTraces.get(error);
}

// ============================================================================
// ASYNC TRACKING
// ============================================================================

/**
 * Tracks when a Promise value settles (resolves or rejects).
 *
 * When the current value is a Promise, this attaches handlers for both
 * resolve and reject. The onSettled callback only fires if the value
 * hasn't changed since the Promise was captured (i.e., it's not stale).
 *
 * This enables auto-notification to dependents when async signals complete.
 * Error information can be retrieved via `task.from(promise)` - no need to
 * store errors separately.
 *
 * @param getCurrent - Function that returns the current value
 * @param onSettled - Callback fired when Promise settles (if not stale)
 *
 * @example
 * ```ts
 * // In signal implementation:
 * current = { value: result };
 * notifyChange();
 *
 * // Auto-notify dependents when promise settles
 * trackAsync(
 *   () => current?.value,
 *   () => notifyChange()
 * );
 * ```
 */
export function trackAsync<T>(
  getCurrent: () => T | undefined,
  onSettled: () => void
): void {
  const prevValue = getCurrent();

  // Only track if value is a Promise
  if (!isPromiseLike(prevValue)) {
    return;
  }

  // Prevent unhandled rejection warning
  if (prevValue instanceof Promise) {
    prevValue.catch(() => {});
  }

  // cache promise
  task.from(prevValue);

  // Call onSettled when promise settles (resolve or reject)
  prevValue.then(
    () => {
      // Check staleness - only notify if still current
      if (getCurrent() === prevValue) {
        onSettled();
      }
    },
    () => {
      // Same for rejection
      if (getCurrent() === prevValue) {
        onSettled();
      }
    }
  );
}
