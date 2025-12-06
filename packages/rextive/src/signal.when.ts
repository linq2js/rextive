import type { AnySignal, SignalWhenAction } from "./types";
import type { Emitter } from "./utils/emitter";
import type { SignalErrorWhen } from "./utils/errorTracking";

// ============================================================================
// SIGNAL WHEN - Unified implementation for .when() method
// ============================================================================

/**
 * Configuration for creating a `when` method for a signal.
 *
 * @template TSelf - The signal type (Mutable or Computed)
 */
export type SignalWhenConfig<TSelf> = {
  /**
   * Get the signal instance.
   * This is a getter because the signal may not be fully constructed yet
   * when `signalWhen` is called (used with Object.assign pattern).
   */
  getSelf: () => TSelf;

  /**
   * Dispose emitter to register cleanup handlers.
   * Subscriptions are automatically cleaned up when the signal is disposed.
   */
  onDispose: Emitter<void>;

  /**
   * Error handler function for routing errors through signal's error handling.
   * Used for both filter errors and callback errors.
   */
  throwError: (error: unknown, when: SignalErrorWhen, async: boolean) => void;
};

/**
 * Creates a reusable `when` method for signals.
 *
 * This factory creates a unified `when` function that works for both mutable
 * and computed signals. The signal type is constrained to `AnySignal<any>`,
 * which provides access to `.refresh()`, `.reset()`, and `.stale()` methods.
 *
 * ## Features
 *
 * - **Single or multiple notifiers**: Watch one signal or an array of signals
 * - **Action string overload**: Execute predefined actions ("refresh", "reset", "stale")
 * - **Callback overload**: Execute custom logic with `(self, notifier) => void`
 * - **Optional filter**: Only execute action when filter returns true
 * - **Error handling**: Errors are routed through signal's error handling
 * - **Automatic cleanup**: Subscriptions are cleaned up when signal is disposed
 *
 * ## Parameter Order Summary
 *
 * | Overload | Parameters |
 * |----------|------------|
 * | Action string | `filter?: (notifier, self) => boolean` |
 * | Callback | `action: (self, notifier) => void` |
 *
 * ## Usage
 *
 * @example Mutable signal
 * ```ts
 * const when = signalWhen<Mutable<number>>({
 *   getSelf: () => instanceRef!,
 *   onDispose,
 *   throwError,
 * });
 *
 * // Now `when` can be used as:
 * // signal.when(notifier, "reset")
 * // signal.when(notifier, "refresh", (n, self) => n() > 5)
 * // signal.when(notifier, (self, n) => self.set(self() + n()))
 * ```
 *
 * @example Computed signal
 * ```ts
 * const when = signalWhen<Computed<User>>({
 *   getSelf: () => instanceRef!,
 *   onDispose,
 *   throwError,
 * });
 *
 * // Now `when` can be used as:
 * // signal.when(notifier, "refresh")
 * // signal.when(notifier, "stale")
 * // signal.when(notifier, (self, n) => self.refresh())
 * ```
 *
 * @param config - Configuration object
 * @returns A `when` function to be assigned to the signal instance
 */
export function signalWhen<TSelf extends AnySignal<any>>(
  config: SignalWhenConfig<TSelf>
) {
  const { getSelf, onDispose, throwError } = config;

  /**
   * The `when` method implementation.
   *
   * @param notifier - Single signal or array of signals to watch
   * @param actionOrCallback - Either an action string or callback function
   * @param filter - Optional filter for action string overload
   * @returns The signal instance (for chaining)
   */
  return function when(
    notifier: AnySignal<any> | readonly AnySignal<any>[],
    actionOrCallback:
      | SignalWhenAction
      | ((notifier: AnySignal<any>, self: TSelf) => void),
    filter?: (notifier: AnySignal<any>, self: TSelf) => boolean
  ): TSelf {
    const self = getSelf();

    // Normalize to array for uniform handling
    const notifiers = Array.isArray(notifier) ? notifier : [notifier];

    // Determine overload type once (not on every notification)
    const isActionStringOverload = typeof actionOrCallback === "string";

    // Subscribe to each notifier
    for (const n of notifiers) {
      const unsubscribe = n.on(() => {
        if (isActionStringOverload) {
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // Action string overload: .when(notifier, "refresh", filter?)
          // Filter signature: (notifier, self) => boolean
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          const action = actionOrCallback as SignalWhenAction;

          try {
            // Run filter if provided - receives (notifier, self)
            if (filter) {
              const shouldProceed = filter(n, self);
              if (!shouldProceed) return;
            }

            // Execute the action on the signal
            if (action === "refresh") {
              self.refresh();
            } else if (action === "reset") {
              self.reset();
            } else if (action === "stale") {
              self.stale();
            }
          } catch (error) {
            // Filter threw - route through signal's error handling, skip action
            throwError(error, "when:filter", false);
          }
        } else {
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // Callback overload: .when(notifier, (notifier, self) => void)
          // Callback signature: (notifier, self) => void
          //
          // Why (notifier, self) order?
          // - Caller can use original signal variable directly, no need to use `self`
          // - e.g. `count.when(trigger, (trigger) => count.set(trigger()))`
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          const callback = actionOrCallback as (
            notifier: AnySignal<any>,
            self: TSelf
          ) => void;

          try {
            // Execute callback - receives (notifier, self)
            callback(n, self);
          } catch (error) {
            // Callback threw - route through signal's error handling
            throwError(error, "when:action", false);
          }
        }
      });

      // Register cleanup to unsubscribe when signal is disposed
      onDispose.on(unsubscribe);
    }

    // Return self for method chaining
    return self;
  };
}
