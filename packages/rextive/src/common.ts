/**
 * Constants used throughout the rextive library.
 *
 * This file contains shared constants to avoid circular dependencies
 * between signal implementation files.
 */

/**
 * Standard error message thrown when trying to access a disposed signal.
 */
export const DISPOSED_MESSAGE = "Signal is disposed";

/**
 * Error thrown when both a signal's compute function and its fallback function fail.
 *
 * This wraps both the original error and the fallback error for debugging.
 */
export class FallbackError extends Error {
  constructor(
    public readonly originalError: unknown,
    public readonly fallbackError: unknown,
    public readonly signalName?: string
  ) {
    super(
      `Signal${
        signalName ? ` "${signalName}"` : ""
      } compute function threw an error, ` +
        `and the fallback function also threw an error.\n` +
        `Original error: ${originalError}\n` +
        `Fallback error: ${fallbackError}`
    );
    this.name = "FallbackError";
  }
}
