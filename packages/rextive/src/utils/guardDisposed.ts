import { AnyFunc } from "../types";

/**
 * Wraps a function to throw an error if the signal is disposed.
 *
 * @param isDisposed - Function that returns true if the signal is disposed
 * @param createError - Factory function that creates the error to throw
 * @param fn - The function to wrap
 * @returns A wrapped function that throws if disposed
 *
 * @example
 * const set = guardDisposed(
 *   isDisposed,
 *   () => errors.cannotSet(displayName),
 *   (value) => { ... }
 * );
 */
export function guardDisposed<T extends AnyFunc>(
  isDisposed: () => boolean,
  createError: () => Error,
  fn: T
) {
  return (...args: Parameters<T>) => {
    if (isDisposed()) {
      throw createError();
    }
    return fn(...args);
  };
}
