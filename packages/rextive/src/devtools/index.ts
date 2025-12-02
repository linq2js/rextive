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
import { setDevToolsHooks } from "../hooks";
import { getErrorTrace } from "../utils/errorTracking";
import type {
  SignalInfo,
  SignalError,
  SignalErrorContext,
  TagInfo,
  DevToolsEvent,
  DevToolsEventListener,
  DevToolsOptions,
  SourceLocation,
  ChainReaction,
  ChainOccurrence,
  ChainTrackingState,
} from "./types";

// Re-export types
export type {
  SignalInfo,
  SignalError,
  SignalErrorContext,
  TagInfo,
  DevToolsEvent,
  DevToolsEventListener,
  DevToolsOptions,
  SourceLocation,
  ChainReaction,
  ChainOccurrence,
  ChainTrackingState,
};

// ============================================================================
// STATE (shared via globalThis for cross-module compatibility)
// ============================================================================

/** Maximum number of events to cache (to prevent memory issues) */
const MAX_EVENT_CACHE = 1000;

/** Global key for DevTools shared state */
const DEVTOOLS_STATE_KEY = "__REXTIVE_DEVTOOLS_STATE__";

/** DevTools shared state structure */
interface DevToolsState {
  signals: Map<string, SignalInfo>;
  signalToId: WeakMap<Signal<any>, string>;
  signalIdCounter: number;
  tags: Map<string, TagInfo>;
  listeners: Set<DevToolsEventListener>;
  eventCache: DevToolsEvent[];
  config: Required<DevToolsOptions>;
  enabled: boolean;
  chainState: ChainTrackingState;
  windowErrorHandler: ((event: ErrorEvent) => void) | null;
  windowRejectionHandler: ((event: PromiseRejectionEvent) => void) | null;
}

/** Get or create the shared DevTools state */
function getState(): DevToolsState {
  const g = globalThis as typeof globalThis & {
    [DEVTOOLS_STATE_KEY]?: DevToolsState;
  };
  if (!g[DEVTOOLS_STATE_KEY]) {
    console.log("[DevTools:getState] Creating new shared state instance");
    g[DEVTOOLS_STATE_KEY] = {
      signals: new Map(),
      signalToId: new WeakMap(),
      signalIdCounter: 0,
      tags: new Map(),
      listeners: new Set(),
      eventCache: [],
      config: {
        maxHistory: 50,
        name: "rextive",
        logToConsole: false,
      },
      enabled: false,
      chainState: {
        enabled: false,
        currentChain: null,
        currentChainStartTime: null,
        chainTimeout: null,
        chains: new Map(),
        minChainLength: 2,
      },
      windowErrorHandler: null,
      windowRejectionHandler: null,
    };
  }
  return g[DEVTOOLS_STATE_KEY];
}

// Internal accessor functions (prefixed with $ to avoid conflicts with public API)
const $signals = () => getState().signals;
const $signalToId = () => getState().signalToId;
const $tags = () => getState().tags;
const $listeners = () => getState().listeners;
const $eventCache = () => getState().eventCache;
const $config = () => getState().config;
const $chainState = () => getState().chainState;

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function emit(event: DevToolsEvent): void {
  const config = $config();
  const listeners = $listeners();
  const eventCache = $eventCache();

  if (config.logToConsole) {
    // Filter out noisy events that aren't useful for console logging
    // (they're still emitted to listeners, just not logged to console)
    const shouldLog = event.type !== "signals:forget";
    if (shouldLog) {
      console.log(`[${config.name}]`, event.type, event);
    }
  }

  // If there are listeners, emit immediately
  if ($listeners().size > 0) {
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("[rextive/devtools] Error in event listener:", error);
      }
    }
  } else {
    // No listeners yet - cache the event for later replay
    eventCache.push(event);
    // Limit cache size to prevent memory issues
    if ($eventCache().length > MAX_EVENT_CACHE) {
      eventCache.shift(); // Remove oldest event
    }
  }
}

function getSignalKind(signal: Signal<any>): "mutable" | "computed" {
  // Check if signal has 'set' method (mutable) or 'pause' method (computed)
  return "set" in signal ? "mutable" : "computed";
}

// Window error listeners are now stored in getState()

/**
 * Set up window error and unhandled rejection listeners
 */
function setupWindowErrorListeners(): void {
  if (typeof window === "undefined") return;

  // Remove existing listeners if any
  removeWindowErrorListeners();

  const state = getState();

  // Window error handler
  state.windowErrorHandler = (event: ErrorEvent) => {
    emit({
      type: "window:error",
      message: event.message,
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
      timestamp: Date.now(),
    });
  };

  // Unhandled promise rejection handler
  state.windowRejectionHandler = (event: PromiseRejectionEvent) => {
    emit({
      type: "window:unhandledrejection",
      reason: event.reason,
      promise: event.promise,
      timestamp: Date.now(),
    });
  };

  window.addEventListener("error", state.windowErrorHandler);
  window.addEventListener("unhandledrejection", state.windowRejectionHandler);
}

/**
 * Remove window error listeners
 */
function removeWindowErrorListeners(): void {
  if (typeof window === "undefined") return;

  const state = getState();

  if (state.windowErrorHandler) {
    window.removeEventListener("error", state.windowErrorHandler);
    state.windowErrorHandler = null;
  }

  if (state.windowRejectionHandler) {
    window.removeEventListener(
      "unhandledrejection",
      state.windowRejectionHandler
    );
    state.windowRejectionHandler = null;
  }
}

/**
 * Parse a stack trace line to extract source location.
 * Handles various browser formats:
 * - Chrome/V8: "    at functionName (file:line:col)" or "    at file:line:col"
 * - Firefox: "functionName@file:line:col"
 * - Safari: similar to Firefox
 */
function parseStackLine(line: string): SourceLocation | null {
  // Skip empty lines
  if (!line.trim()) return null;

  // Chrome/V8 format: "    at functionName (file:line:col)"
  const chromeMatch = line.match(
    /^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/
  );
  if (chromeMatch) {
    return {
      functionName: chromeMatch[1] || undefined,
      file: chromeMatch[2],
      line: parseInt(chromeMatch[3], 10),
      column: parseInt(chromeMatch[4], 10),
    };
  }

  // Firefox/Safari format: "functionName@file:line:col"
  const firefoxMatch = line.match(/^(.+?)@(.+?):(\d+):(\d+)$/);
  if (firefoxMatch) {
    return {
      functionName: firefoxMatch[1] || undefined,
      file: firefoxMatch[2],
      line: parseInt(firefoxMatch[3], 10),
      column: parseInt(firefoxMatch[4], 10),
    };
  }

  return null;
}

/**
 * Capture source location from current call stack.
 * Skips internal rextive frames to find user code.
 */
function captureSourceLocation(): SourceLocation | undefined {
  try {
    const stack = new Error().stack;
    if (!stack) return undefined;

    const lines = stack.split("\n");

    // Skip frames that are internal to rextive
    // Look for the first frame that's NOT in rextive/src or node_modules
    for (const line of lines) {
      // Skip the "Error" line
      if (line.trim().startsWith("Error")) continue;

      // Skip internal rextive frames
      if (
        line.includes("/rextive/src/") ||
        line.includes("/rextive/dist/") ||
        line.includes("node_modules")
      ) {
        continue;
      }

      const location = parseStackLine(line);
      if (location) {
        // Simplify file path for display
        // Convert full URLs to relative paths
        let file = location.file;

        // Remove webpack/vite prefixes
        file = file.replace(/^webpack-internal:\/\/\//, "");
        file = file.replace(/^vite:\/\/\//, "");

        // Try to get just the filename and parent folder
        const parts = file.split("/");
        if (parts.length > 2) {
          file = parts.slice(-2).join("/");
        }

        return {
          ...location,
          file,
        };
      }
    }
  } catch {
    // Ignore errors in stack parsing
  }

  return undefined;
}

// ============================================================================
// CHAIN TRACKING HELPERS
// ============================================================================

/**
 * Generate a hash for a chain path to group identical chains.
 */
function hashChainPath(path: string[]): string {
  return path.join(" → ");
}

/**
 * Finalize the current chain if it meets minimum length.
 */
function finalizeCurrentChain(): void {
  const chainState = $chainState();

  if (!chainState.currentChain || !chainState.currentChainStartTime) {
    chainState.currentChain = null;
    chainState.currentChainStartTime = null;
    return;
  }

  const path = chainState.currentChain;
  const startTime = chainState.currentChainStartTime;
  const endTime = Date.now();

  // Only save chains with minimum length
  if (path.length >= chainState.minChainLength) {
    const id = hashChainPath(path);

    let chain = chainState.chains.get(id);
    if (!chain) {
      // Determine which signals are async (computed signals)
      const asyncSignals = new Set<string>();
      for (const signalId of path) {
        const info = $signals().get(signalId);
        if (info && info.kind === "computed") {
          // Check if signal has async value (promise)
          try {
            const value = info.signal.tryGet?.() ?? info.signal();
            if (value && typeof value === "object" && "then" in value) {
              asyncSignals.add(signalId);
            }
          } catch {
            // Ignore errors
          }
        }
      }

      chain = {
        id,
        path: [...path],
        asyncSignals,
        occurrences: [],
        lastTriggered: startTime,
      };
      chainState.chains.set(id, chain);
    }

    // Add occurrence
    const occurrence: ChainOccurrence = {
      startTime,
      endTime,
      duration: endTime - startTime,
      status: "complete",
    };
    chain.occurrences.unshift(occurrence);
    chain.lastTriggered = startTime;

    // Limit occurrences to prevent memory bloat
    if (chain.occurrences.length > 100) {
      chain.occurrences.pop();
    }
  }

  // Reset current chain
  chainState.currentChain = null;
  chainState.currentChainStartTime = null;
}

/**
 * Add a signal to the current chain.
 */
function addToChain(signalId: string): void {
  const chainState = $chainState();

  if (!chainState.enabled) return;

  const now = Date.now();

  if (chainState.currentChain === null) {
    // Start a new chain
    chainState.currentChain = [signalId];
    chainState.currentChainStartTime = now;
  } else {
    // Add to existing chain (avoid duplicates in sequence)
    const lastSignal =
      chainState.currentChain[chainState.currentChain.length - 1];
    if (lastSignal !== signalId) {
      chainState.currentChain.push(signalId);
    }
  }

  // Clear existing timeout and set new one
  if (chainState.chainTimeout) {
    clearTimeout(chainState.chainTimeout);
  }

  // Use setTimeout(0) to detect end of synchronous chain
  chainState.chainTimeout = setTimeout(() => {
    finalizeCurrentChain();
    chainState.chainTimeout = null;
  }, 0);
}

// ============================================================================
// DEVTOOLS HOOKS
// ============================================================================

const devToolsHooks: DevTools = {
  onSignalCreate(signal: Signal<any>): void {
    if ($config().logToConsole) {
      console.log(
        `[${$config().name}] onSignalCreate called for:`,
        signal.displayName || "unnamed"
      );
    }
    // Generate unique ID for this signal object
    const id = `signal-${++getState().signalIdCounter}`;
    const name = signal.displayName || "unnamed";
    const now = Date.now();

    // Check which tags already have this signal registered by NAME
    // (onTagAdd may have been called before onSignalCreate during initialization)
    // Update tag's signals set to use unique ID instead of name
    const signalTags = new Set<string>();
    for (const [tagId, tagInfo] of $tags()) {
      if (tagInfo.signals.has(name)) {
        // Replace name with unique ID in tag's signals set
        tagInfo.signals.delete(name);
        tagInfo.signals.add(id);
        signalTags.add(tagId);
      }
    }

    const info: SignalInfo = {
      id,
      name, // Display name (may not be unique)
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
      source: captureSourceLocation(),
    };

    $signals().set(id, info);
    $signalToId().set(signal, id); // Track signal → unique ID mapping
    const createEvent = { type: "signal:create" as const, signal: info };
    if ($config().logToConsole) {
      console.log(
        `[${$config().name}] Emitting signal:create for ${id}, listeners: ${
          $listeners().size
        }, cache: ${$eventCache().length}`
      );
    }
    emit(createEvent);
  },

  onSignalDispose(signal: Signal<any>): void {
    // Use reverse lookup to find current ID (handles renamed signals)
    const id = $signalToId().get(signal) || signal.displayName || "unnamed";
    const now = Date.now();

    // Mark as disposed instead of deleting (keeps history visible)
    const info = $signals().get(id);
    if (info) {
      info.disposed = true;
      info.disposedAt = now;

      // Remove from all tags
      for (const tagId of info.tags) {
        const tagInfo = $tags().get(tagId);
        if (tagInfo) {
          tagInfo.signals.delete(id);
        }
      }
      info.tags.clear();
    }

    emit({ type: "signal:dispose", signalId: id });
  },

  onForgetSignals(signalsToForget: Signal<any>[]): void {
    // Completely remove signals from registry (for orphaned StrictMode scopes)
    const forgottenIds: string[] = [];

    for (const signal of signalsToForget) {
      const id = $signalToId().get(signal);
      if (id) {
        $signals().delete(id);
        $signalToId().delete(signal);
        forgottenIds.push(id);
      }
    }

    // Emit event so DevToolsPanel can clean up related events
    if (forgottenIds.length > 0) {
      emit({ type: "signals:forget", signalIds: forgottenIds });
    }
  },

  onSignalRename(signal: Signal<any>): void {
    // Look up by signal reference (ID is unique per object, never changes)
    const id = $signalToId().get(signal);
    if (!id) return;

    const info = $signals().get(id);
    if (!info) return;

    const newName = signal.displayName || "unnamed";
    const oldName = info.name;

    // Skip if name unchanged
    if (oldName === newName) return;

    // Update the display name
    info.name = newName;

    emit({ type: "signal:rename", oldId: oldName, newId: newName });
  },

  onSignalChange(signal: Signal<any>, value: unknown): void {
    // Use reverse lookup to find current ID (handles renamed signals)
    const id = $signalToId().get(signal) || signal.displayName || "unnamed";
    const info = $signals().get(id);
    const now = Date.now();

    if (info) {
      info.updatedAt = now;
      info.changeCount++;

      // Add to history (most recent first)
      info.history.unshift({ value, timestamp: now });

      // Trim history to max size
      if (info.history.length > $config().maxHistory) {
        info.history.pop();
      }
    }

    // Track chain reactions
    addToChain(id);

    emit({ type: "signal:change", signalId: id, value, timestamp: now });
  },

  onSignalError(signal: Signal<any>, error: unknown): void {
    // Use reverse lookup to find current ID (handles renamed signals)
    const id = $signalToId().get(signal) || signal.displayName || "unnamed";
    const info = $signals().get(id);
    const now = Date.now();

    // Extract trace info if available (from errorTracking)
    const traces = getErrorTrace(error);
    const latestTrace = traces?.[traces.length - 1];

    const signalError: SignalError = {
      message: error instanceof Error ? error.message : String(error),
      error,
      timestamp: now,
      context: latestTrace
        ? { when: latestTrace.when, async: latestTrace.async }
        : undefined,
    };

    if (info) {
      info.errorCount++;
      info.errors.unshift(signalError);

      // Trim errors to max size (same as history)
      if (info.errors.length > $config().maxHistory) {
        info.errors.pop();
      }
    }

    emit({ type: "signal:error", signalId: id, error: signalError });

    // Always log errors to console for visibility
    if ($config().logToConsole) {
      const contextInfo = signalError.context
        ? ` (${signalError.context.when}${
            signalError.context.async ? ", async" : ""
          })`
        : "";
      console.error(
        `[${$config().name}] Signal error in "${id}"${contextInfo}:`,
        error
      );
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

    $tags().set(id, info);
    emit({ type: "tag:create", tag: info });
  },

  onTagAdd(tag: Tag<any>, signal: Signal<any>): void {
    const tagId = tag.displayName;
    // Use unique ID from WeakMap, fall back to display name if signal not yet tracked
    const signalId =
      $signalToId().get(signal) || signal.displayName || "unnamed";

    const tagInfo = $tags().get(tagId);
    if (tagInfo) {
      tagInfo.signals.add(signalId);
    }

    // Note: signalInfo might not exist yet if onTagAdd is called before onSignalCreate
    // (which happens during signal initialization). We'll update the signal's tags
    // in onSignalCreate if it has tags already registered.
    const signalInfo = $signals().get(signalId);
    if (signalInfo) {
      signalInfo.tags.add(tagId);
    }

    emit({ type: "tag:add", tagId, signalId });
  },

  onTagRemove(tag: Tag<any>, signal: Signal<any>): void {
    const tagId = tag.displayName;
    // Use unique ID from WeakMap
    const signalId =
      $signalToId().get(signal) || signal.displayName || "unnamed";

    const tagInfo = $tags().get(tagId);
    const signalInfo = $signals().get(signalId);

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
  if (getState().enabled) {
    console.warn("[rextive/devtools] DevTools already enabled");
    return;
  }

  const state = getState();
  state.config = {
    maxHistory: options.maxHistory ?? 50,
    name: options.name ?? "rextive",
    logToConsole: options.logToConsole ?? false,
  };

  // Set hooks via both mechanisms for backwards compatibility
  globalThis.__REXTIVE_DEVTOOLS__ = devToolsHooks;
  setDevToolsHooks(devToolsHooks);
  getState().enabled = true;

  // Set up window error listeners
  setupWindowErrorListeners();

  if ($config().logToConsole) {
    console.log(`[${$config().name}] DevTools enabled`);
  }
}

/**
 * Disable devtools and clear all tracked data.
 */
export function disableDevTools(): void {
  if (!getState().enabled) {
    return;
  }

  // Clear hooks via both mechanisms
  setDevToolsHooks(null);
  // Set to undefined after setDevToolsHooks to ensure consistency
  globalThis.__REXTIVE_DEVTOOLS__ = undefined;
  getState().enabled = false;

  // Remove window error listeners
  removeWindowErrorListeners();

  // Clear registries
  $signals().clear();
  $tags().clear();
  $listeners().clear();
  $eventCache().length = 0; // Clear event cache

  if ($config().logToConsole) {
    console.log(`[${$config().name}] DevTools disabled`);
  }
}

/**
 * Check if devtools is enabled.
 */
export function isDevToolsEnabled(): boolean {
  return getState().enabled;
}

/**
 * Get all tracked signals.
 *
 * @returns Map of signal ID to SignalInfo
 */
export function getSignals(): ReadonlyMap<string, SignalInfo> {
  return $signals();
}

/**
 * Get a specific signal by name or ID.
 *
 * @param nameOrId - Signal display name or unique ID
 * @returns SignalInfo or undefined
 */
export function getSignal(nameOrId: string): SignalInfo | undefined {
  // First try exact ID match
  const byId = $signals().get(nameOrId);
  if (byId) return byId;
  // Then search by name
  for (const info of $signals().values()) {
    if (info.name === nameOrId) return info;
  }
  return undefined;
}

/**
 * Get all tracked tags.
 *
 * @returns Map of tag ID to TagInfo
 */
export function getTags(): ReadonlyMap<string, TagInfo> {
  return $tags();
}

/**
 * Get a specific tag by ID.
 *
 * @param id - Tag displayName
 * @returns TagInfo or undefined
 */
export function getTag(id: string): TagInfo | undefined {
  return $tags().get(id);
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
  $listeners().add(listener);

  // Replay cached events to the new listener
  // This ensures events emitted before the listener subscribed are still received
  const cachedEvents = $eventCache();
  if (cachedEvents.length > 0) {
    // Debug: log replay (always log, not just when logToConsole is true)
    console.log(
      `[${$config().name}] Replaying ${
        cachedEvents.length
      } cached events to new listener`
    );
    // Log what types of events are being replayed
    const eventTypes = cachedEvents.map((e) => e.type);
    const typeCounts = eventTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`[${$config().name}] Cached event types:`, typeCounts);
    // Replay events in order (oldest first)
    for (const cachedEvent of cachedEvents) {
      try {
        listener(cachedEvent);
      } catch (error) {
        console.error(
          "[rextive/devtools] Error replaying cached event:",
          error
        );
      }
    }
    // Note: We don't clear the cache here because other listeners might subscribe later
    // The cache will be cleared when DevTools is disabled
  }

  return () => {
    $listeners().delete(listener);
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

  for (const info of $signals().values()) {
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
    signalCount: $signals().size - disposedCount, // Active signals only
    mutableCount,
    computedCount,
    tagCount: $tags().size,
    totalChanges,
    totalErrors,
    signalsWithErrors,
    disposedCount,
  };
}

/**
 * Get current value of all signals as a plain object.
 * Useful for debugging and snapshots.
 * Keys are signal display names (may have duplicates overwritten).
 */
export function getSnapshot(): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};

  for (const [, info] of $signals()) {
    try {
      snapshot[info.name] = info.signal();
    } catch {
      snapshot[info.name] = "[error reading value]";
    }
  }

  return snapshot;
}

/**
 * Log current state to console (pretty printed).
 */
export function logState(): void {
  console.group(`[${$config().name}] DevTools State`);

  console.log("Stats:", getStats());

  console.groupCollapsed("Signals");
  for (const [id, info] of $signals()) {
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
  for (const [id, info] of $tags()) {
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
  for (const info of $signals().values()) {
    info.history = [];
    info.changeCount = 0;
  }
}

/**
 * Reset devtools state (clear all tracked signals and tags).
 * Devtools remains enabled.
 */
export function reset(): void {
  $signals().clear();
  $tags().clear();
}

/**
 * Clear disposed signals from the registry.
 * Useful for cleaning up the devtools UI.
 */
export function clearDisposed(): void {
  for (const [id, info] of $signals()) {
    if (info.disposed) {
      $signals().delete(id);
    }
  }
}

/**
 * Delete a single signal from the registry by ID.
 * Only works for disposed signals.
 *
 * @param id - Signal displayName to delete
 * @returns true if signal was deleted, false otherwise
 */
export function deleteSignal(id: string): boolean {
  const info = $signals().get(id);
  if (info && info.disposed) {
    $signals().delete(id);
    return true;
  }
  return false;
}

// ============================================================================
// CHAIN TRACKING API
// ============================================================================

/**
 * Enable chain reaction tracking.
 * Call this when the Chains tab becomes active.
 */
export function enableChainTracking(): void {
  $chainState().enabled = true;
}

/**
 * Disable chain reaction tracking.
 * Call this when the Chains tab becomes inactive.
 */
export function disableChainTracking(): void {
  const chainState = $chainState();
  chainState.enabled = false;
  // Clear any pending chain
  if (chainState.chainTimeout) {
    clearTimeout(chainState.chainTimeout);
    chainState.chainTimeout = null;
  }
  chainState.currentChain = null;
  chainState.currentChainStartTime = null;
}

/**
 * Check if chain tracking is enabled.
 */
export function isChainTrackingEnabled(): boolean {
  return $chainState().enabled;
}

/**
 * Get all tracked chain reactions.
 * @returns Map of chain ID to ChainReaction
 */
export function getChains(): ReadonlyMap<string, ChainReaction> {
  return $chainState().chains;
}

/**
 * Get chains as an array sorted by last triggered time (most recent first).
 */
export function getChainsList(): ChainReaction[] {
  return Array.from($chainState().chains.values()).sort(
    (a, b) => b.lastTriggered - a.lastTriggered
  );
}

/**
 * Clear all tracked chain reactions.
 */
export function clearChains(): void {
  $chainState().chains.clear();
}

/**
 * Delete a specific chain by ID.
 * @param id - Chain ID (path hash)
 * @returns true if chain was deleted
 */
export function deleteChain(id: string): boolean {
  return $chainState().chains.delete(id);
}

/**
 * Build dependency graph from tracked signals and chain reactions.
 *
 * @returns Dependency graph with nodes and edges
 *
 * @example
 * ```ts
 * import { buildDependencyGraph, getSignals, getChainsList } from "rextive/devtools";
 *
 * const graph = buildDependencyGraph(getSignals(), getChainsList());
 * console.log("Nodes:", graph.nodes.size);
 * console.log("Edges:", graph.edges.length);
 * ```
 */
export { buildDependencyGraph } from "./utils/buildDependencyGraph";
export type {
  DependencyGraph,
  GraphNode,
  GraphEdge,
} from "./utils/buildDependencyGraph";
