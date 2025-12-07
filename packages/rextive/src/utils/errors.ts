/**
 * Error thrown when attempting to perform an operation on a disposed signal.
 *
 * @example
 * ```ts
 * try {
 *   disposedSignal.set(value);
 * } catch (e) {
 *   if (e instanceof SignalDisposedError) {
 *     console.log(`Signal "${e.signalName}" was disposed`);
 *     console.log(`Operation attempted: ${e.operation}`);
 *   }
 * }
 * ```
 */
export class SignalDisposedError extends Error {
  readonly name = "SignalDisposedError";

  constructor(
    /** The name/displayName of the disposed signal */
    readonly signalName: string,
    /** The operation that was attempted on the disposed signal */
    readonly operation: "set" | "reset" | "refresh" | "stale" | "recompute"
  ) {
    const messages: Record<SignalDisposedError["operation"], string> = {
      set: `Cannot set value on disposed signal: ${signalName}`,
      reset: `Cannot reset disposed signal: ${signalName}`,
      refresh: `Cannot refresh disposed signal: ${signalName}`,
      stale: `Cannot mark disposed signal as stale: ${signalName}`,
      recompute: `Cannot recompute disposed signal: ${signalName}`,
    };
    super(messages[operation]);
  }
}

/**
 * Centralized error factory for Rextive signals
 *
 * Provides consistent error messages with signal names for easier debugging.
 * All methods return `SignalDisposedError` which can be caught and identified.
 *
 * @example
 * ```ts
 * try {
 *   signal.set(value);
 * } catch (e) {
 *   if (e instanceof SignalDisposedError) {
 *     // Handle disposed signal error
 *   }
 * }
 * ```
 */
export const errors = {
  /**
   * Error when trying to set value on a disposed signal
   */
  cannotSet(signalName: string): SignalDisposedError {
    return new SignalDisposedError(signalName, "set");
  },

  /**
   * Error when trying to reset a disposed signal
   */
  cannotReset(signalName: string): SignalDisposedError {
    return new SignalDisposedError(signalName, "reset");
  },

  /**
   * Error when trying to refresh a disposed signal
   */
  cannotRefresh(signalName: string): SignalDisposedError {
    return new SignalDisposedError(signalName, "refresh");
  },

  /**
   * Error when trying to mark a disposed signal as stale
   */
  cannotStale(signalName: string): SignalDisposedError {
    return new SignalDisposedError(signalName, "stale");
  },

  /**
   * Error when trying to recompute a disposed signal
   */
  cannotRecompute(signalName: string): SignalDisposedError {
    return new SignalDisposedError(signalName, "recompute");
  },
};
