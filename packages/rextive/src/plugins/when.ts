import type {
  AnySignal,
  ComputedSignal,
  MutableSignal,
  Plugin,
  Signal,
} from "../types";
import { emitter } from "../utils/emitter";

/**
 * Callback type for `when` plugin
 */
export type WhenCallback<
  TSource extends AnySignal<any>,
  TTrigger extends AnySignal<any>
> = (signal: TSource, trigger: TTrigger) => void;

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
 *   { use: [when(userId, (sig) => sig.refresh())] }
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
 *       when(searchTerm, (sig) => sig.refresh()),
 *       when(sortBy, (sig) => sig.stale()),
 *     ]
 *   }
 * );
 * ```
 *
 * @example Watch multiple signals at once
 * ```ts
 * const results = signal([], {
 *   use: [
 *     when([searchTerm, sortBy], (sig, trigger) => {
 *       console.log("Changed:", trigger === searchTerm ? "search" : "sort");
 *       sig.refresh();
 *     })
 *   ]
 * });
 * ```
 *
 * @example Cross-signal synchronization
 * ```ts
 * const masterState = signal("init");
 * const replica = signal("init", {
 *   use: [when(masterState, (sig, trigger) => sig.set(trigger()))]
 * });
 * ```
 *
 * @param triggers - Single signal or array of signals to watch
 * @param callback - Called when any trigger changes with (current, trigger)
 * @returns Plugin that sets up subscriptions on signal creation
 */
export function when<
  const TTrigger extends AnySignal<any> = AnySignal<any>,
  const TSource extends AnySignal<any> = AnySignal<any>
>(
  triggers: TTrigger | readonly TTrigger[],
  callback: WhenCallback<TSource, TTrigger>
): Plugin<
  TSource extends Signal<infer TValue> ? TValue : any,
  TSource extends MutableSignal<any>
    ? "mutable"
    : TSource extends ComputedSignal<any>
    ? "computed"
    : "any"
> {
  return (signal: any) => {
    const triggerArray = Array.isArray(triggers) ? triggers : [triggers];
    const onCleanup = emitter();

    // Subscribe to each trigger signal
    for (const trigger of triggerArray) {
      const unsubscribe = trigger.on(() => {
        // Invoke callback with (this signal, trigger signal)
        callback(signal, trigger);
      });
      onCleanup.on(unsubscribe);
    }

    // Return cleanup function
    return () => {
      onCleanup.emitAndClear();
    };
  };
}
