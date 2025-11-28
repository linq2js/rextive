/**
 * Rextive DevTools
 *
 * Debug and inspect signals and tags in development.
 *
 * @example
 * ```ts
 * import { enableDevTools, getSignals, getTags } from 'rextive/devtools';
 *
 * // Enable devtools (call before creating signals)
 * enableDevTools();
 *
 * // Inspect signals
 * console.log(getSignals());
 *
 * // Subscribe to events
 * onDevToolsEvent((event) => {
 *   console.log('DevTools event:', event);
 * });
 * ```
 *
 * @module devtools
 */

import type { Signal, Tag, DevTools } from "../types";
import type {
  SignalInfo,
  SignalError,
  TagInfo,
  DevToolsEvent,
  DevToolsEventListener,
  DevToolsOptions,
} from "./types";

// Re-export types
export type {
  SignalInfo,
  SignalError,
  TagInfo,
  DevToolsEvent,
  DevToolsEventListener,
  DevToolsOptions,
};

// ============================================================================
// STATE
// ============================================================================

/** Registry of all tracked signals */
const signals = new Map<string, SignalInfo>();

/** Registry of all tracked tags */
const tags = new Map<string, TagInfo>();

/** Event listeners */
const listeners = new Set<DevToolsEventListener>();

/** Current configuration */
let config: Required<DevToolsOptions> = {
  maxHistory: 50,
  name: "rextive",
  logToConsole: false,
};

/** Whether devtools is enabled */
let enabled = false;

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function emit(event: DevToolsEvent): void {
  if (config.logToConsole) {
    console.log(`[${config.name}]`, event.type, event);
  }
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (error) {
      console.error("[rextive/devtools] Error in event listener:", error);
    }
  }
}

function getSignalKind(signal: Signal<any>): "mutable" | "computed" {
  // Check if signal has 'set' method (mutable) or 'pause' method (computed)
  return "set" in signal ? "mutable" : "computed";
}

// ============================================================================
// DEVTOOLS HOOKS
// ============================================================================

const devToolsHooks: DevTools = {
  onSignalCreate(signal: Signal<any>): void {
    const now = Date.now();

    // Defer registration to allow synchronous renames (e.g., from pipeSignals) to complete.
    // This ensures we capture the final displayName, not the initial auto-generated one.
    queueMicrotask(() => {
      const id = signal.displayName || "unnamed";

      // If a signal with this ID exists and is disposed, rename the disposed one
      // to preserve it in the history (e.g., "scopedCount-1" → "scopedCount-1 (disposed)")
      const existingInfo = signals.get(id);
      if (existingInfo && existingInfo.disposed) {
        const disposedId = `${id} (disposed)`;
        // Check if we already have too many disposed versions
        let counter = 1;
        let finalDisposedId = disposedId;
        while (signals.has(finalDisposedId)) {
          counter++;
          finalDisposedId = `${id} (disposed ${counter})`;
        }
        existingInfo.id = finalDisposedId;
        signals.delete(id);
        signals.set(finalDisposedId, existingInfo);
      }

      // Check which tags already have this signal registered
      // (onTagAdd may have been called before onSignalCreate during initialization)
      const signalTags = new Set<string>();
      for (const [tagId, tagInfo] of tags) {
        if (tagInfo.signals.has(id)) {
          signalTags.add(tagId);
        }
      }

      const info: SignalInfo = {
        id,
        kind: getSignalKind(signal),
        signal,
        createdAt: now,
        updatedAt: now,
        changeCount: 0,
        history: [],
        tags: signalTags,
        errorCount: 0,
        errors: [],
        disposed: false,
      };

      signals.set(id, info);
      emit({ type: "signal:create", signal: info });
    });
  },

  onSignalDispose(signal: Signal<any>): void {
    const id = signal.displayName || "unnamed";
    const now = Date.now();

    // Mark as disposed instead of deleting (keeps history visible)
    const info = signals.get(id);
    if (info) {
      info.disposed = true;
      info.disposedAt = now;

      // Remove from all tags
      for (const tagId of info.tags) {
        const tagInfo = tags.get(tagId);
        if (tagInfo) {
          tagInfo.signals.delete(id);
        }
      }
      info.tags.clear();
    }

    emit({ type: "signal:dispose", signalId: id });
  },

  onSignalChange(signal: Signal<any>, value: unknown): void {
    const id = signal.displayName || "unnamed";
    const info = signals.get(id);
    const now = Date.now();

    if (info) {
      info.updatedAt = now;
      info.changeCount++;

      // Add to history (most recent first)
      info.history.unshift({ value, timestamp: now });

      // Trim history to max size
      if (info.history.length > config.maxHistory) {
        info.history.pop();
      }
    }

    emit({ type: "signal:change", signalId: id, value, timestamp: now });
  },

  onSignalError(signal: Signal<any>, error: unknown): void {
    const id = signal.displayName || "unnamed";
    const info = signals.get(id);
    const now = Date.now();

    const signalError: SignalError = {
      message: error instanceof Error ? error.message : String(error),
      error,
      timestamp: now,
    };

    if (info) {
      info.errorCount++;
      info.errors.unshift(signalError);

      // Trim errors to max size (same as history)
      if (info.errors.length > config.maxHistory) {
        info.errors.pop();
      }
    }

    emit({ type: "signal:error", signalId: id, error: signalError });

    // Always log errors to console for visibility
    if (config.logToConsole) {
      console.error(`[${config.name}] Signal error in "${id}":`, error);
    }
  },

  onTagCreate(tag: Tag<any>): void {
    const id = tag.displayName;
    const now = Date.now();

    const info: TagInfo = {
      id,
      tag,
      createdAt: now,
      signals: new Set(),
    };

    tags.set(id, info);
    emit({ type: "tag:create", tag: info });
  },

  onTagAdd(tag: Tag<any>, signal: Signal<any>): void {
    const tagId = tag.displayName;
    const signalId = signal.displayName || "unnamed";

    const tagInfo = tags.get(tagId);
    if (tagInfo) {
      tagInfo.signals.add(signalId);
    }

    // Note: signalInfo might not exist yet if onTagAdd is called before onSignalCreate
    // (which happens during signal initialization). We'll update the signal's tags
    // in onSignalCreate if it has tags already registered.
    const signalInfo = signals.get(signalId);
    if (signalInfo) {
      signalInfo.tags.add(tagId);
    }

    emit({ type: "tag:add", tagId, signalId });
  },

  onTagRemove(tag: Tag<any>, signal: Signal<any>): void {
    const tagId = tag.displayName;
    const signalId = signal.displayName || "unnamed";

    const tagInfo = tags.get(tagId);
    const signalInfo = signals.get(signalId);

    if (tagInfo) {
      tagInfo.signals.delete(signalId);
    }
    if (signalInfo) {
      signalInfo.tags.delete(tagId);
    }

    emit({ type: "tag:remove", tagId, signalId });
  },
};

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Enable devtools.
 *
 * **Important:** Call this before creating any signals to track all signals.
 *
 * @param options - Configuration options
 *
 * @example
 * ```ts
 * // Basic usage
 * enableDevTools();
 *
 * // With options
 * enableDevTools({
 *   maxHistory: 100,
 *   name: 'my-app',
 *   logToConsole: true,
 * });
 * ```
 */
export function enableDevTools(options: DevToolsOptions = {}): void {
  if (enabled) {
    console.warn("[rextive/devtools] DevTools already enabled");
    return;
  }

  config = {
    maxHistory: options.maxHistory ?? 50,
    name: options.name ?? "rextive",
    logToConsole: options.logToConsole ?? false,
  };

  globalThis.__REXTIVE_DEVTOOLS__ = devToolsHooks;
  enabled = true;

  if (config.logToConsole) {
    console.log(`[${config.name}] DevTools enabled`);
  }
}

/**
 * Disable devtools and clear all tracked data.
 */
export function disableDevTools(): void {
  if (!enabled) {
    return;
  }

  globalThis.__REXTIVE_DEVTOOLS__ = undefined;
  enabled = false;

  // Clear registries
  signals.clear();
  tags.clear();
  listeners.clear();

  if (config.logToConsole) {
    console.log(`[${config.name}] DevTools disabled`);
  }
}

/**
 * Check if devtools is enabled.
 */
export function isDevToolsEnabled(): boolean {
  return enabled;
}

/**
 * Get all tracked signals.
 *
 * @returns Map of signal ID to SignalInfo
 */
export function getSignals(): ReadonlyMap<string, SignalInfo> {
  return signals;
}

/**
 * Get a specific signal by ID.
 *
 * @param id - Signal displayName
 * @returns SignalInfo or undefined
 */
export function getSignal(id: string): SignalInfo | undefined {
  return signals.get(id);
}

/**
 * Get all tracked tags.
 *
 * @returns Map of tag ID to TagInfo
 */
export function getTags(): ReadonlyMap<string, TagInfo> {
  return tags;
}

/**
 * Get a specific tag by ID.
 *
 * @param id - Tag displayName
 * @returns TagInfo or undefined
 */
export function getTag(id: string): TagInfo | undefined {
  return tags.get(id);
}

/**
 * Subscribe to devtools events.
 *
 * @param listener - Event listener function
 * @returns Unsubscribe function
 *
 * @example
 * ```ts
 * const unsubscribe = onDevToolsEvent((event) => {
 *   switch (event.type) {
 *     case 'signal:create':
 *       console.log('Signal created:', event.signal.id);
 *       break;
 *     case 'signal:change':
 *       console.log('Signal changed:', event.signalId, '→', event.value);
 *       break;
 *   }
 * });
 *
 * // Later: stop listening
 * unsubscribe();
 * ```
 */
export function onDevToolsEvent(listener: DevToolsEventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Get signal statistics.
 */
export function getStats(): {
  signalCount: number;
  mutableCount: number;
  computedCount: number;
  tagCount: number;
  totalChanges: number;
  totalErrors: number;
  signalsWithErrors: number;
  disposedCount: number;
} {
  let mutableCount = 0;
  let computedCount = 0;
  let totalChanges = 0;
  let totalErrors = 0;
  let signalsWithErrors = 0;
  let disposedCount = 0;

  for (const info of signals.values()) {
    if (info.disposed) {
      disposedCount++;
      continue; // Don't count disposed signals in active stats
    }
    if (info.kind === "mutable") {
      mutableCount++;
    } else {
      computedCount++;
    }
    totalChanges += info.changeCount;
    totalErrors += info.errorCount;
    if (info.errorCount > 0) {
      signalsWithErrors++;
    }
  }

  return {
    signalCount: signals.size - disposedCount, // Active signals only
    mutableCount,
    computedCount,
    tagCount: tags.size,
    totalChanges,
    totalErrors,
    signalsWithErrors,
    disposedCount,
  };
}

/**
 * Get current value of all signals as a plain object.
 * Useful for debugging and snapshots.
 */
export function getSnapshot(): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};

  for (const [id, info] of signals) {
    try {
      snapshot[id] = info.signal();
    } catch {
      snapshot[id] = "[error reading value]";
    }
  }

  return snapshot;
}

/**
 * Log current state to console (pretty printed).
 */
export function logState(): void {
  console.group(`[${config.name}] DevTools State`);

  console.log("Stats:", getStats());

  console.groupCollapsed("Signals");
  for (const [id, info] of signals) {
    let currentValue: unknown;
    try {
      currentValue = info.signal();
    } catch {
      currentValue = "[error]";
    }

    console.log(`${info.kind === "mutable" ? "📝" : "🔗"} ${id}:`, {
      value: currentValue,
      changes: info.changeCount,
      tags: Array.from(info.tags),
    });
  }
  console.groupEnd();

  console.groupCollapsed("Tags");
  for (const [id, info] of tags) {
    console.log(`🏷️ ${id}:`, {
      size: info.signals.size,
      signals: Array.from(info.signals),
    });
  }
  console.groupEnd();

  console.groupEnd();
}

/**
 * Clear history for all signals.
 */
export function clearHistory(): void {
  for (const info of signals.values()) {
    info.history = [];
    info.changeCount = 0;
  }
}

/**
 * Reset devtools state (clear all tracked signals and tags).
 * Devtools remains enabled.
 */
export function reset(): void {
  signals.clear();
  tags.clear();
}

/**
 * Clear disposed signals from the registry.
 * Useful for cleaning up the devtools UI.
 */
export function clearDisposed(): void {
  for (const [id, info] of signals) {
    if (info.disposed) {
      signals.delete(id);
    }
  }
}
