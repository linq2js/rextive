import type { Signal, Computed } from "../types";

/**
 * A scheduler controls when notifications propagate.
 * It receives a notify function and returns a wrapped version
 * that controls the timing of when notify() is actually called.
 *
 * @example
 * // Debounce scheduler
 * const debounceScheduler = (ms: number): Scheduler => (notify) => {
 *   let timeoutId: ReturnType<typeof setTimeout>;
 *   return () => {
 *     clearTimeout(timeoutId);
 *     timeoutId = setTimeout(notify, ms);
 *   };
 * };
 */
export type Scheduler = (notify: VoidFunction) => VoidFunction;

/**
 * An operator transforms a source signal into a new signal.
 */
export type Operator<T, R = T> = (source: Signal<T>) => Computed<R>;

