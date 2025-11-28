import type { Signal, Computed } from "../types";
import type { Scheduler, Operator } from "./types";
import { pace } from "./pace";

/**
 * Creates a scheduler that delays notifications by a fixed duration or until a specific time.
 *
 * Unlike debounce, delay queues each notification independently. Every change
 * from the source will eventually be delivered, just later.
 *
 * @param due - Either milliseconds to delay, or a Date to delay until
 * @returns A scheduler function
 */
export function delayScheduler(due: number | Date): Scheduler {
  return (notify) => {
    return () => {
      const ms =
        due instanceof Date ? Math.max(0, due.getTime() - Date.now()) : due;

      setTimeout(notify, ms);
    };
  };
}

/**
 * Creates a delayed signal from a source signal.
 *
 * Each value change from the source is delivered after the specified delay.
 * Unlike debounce, all values are eventually delivered (not coalesced).
 *
 * @param due - Either milliseconds to delay, or a Date to delay until
 * @returns An operator function that takes a source signal and returns a Computed signal
 *
 * @example
 * // Delay by 500ms
 * const source = signal(0);
 * const delayed = delay(500)(source);
 *
 * source.set(1); // delayed will be 1 after 500ms
 * source.set(2); // delayed will be 2 after another 500ms
 *
 * @example
 * // Delay until a specific time
 * const showBanner = signal(false);
 * const bannerVisible = delay(new Date('2024-01-01T00:00:00'))(showBanner);
 *
 * @example
 * // Use with pipe
 * const notifications = signal([]);
 * const delayedNotifications = notifications.pipe(delay(1000));
 */
export function delay<T>(due: number | Date): Operator<T> {
  return (source: Signal<T>): Computed<T> => {
    return pace<T>(delayScheduler(due))(source);
  };
}

