import { signal } from "../signal";
import type { Signal, Computed } from "../types";
import type { Scheduler, Operator, OperatorNameOptions } from "./types";
import { autoPrefix } from "../utils/nameGenerator";
import { wrapDispose } from "../disposable";

/**
 * Options for the pace operator.
 */
export interface PaceOptions extends OperatorNameOptions {}

/**
 * Creates a derived signal that updates according to the provided scheduler.
 *
 * The scheduler controls when updates from the source signal are propagated
 * to the derived signal. This enables patterns like debouncing and throttling.
 *
 * @param scheduler - A function that wraps the notify callback to control timing
 * @param options - Optional configuration for the pace operator
 * @returns An operator function that takes a source signal and returns a Computed signal
 *
 * @example
 * // Identity scheduler (pass-through)
 * const result = pace(notify => notify)(source);
 *
 * @example
 * // Delay scheduler
 * const delayed = pace(notify => () => setTimeout(notify, 100))(source);
 *
 * @example
 * // Debounce scheduler with custom name
 * const debounceScheduler = (ms) => (notify) => {
 *   let timeoutId;
 *   return () => {
 *     clearTimeout(timeoutId);
 *     timeoutId = setTimeout(notify, ms);
 *   };
 * };
 * const debounced = pace(debounceScheduler(300), { name: "debounce" })(source);
 */
export function pace<T>(
  scheduler: Scheduler,
  options: PaceOptions = {}
): Operator<T> {
  return (source: Signal<T>): Computed<T> => {
    // If custom name provided, use it directly; otherwise include source name
    const baseName = options.name ?? `pace(${source.displayName})`;

    // Internal mutable signal holds the paced value (hidden from devtools by default)
    // Use peek() to avoid triggering render tracking
    const internal = signal(source.peek(), {
      name: autoPrefix(`${baseName}_internal`),
    });

    // Computed signal exposes it as read-only (hidden from devtools by default)
    const result = signal({ internal }, ({ deps }) => deps.internal, {
      name: autoPrefix(baseName),
    });

    // Track if disposed to prevent updates after disposal
    let disposed = false;

    // The notify function updates the internal signal with source's current value
    const notify = () => {
      if (!disposed) {
        // Use peek() to avoid triggering render tracking
        internal.set(source.peek());
      }
    };

    // Wrap notify with the scheduler
    const scheduledNotify = scheduler(notify);

    // Subscribe to source changes
    const unsubscribe = source.on(() => {
      if (!disposed) {
        scheduledNotify();
      }
    });

    // Override dispose to clean up everything
    wrapDispose(result, [unsubscribe, internal], "after");

    return result;
  };
}
