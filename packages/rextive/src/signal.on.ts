import type { AnySignal } from "./types";

/**
 * Subscription control returned by signal.on()
 */
export interface SignalOnControl {
  /**
   * Pause subscription (stop receiving updates)
   */
  pause(): void;

  /**
   * Resume subscription (start receiving updates again)
   */
  resume(): void;

  /**
   * Check if subscription is currently paused
   */
  paused(): boolean;

  /**
   * Dispose subscription (cleanup and stop permanently)
   */
  dispose(): void;
}

/**
 * Subscribe to multiple signals and call callback when any changes.
 * Unlike computed signals, this does NOT evaluate signals at the beginning.
 *
 * @param signals - Array of signals to subscribe to
 * @param callback - Called when any signal changes, receives the signal that triggered
 * @returns Control object with pause, resume, paused, and dispose methods
 *
 * @example
 * ```ts
 * const count = signal(0);
 * const name = signal("Alice");
 * const enabled = signal(true);
 *
 * const control = signal.on([count, name, enabled], (trigger) => {
 *   console.log("Changed:", trigger());
 * });
 *
 * count.set(1); // Logs: "Changed: 1"
 * name.set("Bob"); // Logs: "Changed: Bob"
 *
 * control.pause();
 * count.set(2); // No log (paused)
 *
 * control.resume();
 * count.set(3); // Logs: "Changed: 3"
 *
 * control.dispose(); // Cleanup
 * ```
 *
 * @example With different types
 * ```ts
 * const count = signal(0);
 * const name = signal("Alice");
 *
 * signal.on([count, name], (trigger) => {
 *   // trigger is typed as: AnySignal<number> | AnySignal<string>
 *   const value = trigger(); // number | string
 *   console.log("Triggered by:", value);
 * });
 * ```
 */
export function signalOn<const TSignals extends readonly AnySignal<any>[]>(
  signals: [...TSignals],
  callback: (trigger: TSignals[number]) => void
): SignalOnControl {
  let isPaused = false;
  let isDisposed = false;
  const unsubscribers: Array<() => void> = [];

  // Subscribe to each signal
  for (const sig of signals) {
    const unsubscribe = sig.on(() => {
      if (!isPaused && !isDisposed) {
        callback(sig as any);
      }
    });
    unsubscribers.push(unsubscribe);
  }

  return {
    pause() {
      if (isDisposed) {
        throw new Error("Cannot pause disposed subscription");
      }
      isPaused = true;
    },

    resume() {
      if (isDisposed) {
        throw new Error("Cannot resume disposed subscription");
      }
      isPaused = false;
    },

    paused() {
      return isPaused;
    },

    dispose() {
      if (isDisposed) {
        return; // Already disposed, idempotent
      }
      isDisposed = true;
      isPaused = false;

      // Unsubscribe from all signals
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
      unsubscribers.length = 0;
    },
  };
}
