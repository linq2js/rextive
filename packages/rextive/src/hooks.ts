/**
 * Centralized hooks for signal lifecycle and access tracking.
 *
 * Two types of hooks:
 * 1. Render hooks - for tracking signal access during render (used by rx())
 * 2. DevTools hooks - for debugging/monitoring (used by DevTools)
 */

import type { AnySignal, Loadable, Tag } from "./types";

// ============================================
// Types
// ============================================

/** Render-time hooks for tracking signal access */
export interface RenderHooks {
  onSignalAccess: (signal: AnySignal<any>) => void;
  onLoadableAccess: (loadable: Loadable<any>) => void;
}

/** DevTools hooks for monitoring signal lifecycle */
export interface DevToolsHooks {
  onSignalCreate: (signal: AnySignal<any>) => void;
  onSignalChange: (signal: AnySignal<any>, value: unknown) => void;
  onSignalError: (signal: AnySignal<any>, error: unknown) => void;
  onSignalDispose: (signal: AnySignal<any>) => void;
  onSignalRename: (signal: AnySignal<any>) => void;
  onTagCreate: (tag: Tag<any, any>) => void;
  onTagAdd: (tag: Tag<any, any>, signal: AnySignal<any>) => void;
  onTagRemove: (tag: Tag<any, any>, signal: AnySignal<any>) => void;
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

/** Check if devtools is enabled */
export function hasDevTools(): boolean {
  return devToolsHooks !== null;
}

/** Emit devtools events */
export const emit = {
  signalCreate: (signal: AnySignal<any>) => {
    devToolsHooks?.onSignalCreate?.(signal);
  },
  signalChange: (signal: AnySignal<any>, value: unknown) => {
    devToolsHooks?.onSignalChange?.(signal, value);
  },
  signalError: (signal: AnySignal<any>, error: unknown) => {
    devToolsHooks?.onSignalError?.(signal, error);
  },
  signalDispose: (signal: AnySignal<any>) => {
    devToolsHooks?.onSignalDispose?.(signal);
  },
  signalRename: (signal: AnySignal<any>) => {
    devToolsHooks?.onSignalRename?.(signal);
  },
  tagCreate: (tag: Tag<any, any>) => {
    devToolsHooks?.onTagCreate?.(tag);
  },
  tagAdd: (tag: Tag<any, any>, signal: AnySignal<any>) => {
    devToolsHooks?.onTagAdd?.(tag, signal);
  },
  tagRemove: (tag: Tag<any, any>, signal: AnySignal<any>) => {
    devToolsHooks?.onTagRemove?.(tag, signal);
  },
};
