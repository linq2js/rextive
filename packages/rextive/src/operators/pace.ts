import { signal } from "../signal";
import type { Signal, Computed } from "../types";
import type { Scheduler, Operator } from "./types";
import { AUTO_NAME_PREFIX } from "../utils/nameGenerator";
import { wrapDispose } from "../disposable";

/**
 * Creates a derived signal that updates according to the provided scheduler.
 *
 * The scheduler controls when updates from the source signal are propagated
 * to the derived signal. This enables patterns like debouncing and throttling.
 *
 * @param scheduler - A function that wraps the notify callback to control timing
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
 * // Debounce scheduler
 * const debounceScheduler = (ms) => (notify) => {
 *   let timeoutId;
 *   return () => {
 *     clearTimeout(timeoutId);
 *     timeoutId = setTimeout(notify, ms);
 *   };
 * };
 * const debounced = pace(debounceScheduler(300))(source);
 */
export function pace<T>(scheduler: Scheduler): Operator<T> {
  return (source: Signal<T>): Computed<T> => {
    // Internal mutable signal holds the paced value (hidden from devtools by default)
    const internal = signal(source(), {
      name: `${AUTO_NAME_PREFIX}pace_internal(${source.displayName})`,
    });

    // Computed signal exposes it as read-only (hidden from devtools by default)
    const result = signal({ internal }, ({ deps }) => deps.internal, {
      name: `${AUTO_NAME_PREFIX}paced(${source.displayName})`,
    });

    // Track if disposed to prevent updates after disposal
    let disposed = false;

    // The notify function updates the internal signal with source's current value
    const notify = () => {
      if (!disposed) {
        internal.set(source());
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
