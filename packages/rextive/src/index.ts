/**
 * @module rextive
 *
 * Rextive - A reactive state management library with explicit dependencies.
 *
 * Core features:
 * - **signal()** - Create reactive mutable and computed signals
 * - **signal.batch()** - Batch multiple updates into one notification
 * - **signal.tag()** - Group signals for bulk operations
 * - **signal.on()** - Subscribe to multiple signals
 * - **signal.from()** - Combine signals into records or tuples
 * - **disposable()** - Combine disposable resources
 * - **wait()** - Suspense-compatible async utilities
 * - **loadable.from()** - Manual loading state management
 *
 * @example Basic usage
 * ```ts
 * import { signal, disposable, wait } from 'rextive';
 *
 * // Mutable signal
 * const count = signal(0);
 * count.set(1);
 * count.set(prev => prev + 1);
 *
 * // Computed signal with explicit dependencies
 * const doubled = signal({ count }, ({ deps }) => deps.count * 2);
 *
 * // Async computed
 * const userData = signal({ userId }, async ({ deps, abortSignal }) => {
 *   const res = await fetch(`/users/${deps.userId}`, { signal: abortSignal });
 *   return res.json();
 * });
 *
 * // Batch updates
 * signal.batch(() => {
 *   count.set(10);
 *   name.set("Alice");
 * });
 * ```
 *
 * @see {@link https://jsr.io/@ging/rextive | JSR Documentation}
 */

export type * from "./types";

// Re-export signal.on types
export type { SignalOnControl } from "./signal.on";

// Re-export LOADABLE_TYPE constant
export { LOADABLE_TYPE } from "./types";

// Import signal and utilities, combine them, then export
import { signal as signalBase } from "./signal";
import { is } from "./is";
import { batch as batchImpl } from "./batch";
import { tag as tagImpl } from "./tag";
import { signalOn } from "./signal.on";
import { signalUse } from "./signal.use";
import { signalFrom } from "./signal.from";
import { getErrorTrace } from "./utils/errorTracking";

/** Combined signal API type */
export type SignalApi = typeof signalBase & {
  is: typeof is;
  batch: typeof batchImpl;
  tag: typeof tagImpl;
  on: typeof signalOn;
  use: typeof signalUse;
  from: typeof signalFrom;
  trace: typeof getErrorTrace;
};

// Augment signal with utility methods
export const signal: SignalApi = Object.assign(signalBase, {
  is: is,
  batch: batchImpl,
  tag: tagImpl,
  on: signalOn,
  use: signalUse,
  from: signalFrom,
  trace: getErrorTrace,
});

export const $: SignalApi = signal;

// Core utilities (no React)
export { emitter } from "./utils/emitter";
export type { Emitter } from "./utils/emitter";
export { loadable } from "./utils/loadable";
export { isPromiseLike } from "./utils/isPromiseLike";
export { createProxy } from "./utils/createProxy";
export type { ProxyOptions } from "./utils/createProxy";
export { shallowEquals } from "./utils/shallowEquals";
export { resolveEquals } from "./utils/resolveEquals";
export type { EqualsStrategy, EqualsOption } from "./utils/resolveEquals";
export { compose } from "./utils/compose";
export { dev } from "./utils/dev";
export { producer } from "./utils/producer";
export { wait, type Awaitable } from "./wait";
export { awaited } from "./awaited";
export { AbortedComputationError } from "./createSignalContext";
export { FallbackError } from "./common";

// Disposable utilities
export {
  disposable,
  DisposalAggregateError,
  wrapDispose,
  noop,
} from "./disposable";
export type {
  PropertyMergeStrategy,
  CombineDisposablesOptions,
  WrapDisposeWhen,
} from "./disposable";
export { validate } from "./validate";
