import { isPromiseLike } from "./isPromiseLike";

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
  | "when:reducer"; // When .when() reducer function throws

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
// ASYNC ERROR TRACKING
// ============================================================================

/**
 * Represents the current state of a signal value.
 */
export interface CurrentState {
  value: unknown;
  error?: unknown;
}

/**
 * Tracks async errors for signal values.
 *
 * When the current value is a Promise, this attaches a rejection handler.
 * The error callback only fires if the current state hasn't changed since
 * the Promise was captured (i.e., it's not stale).
 *
 * @param getCurrent - Function that returns the current state
 * @param onError - Callback fired when Promise rejects (if not stale)
 *
 * @example
 * ```ts
 * // In signal implementation:
 * current = { value: result };
 * notifyChange();
 *
 * trackAsyncError(
 *   () => current,
 *   (error) => {
 *     current = { ...current!, error };
 *     onErrorValue.emit(error);
 *     notifyChange();
 *   }
 * );
 * ```
 */
export function trackAsyncError(
  getCurrent: () => CurrentState | undefined,
  onError: (error: unknown) => void
): void {
  const prevCurrent = getCurrent();

  // Only track if value is a Promise
  if (!prevCurrent || !isPromiseLike(prevCurrent.value)) {
    return;
  }

  const promise = prevCurrent.value;

  // Prevent unhandled rejection warning
  if (promise instanceof Promise) {
    promise.catch(() => {});
  }

  promise.then(undefined, (error) => {
    const nextCurrent = getCurrent();

    // Stale - current has changed (e.g., refresh was called)
    if (prevCurrent !== nextCurrent) {
      return;
    }

    onError(error);
  });
}
