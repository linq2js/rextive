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

// Augment signal with utility methods
export const signal = Object.assign(signalBase, {
  is: is,
  batch: batchImpl,
  tag: tagImpl,
  on: signalOn,
  use: signalUse,
  from: signalFrom,
});

export const $ = signal;

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
