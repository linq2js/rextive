/**
 * Centralized hooks for signal lifecycle and access tracking.
 *
 * Unified hooks system that supports:
 * - Render-time tracking (scoped via withHooks)
 * - DevTools/monitoring (global via setHooks)
 */

import type { AnySignal, Task, Tag, SignalMap } from "./types";
import { getGlobalThisAccessor } from "./utils/globalThisAccessor";

// ============================================
// Types
// ============================================

/**
 * Unified hooks interface for all signal lifecycle events.
 *
 * Two categories of hooks:
 * 1. **Render-time tracking** - Used by `rx()` to track signal access during render.
 *    Typically scoped via `withHooks()` for component-level tracking.
 * 2. **Lifecycle monitoring** - Used by DevTools to monitor signal lifecycle.
 *    Typically set globally via `setHooks()`.
 */
export interface Hooks {
  // ─────────────────────────────────────────────────────────────────
  // Render-time tracking (scoped via withHooks)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Called when a signal is accessed (read) during render.
   * Used by `rx()` to track dependencies for reactive re-rendering.
   * @param signal - The signal being accessed
   */
  onSignalAccess: (signal: AnySignal<any>) => void;

  /**
   * Called when a task (async state) is accessed during render.
   * Used by `rx()` to track async dependencies.
   * @param task - The task being accessed
   */
  onTaskAccess: (task: Task<any>) => void;

  // ─────────────────────────────────────────────────────────────────
  // Lifecycle monitoring (global via setHooks)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Called when a new signal is created.
   * Used by DevTools to track all signals and by useScope/logic to track
   * signals for automatic disposal.
   *
   * @param signal - The newly created signal
   * @param deps - Dependencies map (for computed signals)
   * @param disposalHandled - If true, the caller (useScope/logic) will handle
   *                          disposal automatically. DevTools can use this to
   *                          show disposal status in the UI.
   */
  onSignalCreate?: (
    signal: AnySignal<any>,
    deps?: SignalMap,
    disposalHandled?: boolean
  ) => void;

  /**
   * Called when a signal's value changes.
   * Used by DevTools to show value history and change notifications.
   * @param signal - The signal that changed
   * @param value - The new value
   */
  onSignalChange?: (signal: AnySignal<any>, value: unknown) => void;

  /**
   * Called when a signal encounters an error (sync errors during computation).
   * Used by DevTools to show error states.
   * @param signal - The signal that errored
   * @param error - The error that occurred
   */
  onSignalError?: (signal: AnySignal<any>, error: unknown) => void;

  /**
   * Called when a signal is disposed.
   * Used by DevTools to mark signals as disposed in the UI.
   * @param signal - The signal being disposed
   */
  onSignalDispose?: (signal: AnySignal<any>) => void;

  /**
   * Called when a signal is renamed (displayName changed).
   * Used by DevTools to update the signal's display name.
   * @param signal - The signal that was renamed
   */
  onSignalRename?: (signal: AnySignal<any>) => void;

  /**
   * Called to completely remove signals from DevTools (not just mark as disposed).
   * Used for orphaned signals from React StrictMode double-invoke that should
   * never appear in DevTools history.
   * @param signals - Array of signals to forget
   */
  onForgetSignals?: (signals: AnySignal<any>[]) => void;

  /**
   * Called when a new tag is created.
   * Used by DevTools to track tag groups.
   * @param tag - The newly created tag
   */
  onTagCreate?: (tag: Tag<any, any>) => void;

  /**
   * Called when a signal is added to a tag.
   * Used by DevTools to show tag membership.
   * @param tag - The tag
   * @param signal - The signal being added
   */
  onTagAdd?: (tag: Tag<any, any>, signal: AnySignal<any>) => void;

  /**
   * Called when a signal is removed from a tag.
   * Used by DevTools to update tag membership.
   * @param tag - The tag
   * @param signal - The signal being removed
   */
  onTagRemove?: (tag: Tag<any, any>, signal: AnySignal<any>) => void;

  // ─────────────────────────────────────────────────────────────────
  // Utility
  // ─────────────────────────────────────────────────────────────────

  /**
   * Check if devtools-level monitoring is enabled.
   * Used to conditionally enable expensive debugging features.
   * @returns true if DevTools hooks are active
   */
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

const hooksAccessor = getGlobalThisAccessor("__REXTIVE_HOOKS__", defaultHooks);

// ============================================
// Hooks State
// ============================================

/** Queued signal creation event */
type QueuedSignal = { signal: AnySignal<any>; deps?: SignalMap };

/** Accessor for global queue (shared across all module instances) */
const queueAccessor = getGlobalThisAccessor(
  "__REXTIVE_QUEUE__",
  [] as QueuedSignal[]
);

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
  const globalQueue = queueAccessor.get();
  if (newHooks.onSignalCreate && globalQueue.length > 0) {
    const queued = [...globalQueue];
    globalQueue.length = 0; // Clear queue
    for (const { signal, deps } of queued) {
      newHooks.onSignalCreate?.(signal, deps);
    }
  }
}

/**
 * Reset hooks to defaults.
 * Used for cleanup (e.g., disabling devtools).
 */
export function resetHooks(): void {
  hooksAccessor.clear();
}

/**
 * Temporarily override hooks within a scope.
 *
 * @overload withHooks(hooks, fn) - Merge partial hooks for duration of fn
 * @overload withHooks(override, fn) - Override function receives current hooks, returns partial to merge
 */
export function withHooks<T>(
  override: (current: Hooks) => Partial<Hooks>,
  fn: () => T
): T;
export function withHooks<T>(hooks: Partial<Hooks>, fn: () => T): T;
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
  signalCreate: (signal: AnySignal<any>, deps?: SignalMap) => {
    const hooks = getHooks();
    const onSignalCreate = hooks.onSignalCreate;

    if (!onSignalCreate) {
      // DevTools not enabled yet - queue for later replay in global queue
      queueAccessor.get().push({ signal, deps });
      return;
    }

    onSignalCreate(signal, deps);
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
