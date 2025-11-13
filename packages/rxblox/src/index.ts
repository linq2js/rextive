// Main entry point for rxblox
export * from "./types";
export { signal } from "./signal";
export { effect } from "./effect";
export { rx } from "./rx";
export { provider } from "./provider";
import { onMount, onUnmount, onRender } from "./eventDispatcher";
import { handle, type Handle } from "./handle";

import { blox as createBlox } from "./blox";
export const blox = Object.assign(createBlox, {
  handle,
  onMount,
  onUnmount,
  onRender,
});

export type { Handle };
