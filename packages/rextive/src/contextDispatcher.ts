import { AnySignal, Loadable } from "./types";

export type ContextDispatcher = {
  trackSignal: (signal: AnySignal<any>) => void;
  trackLoadable: (loadable: Loadable<any>) => void;
};

let currentDispatcher: ContextDispatcher = {
  trackSignal: () => {},
  trackLoadable: () => {},
};

export function getCurrent() {
  return currentDispatcher;
}

export function withDispatcher<T>(
  dispatcher: Partial<ContextDispatcher>,
  fn: () => T
) {
  const prev = currentDispatcher;
  currentDispatcher = {
    ...prev,
    ...dispatcher,
  };
  try {
    return fn();
  } finally {
    currentDispatcher = prev;
  }
}
