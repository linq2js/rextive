/**
 * Centralized hooks for signal lifecycle and access tracking.
 *
 * Two types of hooks:
 * 1. Render hooks - for tracking signal access during render (used by rx())
 * 2. DevTools hooks - for debugging/monitoring (used by DevTools)
 */

import type { AnySignal, Loadable } from "./types";

// ============================================
// Types
// ============================================

/** Signal info passed to devtools hooks */
export interface SignalRef {
  id: string;
  kind: "mutable" | "computed";
  signal: AnySignal<any>;
}

/** Tag info passed to devtools hooks */
export interface TagRef {
  id: string;
  signals: Set<AnySignal<any>>;
}

/** Render-time hooks for tracking signal access */
export interface RenderHooks {
  onSignalAccess: (signal: AnySignal<any>) => void;
  onLoadableAccess: (loadable: Loadable<any>) => void;
}

/** DevTools hooks for monitoring signal lifecycle */
export interface DevToolsHooks {
  onSignalCreate: (signal: SignalRef) => void;
  onSignalChange: (signal: SignalRef, value: unknown) => void;
  onSignalError: (signal: SignalRef, error: unknown) => void;
  onSignalDispose: (signal: SignalRef) => void;
  onSignalRename: (signal: SignalRef) => void;
  onTagCreate: (tag: TagRef) => void;
  onTagAdd: (tag: TagRef, signal: AnySignal<any>) => void;
  onTagRemove: (tag: TagRef, signal: AnySignal<any>) => void;
}

// ============================================
// Render Hooks (scoped per render)
// ============================================

const noopRenderHooks: RenderHooks = {
  onSignalAccess: () => {},
  onLoadableAccess: () => {},
};

let activeRenderHooks: RenderHooks = noopRenderHooks;

/** Get current render hooks */
export function getRenderHooks(): RenderHooks {
  return activeRenderHooks;
}

/** Execute fn with custom render hooks (for rx() tracking) */
export function withRenderHooks<T>(
  hooks: Partial<RenderHooks>,
  fn: () => T
): T {
  const prev = activeRenderHooks;
  activeRenderHooks = { ...prev, ...hooks };
  try {
    return fn();
  } finally {
    activeRenderHooks = prev;
  }
}

// ============================================
// DevTools Hooks (global, set once)
// ============================================

let devToolsHooks: Partial<DevToolsHooks> | null = null;

/** Set devtools hooks (called by enableDevTools) */
export function setDevToolsHooks(hooks: Partial<DevToolsHooks> | null): void {
  devToolsHooks = hooks;
}

/** Emit devtools events */
export const emit = {
  signalCreate: (signal: SignalRef) => {
    devToolsHooks?.onSignalCreate?.(signal);
  },
  signalChange: (signal: SignalRef, value: unknown) => {
    devToolsHooks?.onSignalChange?.(signal, value);
  },
  signalError: (signal: SignalRef, error: unknown) => {
    devToolsHooks?.onSignalError?.(signal, error);
  },
  signalDispose: (signal: SignalRef) => {
    devToolsHooks?.onSignalDispose?.(signal);
  },
  signalRename: (signal: SignalRef) => {
    devToolsHooks?.onSignalRename?.(signal);
  },
  tagCreate: (tag: TagRef) => {
    devToolsHooks?.onTagCreate?.(tag);
  },
  tagAdd: (tag: TagRef, signal: AnySignal<any>) => {
    devToolsHooks?.onTagAdd?.(tag, signal);
  },
  tagRemove: (tag: TagRef, signal: AnySignal<any>) => {
    devToolsHooks?.onTagRemove?.(tag, signal);
  },
};
