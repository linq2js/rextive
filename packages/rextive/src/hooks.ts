/**
 * Centralized hooks for signal lifecycle and access tracking.
 *
 * Unified hooks system that supports:
 * - Render-time tracking (scoped via withHooks)
 * - DevTools/monitoring (global via setHooks)
 */

import type { AnySignal, Task, Tag } from "./types";
import { getGlobalThisAccessor } from "./utils/globalThisAccessor";

// ============================================
// Types
// ============================================

/** Unified hooks interface for all signal lifecycle events */
export interface Hooks {
  // Render-time tracking (typically scoped via withHooks)
  onSignalAccess: (signal: AnySignal<any>) => void;
  onTaskAccess: (task: Task<any>) => void;

  // Lifecycle monitoring (typically global via setHooks)
  onSignalCreate?: (signal: AnySignal<any>) => void;
  onSignalChange?: (signal: AnySignal<any>, value: unknown) => void;
  onSignalError?: (signal: AnySignal<any>, error: unknown) => void;
  onSignalDispose?: (signal: AnySignal<any>) => void;
  onSignalRename?: (signal: AnySignal<any>) => void;
  onForgetSignals?: (signals: AnySignal<any>[]) => void;
  onTagCreate?: (tag: Tag<any, any>) => void;
  onTagAdd?: (tag: Tag<any, any>, signal: AnySignal<any>) => void;
  onTagRemove?: (tag: Tag<any, any>, signal: AnySignal<any>) => void;

  /** Check if devtools-level monitoring is enabled */
  hasDevTools: () => boolean;
}

// ============================================
// Default Hooks
// ============================================

const defaultHooks: Hooks = {
  onSignalAccess: () => {},
  onTaskAccess: () => {},
  hasDevTools: () => false,
};

const hooksAccessor = getGlobalThisAccessor<Hooks>(
  "__REXTIVE_HOOKS__",
  defaultHooks
);

// ============================================
// Hooks State
// ============================================

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

// ============================================
// Public API
// ============================================

/** Get current hooks */
export const getHooks = hooksAccessor.get;

/**
 * Set/merge global hooks.
 *
 * @overload setHooks(hooks) - Merge partial hooks into current hooks
 * @overload setHooks(override) - Override function receives current hooks, returns partial to merge
 */
export function setHooks(hooks: Partial<Hooks>): void;
export function setHooks(override: (current: Hooks) => Partial<Hooks>): void;
export function setHooks(
  hooksOrOverride: Partial<Hooks> | ((current: Hooks) => Partial<Hooks>)
): void {
  const current = getHooks();
  const partial =
    typeof hooksOrOverride === "function"
      ? hooksOrOverride(current)
      : hooksOrOverride;

  const newHooks = hooksAccessor.set({ ...current, ...partial });

  // Replay queued signal creations now that hooks are set
  const globalQueue = getGlobalQueue();
  if (newHooks.onSignalCreate && globalQueue.length > 0) {
    const signals = [...globalQueue];
    globalQueue.length = 0; // Clear queue
    for (const signal of signals) {
      newHooks.onSignalCreate?.(signal);
    }
  }
}

/**
 * Reset hooks to defaults.
 * Used for cleanup (e.g., disabling devtools).
 */
export function resetHooks(): void {
  hooksAccessor.set(defaultHooks);
}

/**
 * Temporarily override hooks within a scope.
 *
 * @overload withHooks(hooks, fn) - Merge partial hooks for duration of fn
 * @overload withHooks(override, fn) - Override function receives current hooks, returns partial to merge
 */
export function withHooks<T>(hooks: Partial<Hooks>, fn: () => T): T;
export function withHooks<T>(
  override: (current: Hooks) => Partial<Hooks>,
  fn: () => T
): T;
export function withHooks<T>(
  hooksOrOverride: Partial<Hooks> | ((current: Hooks) => Partial<Hooks>),
  fn: () => T
): T {
  const prev = getHooks();
  const partial =
    typeof hooksOrOverride === "function"
      ? hooksOrOverride(prev)
      : hooksOrOverride;

  hooksAccessor.set({ ...prev, ...partial });
  try {
    return fn();
  } finally {
    hooksAccessor.set(prev);
  }
}

// ============================================
// Legacy Exports (for backwards compatibility)
// ============================================

/** @deprecated Use getHooks() instead */
export function getRenderHooks(): Pick<
  Hooks,
  "onSignalAccess" | "onTaskAccess"
> {
  return getHooks();
}

/** @deprecated Use withHooks() instead */
export function withRenderHooks<T>(
  hooks: Partial<Pick<Hooks, "onSignalAccess" | "onTaskAccess">>,
  fn: () => T
): T {
  return withHooks(hooks, fn);
}

/** @deprecated Use setHooks() instead */
export function setDevToolsHooks(hooks: Partial<Hooks> | null): void {
  if (hooks === null) {
    resetHooks();
  } else {
    setHooks(hooks);
  }
}

/** @deprecated Use getHooks().hasDevTools() instead */
export function hasDevTools(): boolean {
  return getHooks().hasDevTools();
}

// ============================================
// Forget Mode (for orphaned StrictMode scopes)
// ============================================

/** Signals collected during forget mode - null when not in forget mode */
let forgetModeSignals: Set<AnySignal<any>> | null = null;
/** Nesting depth for forgetDisposedSignals calls */
let forgetModeDepth = 0;

// ============================================
// Emit Helpers
// ============================================

/** Emit devtools events */
export const emit = {
  signalCreate: (signal: AnySignal<any>) => {
    const hooks = getHooks();
    const onSignalCreate = hooks.onSignalCreate;

    if (!onSignalCreate) {
      // DevTools not enabled yet - queue for later replay in global queue
      getGlobalQueue().push(signal);
      return;
    }

    onSignalCreate(signal);
  },
  signalChange: (signal: AnySignal<any>, value: unknown) => {
    getHooks().onSignalChange?.(signal, value);
  },
  signalError: (signal: AnySignal<any>, error: unknown) => {
    getHooks().onSignalError?.(signal, error);
  },
  signalDispose: (signal: AnySignal<any>) => {
    if (forgetModeSignals !== null) {
      // In forget mode - collect for batch removal (Set prevents duplicates)
      forgetModeSignals.add(signal);
    } else {
      // Normal mode - mark as disposed (keeps history)
      getHooks().onSignalDispose?.(signal);
    }
  },
  signalRename: (signal: AnySignal<any>) => {
    getHooks().onSignalRename?.(signal);
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
          getHooks().onForgetSignals?.([...forgetModeSignals]);
        }
        forgetModeSignals = null;
      }
    }
  },
  tagCreate: (tag: Tag<any, any>) => {
    getHooks().onTagCreate?.(tag);
  },
  tagAdd: (tag: Tag<any, any>, signal: AnySignal<any>) => {
    getHooks().onTagAdd?.(tag, signal);
  },
  tagRemove: (tag: Tag<any, any>, signal: AnySignal<any>) => {
    getHooks().onTagRemove?.(tag, signal);
  },
};
