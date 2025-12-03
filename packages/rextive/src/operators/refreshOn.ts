import type { Signal, AnySignal } from "../types";
import { emitter } from "../utils/emitter";
import { wrapDispose } from "../disposable";

/**
 * Filter function type for refreshOn/staleOn operators.
 * Receives the notifier signal that triggered and returns whether to proceed.
 */
export type NotifierFilter<T = unknown> = (notifier: AnySignal<T>) => boolean;

/**
 * Creates an operator that refreshes the source signal when notifier(s) change.
 *
 * Triggers immediate recomputation of the source signal whenever any of the
 * notifier signals emit a new value. Useful for manual refresh triggers,
 * cache invalidation, or coordinating updates between signals.
 *
 * @param notifier - Single signal or array of signals to watch
 * @param filter - Optional filter function to conditionally trigger refresh
 * @returns The source signal with refresh behavior attached
 *
 * @example Basic usage
 * ```tsx
 * const refreshTrigger = signal(0);
 * const userData = asyncSignal.pipe(refreshOn(refreshTrigger));
 *
 * // Clicking button refreshes the data
 * <button onClick={() => refreshTrigger.set(v => v + 1)}>Refresh</button>
 * ```
 *
 * @example Multiple triggers
 * ```tsx
 * const manualRefresh = signal(0);
 * const autoRefresh = signal(0);
 *
 * const data = asyncSignal.pipe(
 *   refreshOn([manualRefresh, autoRefresh])
 * );
 * ```
 *
 * @example With filter
 * ```tsx
 * const networkStatus = signal<'online' | 'offline'>('online');
 *
 * // Only refresh when coming back online
 * const data = asyncSignal.pipe(
 *   refreshOn(networkStatus, (status) => status() === 'online')
 * );
 * ```
 *
 * @example Chaining with other operators
 * ```tsx
 * const data = asyncSignal.pipe(
 *   task(defaultValue),
 *   refreshOn(refreshTrigger),
 *   refreshOn(intervalTick)
 * );
 * ```
 */
export function refreshOn<TSource extends Signal<any>, TNotifier>(
  notifier: AnySignal<TNotifier> | readonly AnySignal<TNotifier>[],
  filter?: NotifierFilter<TNotifier>
): (source: TSource) => TSource {
  return (source: TSource): TSource => {
    const notifiers = Array.isArray(notifier) ? notifier : [notifier];
    const unsubscribeAll = emitter(
      notifiers.map((n) =>
        n.on(() => {
          if (filter && !filter(n)) {
            return;
          }
          source.refresh();
        })
      )
    );

    wrapDispose(source, [unsubscribeAll.emitAndClear], "after");

    return source;
  };
}
