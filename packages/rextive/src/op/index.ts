/**
 * @module rextive/op
 *
 * Signal operators for transforming and combining signals.
 *
 * Operators are composable, reusable functions that transform signals.
 * Use them with `signal.pipe()` to create data pipelines.
 *
 * @example
 * ```ts
 * import { signal } from 'rextive';
 * import { to, filter, scan, focus, debounce, throttle } from 'rextive/op';
 *
 * const count = signal(0);
 *
 * // Transform with operators
 * const doubled = count.pipe(to(x => x * 2));
 *
 * // Chain multiple operators
 * const result = count.pipe(
 *   filter(x => x > 0),
 *   to(x => x * 2),
 *   scan((acc, x) => acc + x, 0)
 * );
 *
 * // Focus on nested data
 * const form = signal({ user: { name: 'John' } });
 * const userName = form.pipe(focus('user.name'));
 *
 * // Lightweight lens (no signal created)
 * const [getName, setName] = focus.lens(form, 'user.name');
 *
 * // Timing operators
 * const debouncedSearch = searchInput.pipe(debounce(300));
 * const throttledPosition = mousePos.pipe(throttle(100));
 * ```
 */

// Types
export type { Scheduler, Operator, OperatorNameOptions } from "./types";
export type {
  SelectorFn,
  SelectorOptions,
  ResolvedSelectors,
} from "./resolveSelectors";

// Utilities
export { resolveSelectors, resolveSelectorsRequired } from "./resolveSelectors";

// Existing operators
export { to, type ToOperatorOptions } from "./to";
export { scan } from "./scan";
export { filter } from "./filter";
export { focus, lens, type Lens } from "./focus";
export type {
  FocusOptions,
  FocusBaseOptions,
  FocusFallback,
  FocusContext,
} from "./focus";

// Timing operators
export { pace, type PaceOptions } from "./pace";
export { debounce, debounceScheduler } from "./debounce";
export { throttle, throttleScheduler } from "./throttle";
export { delay, delayScheduler } from "./delay";

// Take operators
export { take, takeWhile, takeLast, takeUntil } from "./take";
export type { TakeWhileOptions } from "./take";

// Skip operators
export { skip, skipWhile, skipLast, skipUntil } from "./skip";

// Min/Max operators
export { min, max } from "./minmax";
export type { Comparer, MinMaxOptions } from "./minmax";

// Count operator
export { count } from "./count";
export type { CountOptions } from "./count";

// Distinct operators
export { distinct } from "./distinct";
export type { DistinctOptions } from "./distinct";

// Reactive trigger operators
export { refreshOn, staleOn, resetOn, type NotifierFilter } from "./on";
