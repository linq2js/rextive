import { dispatcherToken } from "./dispatcher";
import { Emitter } from "./emitter";

export type DisposableDispatcher = Emitter;

export const disposableToken = dispatcherToken<DisposableDispatcher>(
  "disposableDispatcher"
);
