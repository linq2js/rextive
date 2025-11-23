export type * from "./types";

// Re-export persist types
export type {
  PersistorStatus,
  PersistSignalsOptions,
  PersistSignalsResult,
} from "./persistSignals";

// Re-export LOADABLE_TYPE constant
export { LOADABLE_TYPE } from "./types";

// Import signal and utilities, combine them, then export
import { signal as signalBase } from "./signal";
import { is } from "./is";
import { persistSignals as persistSignalsImpl } from "./persistSignals";
import { batch as batchImpl } from "./batch";
import { tag as tagImpl } from "./tag";

// Augment signal with utility methods
export const signal = Object.assign(signalBase, {
  is: is,
  persist: persistSignalsImpl,
  batch: batchImpl,
  tag: tagImpl,
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
export type { EqualsFn, EqualsStrategy, EqualsOption } from "./utils/resolveEquals";
export { devLog, devWarn, devError, devOnly, devAssert } from "./utils/dev";
export { wait, type Awaitable } from "./wait";
export { mapSignal } from "./utils/mapSignal";
export { scanSignal } from "./utils/scanSignal";

// Disposable utilities
export { disposable, DisposalAggregateError } from "./disposable";
export type {
  PropertyMergeStrategy,
  CombineDisposablesOptions,
} from "./disposable";
