/**
 * Centralized hooks for signal lifecycle and access tracking.
 *
 * Two types of hooks:
 * 1. Render hooks - for tracking signal access during render (used by rx())
 * 2. DevTools hooks - for debugging/monitoring (used by DevTools)
 */

import type { AnySignal, Task, Tag } from "./types";

// ============================================
// Types
// ============================================

/** Render-time hooks for tracking signal access */
export interface RenderHooks {
  onSignalAccess: (signal: AnySignal<any>) => void;
  onTaskAccess: (task: Task<any>) => void;
}

/** DevTools hooks for monitoring signal lifecycle */
export interface DevToolsHooks {
  onSignalCreate: (signal: AnySignal<any>) => void;
  onSignalChange: (signal: AnySignal<any>, value: unknown) => void;
  onSignalError: (signal: AnySignal<any>, error: unknown) => void;
  onSignalDispose: (signal: AnySignal<any>) => void;
  onSignalRename: (signal: AnySignal<any>) => void;
  onForgetSignals: (signals: AnySignal<any>[]) => void;
  onTagCreate: (tag: Tag<any, any>) => void;
  onTagAdd: (tag: Tag<any, any>, signal: AnySignal<any>) => void;
  onTagRemove: (tag: Tag<any, any>, signal: AnySignal<any>) => void;
}

// ============================================
// Render Hooks (scoped per render)
// ============================================

const noopRenderHooks: RenderHooks = {
  onSignalAccess: () => {},
  onTaskAccess: () => {},
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

/** Get hooks from globalThis (shared across all module instances) or local fallback */
function getDevToolsHooks(): Partial<DevToolsHooks> | null {
  // Check globalThis first (shared across all module instances)
  if (typeof globalThis !== "undefined" && (globalThis as any).__REXTIVE_DEVTOOLS__) {
    return (globalThis as any).__REXTIVE_DEVTOOLS__;
  }
  // Fallback to local instance (for backwards compatibility)
  return devToolsHooks;
}

/** Get or create global queue (shared across all module instances) */
function getGlobalQueue(): AnySignal<any>[] {
  if (typeof globalThis !== "undefined") {
    if (!(globalThis as any).__REXTIVE_QUEUE__) {
      (globalThis as any).__REXTIVE_QUEUE__ = [];
    }
    return (globalThis as any).__REXTIVE_QUEUE__;
  }
  // Fallback for environments without globalThis (shouldn't happen in modern JS)
  const fallback: AnySignal<any>[] = [];
  return fallback;
}

/** Set devtools hooks (called by enableDevTools) */
export function setDevToolsHooks(hooks: Partial<DevToolsHooks> | null): void {
  devToolsHooks = hooks;
  
  // Also set in globalThis for cross-module-instance sharing
  if (typeof globalThis !== "undefined") {
    (globalThis as any).__REXTIVE_DEVTOOLS__ = hooks ?? undefined;
  }
  
  // Replay queued signal creations from global queue now that hooks are set
  const globalQueue = getGlobalQueue();
  if (hooks?.onSignalCreate && globalQueue.length > 0) {
    const signals = [...globalQueue];
    globalQueue.length = 0; // Clear queue
    for (const signal of signals) {
      hooks.onSignalCreate(signal);
    }
  }
}

/** Check if devtools is enabled */
export function hasDevTools(): boolean {
  return getDevToolsHooks() !== null;
}

// ============================================
// Forget Mode (for orphaned StrictMode scopes)
// ============================================

/** Signals collected during forget mode - null when not in forget mode */
let forgetModeSignals: Set<AnySignal<any>> | null = null;
/** Nesting depth for forgetDisposedSignals calls */
let forgetModeDepth = 0;

/** Emit devtools events */
export const emit = {
  signalCreate: (signal: AnySignal<any>) => {
    const hooks = getDevToolsHooks();
    const onSignalCreate = hooks?.onSignalCreate;
    
    if (!onSignalCreate) {
      // DevTools not enabled yet - queue for later replay in global queue
      getGlobalQueue().push(signal);
      return;
    }
    
    onSignalCreate(signal);
  },
  signalChange: (signal: AnySignal<any>, value: unknown) => {
    getDevToolsHooks()?.onSignalChange?.(signal, value);
  },
  signalError: (signal: AnySignal<any>, error: unknown) => {
    getDevToolsHooks()?.onSignalError?.(signal, error);
  },
  signalDispose: (signal: AnySignal<any>) => {
    if (forgetModeSignals !== null) {
      // In forget mode - collect for batch removal (Set prevents duplicates)
      forgetModeSignals.add(signal);
    } else {
      // Normal mode - mark as disposed (keeps history)
      getDevToolsHooks()?.onSignalDispose?.(signal);
    }
  },
  signalRename: (signal: AnySignal<any>) => {
    getDevToolsHooks()?.onSignalRename?.(signal);
  },
  /**
   * Execute disposal within "forget mode" - all signals disposed
   * inside the callback will be completely removed from DevTools
   * instead of being marked as "disposed".
   *
   * Supports nested calls - signals are only flushed when the
   * outermost call completes.
   *
   * Used for orphaned scopes from React StrictMode that should
   * never appear in DevTools.
   */
  forgetDisposedSignals: (fn: () => void) => {
    // Initialize Set on first (outermost) call
    if (forgetModeDepth === 0) {
      forgetModeSignals = new Set();
    }
    forgetModeDepth++;
    try {
      fn();
    } finally {
      forgetModeDepth--;
      // Only flush and reset when outermost call completes
      if (forgetModeDepth === 0) {
        if (forgetModeSignals && forgetModeSignals.size > 0) {
          getDevToolsHooks()?.onForgetSignals?.([...forgetModeSignals]);
        }
        forgetModeSignals = null;
      }
    }
  },
  tagCreate: (tag: Tag<any, any>) => {
    getDevToolsHooks()?.onTagCreate?.(tag);
  },
  tagAdd: (tag: Tag<any, any>, signal: AnySignal<any>) => {
    getDevToolsHooks()?.onTagAdd?.(tag, signal);
  },
  tagRemove: (tag: Tag<any, any>, signal: AnySignal<any>) => {
    getDevToolsHooks()?.onTagRemove?.(tag, signal);
  },
};
