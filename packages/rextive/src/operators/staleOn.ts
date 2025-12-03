import type { Signal, AnySignal } from "../types";
import type { NotifierFilter } from "./refreshOn";
import { emitter } from "../utils/emitter";
import { wrapDispose } from "../disposable";

/**
 * Creates an operator that marks the source signal as stale when notifier(s) change.
 *
 * Unlike `refreshOn` which triggers immediate recomputation, `staleOn` marks the
 * signal as stale for lazy recomputation on next access. This is more efficient
 * when the signal might not be accessed immediately.
 *
 * @param notifier - Single signal or array of signals to watch
 * @param filter - Optional filter function to conditionally mark as stale
 * @returns The source signal with stale behavior attached
 *
 * @example Basic usage
 * ```tsx
 * const cacheInvalidate = signal(0);
 * const userData = asyncSignal.pipe(staleOn(cacheInvalidate));
 *
 * // Mark data as stale (won't refetch until accessed)
 * cacheInvalidate.set(v => v + 1);
 * ```
 *
 * @example Multiple triggers
 * ```tsx
 * const userUpdate = signal(0);
 * const configChange = signal(0);
 *
 * const derivedData = computedSignal.pipe(
 *   staleOn([userUpdate, configChange])
 * );
 * ```
 *
 * @example With filter
 * ```tsx
 * const visibilityState = signal<'visible' | 'hidden'>('visible');
 *
 * // Only invalidate when tab becomes hidden
 * const cachedData = asyncSignal.pipe(
 *   staleOn(visibilityState, (state) => state() === 'hidden')
 * );
 * ```
 *
 * @example Cache TTL pattern
 * ```tsx
 * const ttlExpired = signal(false);
 *
 * // Set up TTL
 * setTimeout(() => ttlExpired.set(true), 5 * 60 * 1000);
 *
 * const cachedData = asyncSignal.pipe(
 *   staleOn(ttlExpired, (expired) => expired())
 * );
 * ```
 *
 * @example Chaining with other operators
 * ```tsx
 * const data = asyncSignal.pipe(
 *   task(defaultValue),
 *   staleOn(cacheInvalidate),
 *   refreshOn(manualRefresh)  // Manual refresh is immediate
 * );
 * ```
 */
export function staleOn<TSource extends Signal<any>, TNotifier>(
  notifier: AnySignal<TNotifier> | readonly AnySignal<TNotifier>[],
  filter?: NotifierFilter<TNotifier>
): (source: TSource) => TSource {
  return (source: TSource): TSource => {
    const notifiers = Array.isArray(notifier) ? notifier : [notifier];
    const unsubscribeAll = emitter();

    // Subscribe to each notifier
    notifiers.forEach((n) =>
      unsubscribeAll.on(
        n.on(() => {
          if (filter && !filter(n)) {
            return;
          }
          source.stale();
        })
      )
    );

    wrapDispose(source, [unsubscribeAll.emitAndClear], "after");

    return source;
  };
}
