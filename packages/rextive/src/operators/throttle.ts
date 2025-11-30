import type { Signal, Computed, SignalOptions } from "../types";
import type { Scheduler, Operator } from "./types";
import { pace } from "./pace";

/**
 * Creates a scheduler that throttles notifications.
 *
 * Throttling allows the first notification through immediately (leading edge),
 * then ignores subsequent notifications until the throttle period has passed.
 * If notifications occurred during the throttle period, a trailing notification
 * is emitted at the end.
 *
 * @param ms - The throttle interval in milliseconds
 * @returns A scheduler function
 */
export function throttleScheduler(ms: number): Scheduler {
  return (notify) => {
    let lastTime = 0;
    let trailingTimeout: ReturnType<typeof setTimeout> | undefined;
    let hasTrailing = false;

    return () => {
      const now = Date.now();
      const elapsed = now - lastTime;

      if (elapsed >= ms) {
        // Leading edge: enough time has passed, notify immediately
        lastTime = now;
        hasTrailing = false;

        if (trailingTimeout !== undefined) {
          clearTimeout(trailingTimeout);
          trailingTimeout = undefined;
        }

        notify();
      } else {
        // Throttled: schedule trailing edge if not already scheduled
        hasTrailing = true;

        if (trailingTimeout === undefined) {
          trailingTimeout = setTimeout(() => {
            trailingTimeout = undefined;
            if (hasTrailing) {
              lastTime = Date.now();
              hasTrailing = false;
              notify();
            }
          }, ms - elapsed);
        }
      }
    };
  };
}

/**
 * Creates a throttled signal from a source signal.
 *
 * The throttled signal updates immediately on the first change (leading edge),
 * then rate-limits subsequent changes to at most once per the specified interval.
 * A trailing update is emitted if changes occurred during the throttle period.
 *
 * @param ms - The throttle interval in milliseconds
 * @returns An operator function that takes a source signal and returns a Computed signal
 *
 * @example
 * const scrollY = signal(0);
 * const throttledScroll = throttle(100)(scrollY);
 *
 * // Scroll events fire rapidly (60fps = every 16ms)
 * // throttledScroll updates at most every 100ms
 *
 * @example
 * // Use with expensive computations
 * const mousePosition = signal({ x: 0, y: 0 });
 * const throttledPosition = throttle(50)(mousePosition);
 * const heatmap = signal({ pos: throttledPosition }, ({ deps }) =>
 *   expensiveHeatmapCalculation(deps.pos)
 * );
 */
export function throttle<T>(
  ms: number,
  options: SignalOptions<T> = {}
): Operator<T> {
  return (source: Signal<T>): Computed<T> => {
    const baseName = options?.name ?? `throttle(${source.displayName})`;
    return pace<T>(throttleScheduler(ms), {
      name: baseName,
    })(source);
  };
}
