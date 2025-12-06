import type { Signal, Computed, SignalOptions } from "../types";
import type { Scheduler, Operator } from "./types";
import { pace } from "./pace";
import { operatorId, chainName } from "../utils/nameGenerator";

/**
 * Creates a scheduler that debounces notifications.
 *
 * Debouncing delays the notification until after a specified time has passed
 * since the last call. Each call resets the timer.
 *
 * @param ms - The debounce delay in milliseconds
 * @returns A scheduler function
 */
export function debounceScheduler(ms: number): Scheduler {
  return (notify) => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    return () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        timeoutId = undefined;
        notify();
      }, ms);
    };
  };
}

/**
 * Creates a debounced signal from a source signal.
 *
 * The debounced signal only updates after the source has stopped changing
 * for the specified duration. Rapid changes are coalesced into a single update.
 *
 * @param ms - The debounce delay in milliseconds
 * @returns An operator function that takes a source signal and returns a Computed signal
 *
 * @example
 * const searchInput = signal("");
 * const debouncedSearch = debounce(300)(searchInput);
 *
 * // User types rapidly: "h" -> "he" -> "hel" -> "hello"
 * // debouncedSearch only updates to "hello" after 300ms of no typing
 *
 * @example
 * // Use in form validation
 * const email = signal("");
 * const emailDebounced = debounce(500)(email);
 * const emailError = signal({ email: emailDebounced }, ({ deps }) =>
 *   validateEmail(deps.email)
 * );
 */
export function debounce<T>(
  ms: number,
  options: SignalOptions<T> = {}
): Operator<T> {
  return (source: Signal<T>): Computed<T> => {
    // Use custom name if provided, otherwise generate chain name
    const opId = operatorId("debounce");
    const name = options?.name ?? chainName(source.displayName, opId);

    return pace<T>(debounceScheduler(ms), { name })(source);
  };
}
