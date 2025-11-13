// Main entry point for rxblox

import { onMount, onUnmount, onRender } from "./eventDispatcher";
import { handle, type Handle } from "./handle";
import { asyncSignal, type AsyncSignalContext } from "./asyncSignal";
import { signal as createSignal } from "./signal";
import { blox as createBlox } from "./blox";
import { action as createAction } from "./action";
import { cancellableAction, aborter } from "./cancellableAction";

export const blox = Object.assign(createBlox, {
  handle,
  onMount,
  onUnmount,
  onRender,
});

export const signal = Object.assign(createSignal, {
  async: asyncSignal,
});

export const action = Object.assign(createAction, {
  cancellable: cancellableAction,
  aborter,
});

export type { Handle, AsyncSignalContext };
export type { Action, ActionOptions, ActionEvents } from "./action";
export type { CancellableAction } from "./cancellableAction";
export { disposable } from "./disposableDispatcher";
export * from "./types";
export { effect } from "./effect";
export { rx } from "./rx";
export { provider } from "./provider";
export * from "./loadable";
export { wait, type Awaitable } from "./wait";
