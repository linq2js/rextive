import type { AnySignal, Plugin } from "../types";

/**
 * Configuration for `when` plugin
 */
export interface WhenConfig<T> {
  /**
   * Trigger signal(s) to watch
   */
  on: AnySignal<unknown> | AnySignal<unknown>[];

  /**
   * Callback invoked when trigger signal changes
   * @param signal - The signal this plugin is attached to
   * @param trigger - The trigger signal that changed
   */
  do: (signal: AnySignal<T>, trigger: AnySignal<unknown>) => void;
}

/**
 * React to changes in other signals.
 *
 * The `when` plugin allows a signal to respond when other signals change,
 * enabling patterns like:
 * - Cache invalidation (stale/refresh on dependency change)
 * - Cross-signal synchronization
 * - Derived actions (side effects on change)
 *
 * @example Basic usage - refresh when trigger changes
 * ```ts
 * import { signal } from "rextive";
 * import { when } from "rextive/plugins";
 *
 * const userId = signal(1);
 * const userData = signal(
 *   async () => fetchUser(userId()),
 *   { use: [when({ on: userId, do: (sig) => sig.refresh() })] }
 * );
 * ```
 *
 * @example Multiple triggers
 * ```ts
 * const searchTerm = signal("");
 * const sortBy = signal("name");
 *
 * const results = signal(
 *   async () => search(searchTerm(), sortBy()),
 *   {
 *     use: [
 *       when({ on: searchTerm, do: (sig) => sig.refresh() }),
 *       when({ on: sortBy, do: (sig) => sig.stale() }),
 *     ]
 *   }
 * );
 * ```
 *
 * @example Watch multiple signals at once
 * ```ts
 * const results = signal([], {
 *   use: [
 *     when({
 *       on: [searchTerm, sortBy],
 *       do: (sig, trigger) => {
 *         console.log("Changed:", trigger === searchTerm ? "search" : "sort");
 *         sig.refresh();
 *       }
 *     })
 *   ]
 * });
 * ```
 *
 * @example Cross-signal synchronization
 * ```ts
 * const masterState = signal("init");
 * const replica = signal("init", {
 *   use: [when({ on: masterState, do: (sig, trigger) => sig.set(trigger()) })]
 * });
 * ```
 *
 * @param config - Configuration with `on` (triggers) and `do` (callback)
 * @returns Plugin that sets up subscriptions on signal creation
 */
export function when<T>(config: WhenConfig<T>): Plugin<T> {
  return (signal) => {
    const triggers = Array.isArray(config.on) ? config.on : [config.on];
    const unsubscribers: VoidFunction[] = [];

    // Subscribe to each trigger signal
    for (const trigger of triggers) {
      const unsubscribe = trigger.on(() => {
        // Invoke callback with (this signal, trigger signal)
        config.do(signal, trigger);
      });
      unsubscribers.push(unsubscribe);
    }

    // Return cleanup function
    return () => {
      for (const unsub of unsubscribers) {
        unsub();
      }
    };
  };
}

