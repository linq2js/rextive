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
export const refreshOn = createOnOperator((source) => source.refresh());

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
export const staleOn = createOnOperator((source) => source.stale());

function createOnOperator(
  action: (source: Signal<any>, notifier: AnySignal<any>) => void
) {
  return <TSource extends Signal<any>, TNotifier>(
    notifier: AnySignal<TNotifier> | readonly AnySignal<TNotifier>[],
    filter?: NotifierFilter<TNotifier>
  ): ((source: TSource) => TSource) => {
    return (source: TSource): TSource => {
      const notifiers = Array.isArray(notifier) ? notifier : [notifier];
      const unsubscribeAll = emitter(
        notifiers.map((n) =>
          n.on(() => {
            if (filter && !filter(n)) {
              return;
            }
            action(source, n);
          })
        )
      );

      wrapDispose(source, [unsubscribeAll.emitAndClear], "after");

      return source;
    };
  };
}

/**
 * Creates an operator that resets the source signal to its initial value when notifier(s) change.
 *
 * Triggers `.reset()` on the source signal whenever any of the notifier signals
 * emit a new value. Only works with **mutable signals** that have an initial value.
 * Useful for form resets, clearing selections, or resetting state to defaults.
 *
 * @param notifier - Single signal or array of signals to watch
 * @param filter - Optional filter function to conditionally trigger reset
 * @returns The source signal with reset behavior attached
 *
 * @example Basic usage - Reset form on submission
 * ```tsx
 * const formSubmitted = signal<void>();
 * const formData = signal({ name: '', email: '' }).pipe(
 *   resetOn(formSubmitted)
 * );
 *
 * // After successful submission, reset form
 * <button onClick={() => {
 *   submitForm(formData());
 *   formSubmitted.set(undefined as void);
 * }}>Submit & Reset</button>
 * ```
 *
 * @example Multiple triggers
 * ```tsx
 * const cancelButton = signal<void>();
 * const escapeKey = signal<void>();
 *
 * const editingText = signal('').pipe(
 *   resetOn([cancelButton, escapeKey])
 * );
 * ```
 *
 * @example With filter - Reset only on specific conditions
 * ```tsx
 * const routeChange = signal<string>('/home');
 *
 * // Reset filters when navigating away from /products
 * const productFilters = signal({ category: 'all', sort: 'name' }).pipe(
 *   resetOn(routeChange, (route) => !route().startsWith('/products'))
 * );
 * ```
 *
 * @example Reset counter on interval
 * ```tsx
 * const tick = signal(0);
 * setInterval(() => tick.set(v => v + 1), 60000);
 *
 * const minuteCounter = signal(0).pipe(resetOn(tick));
 * ```
 *
 * @example Chaining with other operators
 * ```tsx
 * const data = signal([]).pipe(
 *   resetOn(clearTrigger),      // Reset to initial []
 *   refreshOn(refreshTrigger)   // Won't work on mutable, but shows chaining
 * );
 * ```
 *
 * @note Only works with mutable signals. Computed signals don't have `.reset()`.
 */
export const resetOn = createOnOperator((source) => source.reset());
