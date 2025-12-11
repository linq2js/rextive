/**
 * @module rextive
 *
 * Rextive - A reactive state management library with explicit dependencies.
 *
 * @see {@link https://jsr.io/@ging/rextive | JSR Documentation}
 */

export type * from "./types";

// Re-export signal.on types
export type { SignalOnControl } from "./signal.on";

// Re-export signal.action types
export type {
  Action,
  ActionContext,
  ActionDeps,
  ActionOptions,
  ActionEquals,
} from "./signal.action";

// Re-export TASK_TYPE constant
export { TASK_TYPE } from "./types";

// Import signal and utilities, combine them, then export
import { signal as signalBase } from "./signal";
import { batch as batchImpl } from "./batch";
import { tag as tagImpl } from "./tag";
import { signalOn } from "./signal.on";
import { signalUse } from "./signal.use";
import { signalFrom } from "./signal.from";
import { signalAction } from "./signal.action";
import { getErrorTrace } from "./utils/errorTracking";

/** Combined signal API type */
export type SignalApi = typeof signalBase & {
  batch: typeof batchImpl;
  tag: typeof tagImpl;
  on: typeof signalOn;
  use: typeof signalUse;
  from: typeof signalFrom;
  action: typeof signalAction;
  trace: typeof getErrorTrace;
};

// Augment signal with utility methods
export const signal: SignalApi = Object.assign(signalBase, {
  batch: batchImpl,
  tag: tagImpl,
  on: signalOn,
  use: signalUse,
  from: signalFrom,
  action: signalAction,
  trace: getErrorTrace,
});

export const $: SignalApi = signal;

// Core utilities (no React)
export { emitter } from "./utils/emitter";
export type { Emitter } from "./utils/emitter";
export { task } from "./utils/task";
export { isPromiseLike } from "./utils/isPromiseLike";
export { createProxy } from "./utils/createProxy";
export type { ProxyOptions } from "./utils/createProxy";
export { shallowEquals } from "./utils/shallowEquals";
export { resolveEquals } from "./utils/resolveEquals";
export type { EqualsStrategy } from "./types";
export type { EqualsOption } from "./utils/resolveEquals";
export { compose } from "./utils/compose";
export { dev } from "./utils/dev";
export { producer } from "./utils/producer";
export { wait, type Awaitable } from "./wait";
export { awaited } from "./awaited";
export { AbortedComputationError } from "./createSignalContext";
export { FallbackError } from "./common";
export { SignalDisposedError } from "./utils/errors";

export { is } from "./is";

// Disposable utilities
export {
  disposable,
  DisposalAggregateError,
  SingletonDisposeError,
  wrapDispose,
  noop,
  tryDispose,
  registerSingletonDispose,
  unregisterSingletonDispose,
  isSingletonDispose,
} from "./disposable";
export type {
  PropertyMergeStrategy,
  CombineDisposablesOptions,
  WrapDisposeWhen,
  TryDisposeOptions,
} from "./disposable";
export { validate } from "./validate";

// Logic module
export { logic, NotImplementedError, LogicCreateError } from "./logic";
export type { Logic, AbstractLogic, AbstractLogicInstance, Instance } from "./types";
