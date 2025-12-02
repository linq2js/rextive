import { Emitter } from "./utils/emitter";
import {
  Signal,
  SignalMap,
  ComputedSignalContext,
  ResolvedValueMap,
} from "./types";
import { createSignalAccessProxy } from "./utils/createSignalAccessProxy";
import { isPromiseLike } from "./utils/isPromiseLike";

type InternalComputedSignalContext = ComputedSignalContext<SignalMap> & {
  trackedDeps: Set<Signal<any>>;
  abortController: AbortController;
  dispose: VoidFunction;
  _endComputing: VoidFunction;
};

/**
 * Creates a context object for signal computation.
 *
 * This context provides:
 * - `deps`: Proxy for accessing signal dependencies with auto-tracking
 * - `abortSignal`: AbortSignal for cancelling async operations
 * - `cleanup`: Register cleanup functions
 * - `trackedDeps`: Set of tracked signal dependencies
 * - `dispose`: Cleanup function for internal resources
 * - `refresh`: Trigger immediate recomputation (with aborted guard)
 * - `stale`: Mark signal as stale for lazy recomputation (with aborted guard)
 *
 * @param deps - Map of signal dependencies
 * @param onCleanup - Emitter for cleanup callbacks
 * @param onDepChange - Callback when any dependency changes
 * @param onRefresh - Callback for refresh (called only if not aborted)
 * @param onStale - Callback for stale (called only if not aborted)
 * @returns Context object with dependency tracking and cleanup
 */
export function createSignalContext(
  deps: SignalMap,
  onCleanup: Emitter,
  onDepChange: VoidFunction,
  onRefresh?: () => void,
  onStale?: () => void,
  nth: number = 0
): InternalComputedSignalContext {
  let abortController: AbortController | undefined;
  let trackedDeps: Set<Signal<any>> | undefined;
  let depsProxy: any;
  let propValueCache: Map<string, { value: any; error: any }> | undefined;
  let aborted = false;
  let isComputing = true; // Track if we're in synchronous computation phase (starts true)

  const getTrackedDeps = () => {
    if (!trackedDeps) {
      trackedDeps = new Set();
    }
    return trackedDeps;
  };

  const getAbortController = () => {
    if (!abortController) {
      abortController = new AbortController();
    }
    return abortController;
  };

  const internalCleanup = () => {
    if (aborted) return;
    aborted = true;
    abortController?.abort();
    abortController = undefined;
    trackedDeps?.clear();
    propValueCache?.clear();
    trackedDeps = undefined;
    depsProxy = undefined;
  };

  /**
   * Execute a function or promise safely within the abort-aware context.
   *
   * Prevents wasted work after a computation has been cancelled by:
   * - Throwing AbortedComputationError for sync functions if already aborted
   * - Returning a never-resolving promise for async functions/promises if aborted during execution
   *
   * @param fnOrPromise - The function to execute or promise to await
   * @param args - Arguments to pass to the function (if applicable)
   * @returns The result of the function/promise
   * @throws {AbortedComputationError} If the computation was aborted before execution
   *
   * @example Prevent expensive operations after fetch
   * ```ts
   * const data = signal({ userId }, async ({ deps, safe, abortSignal }) => {
   *   const response = await fetch(`/api/users/${deps.userId}`, { signal: abortSignal });
   *   const json = await response.json();
   *
   *   // Safely delay - never resolves if aborted
   *   await safe(wait.delay(300));
   *
   *   // Only runs if not aborted - no manual checks needed
   *   const processed = safe(() => expensiveProcessing(json));
   *   const formatted = safe(formatData, processed, "options");
   *
   *   return formatted;
   * });
   * ```
   *
   * @example Use in loops
   * ```ts
   * const results = signal({ items }, ({ deps, safe }) => {
   *   return deps.items.map(item => safe(processItem, item));
   * });
   * ```
   */
  const safe = function <T>(fnOrPromise: any, ...args: any[]): T {
    // If it's a promise, wrap it to handle abort
    if (isPromiseLike(fnOrPromise)) {
      // If already aborted, return never-resolving promise
      if (aborted) {
        return new Promise(() => {}) as any;
      }

      // Wrap the promise to handle abort during execution
      return new Promise((resolve, reject) => {
        fnOrPromise.then(
          (value: any) => {
            // Don't resolve if aborted while promise was pending
            if (aborted) return;
            resolve(value);
          },
          (error: any) => {
            // Don't reject if aborted while promise was pending
            if (aborted) return;
            reject(error);
          }
        );
      }) as any;
    }

    // It's a function - execute it
    // If computation was already aborted, throw immediately
    // This prevents execution of sync functions
    if (aborted) {
      throw new AbortedComputationError();
    }

    // Execute the function
    const result = fnOrPromise(...args);

    // If result is a promise, wrap it to handle abort during async execution
    // If aborted while promise is pending, it becomes a never-resolving promise
    // This prevents continuation after await and avoids unhandled rejections
    if (isPromiseLike(result)) {
      return new Promise((resolve, reject) => {
        result.then(
          (value) => {
            // Don't resolve if aborted while promise was pending
            if (aborted) return;
            resolve(value);
          },
          (error) => {
            // Don't reject if aborted while promise was pending
            if (aborted) return;
            reject(error);
          }
        );
      }) as any;
    }

    return result;
  };

  const use = (
    logic: (context: InternalComputedSignalContext, ...args: any[]) => any,
    ...args: any[]
  ) => {
    return safe(() => logic(context, ...args));
  };

  // Context methods for refresh and stale
  // These are safe to call even if computation is aborted (no-op)
  // But MUST be called asynchronously (not during computation)
  const contextRefresh = () => {
    // Must be called asynchronously
    if (isComputing) {
      throw new Error(
        "context.refresh() can only be called asynchronously (e.g., in setTimeout, Promise callbacks). " +
          "Calling it synchronously during computation would cause infinite recursion."
      );
    }

    // Safe to call even if aborted - no-op
    if (aborted) return;

    // Call the refresh callback if provided
    onRefresh?.();
  };

  const contextStale = () => {
    // Must be called asynchronously
    if (isComputing) {
      throw new Error(
        "context.stale() can only be called asynchronously (e.g., in setTimeout, Promise callbacks). " +
          "Calling it synchronously during computation doesn't make sense."
      );
    }

    // Safe to call even if aborted - no-op
    if (aborted) return;

    // Call the stale callback if provided
    onStale?.();
  };

  const context: InternalComputedSignalContext = {
    aborted: () => aborted,
    get abortController() {
      if (aborted) {
        throw new AbortedComputationError();
      }
      return getAbortController();
    },
    get trackedDeps() {
      return getTrackedDeps();
    },
    get abortSignal() {
      return getAbortController().signal;
    },
    nth,
    onCleanup: onCleanup.on,
    use: use as any,
    safe: safe as any,
    refresh: contextRefresh,
    stale: contextStale,
    _endComputing: () => {
      isComputing = false;
    },
    // Proxy for dependency access with auto-tracking
    get deps() {
      if (!depsProxy) {
        if (!propValueCache) {
          propValueCache = new Map();
        }

        depsProxy = createSignalAccessProxy<
          "value",
          SignalMap,
          ResolvedValueMap<SignalMap, "value">
        >({
          type: "value",

          getSignals: () => deps,
          propValueCache,
          onSignalAccess: (depSignal) => {
            // Auto-subscribe to dependency if not already tracked
            if (!getTrackedDeps().has(depSignal)) {
              getTrackedDeps().add(depSignal); // Mark as tracked
              // Subscribe to dep changes and store unsubscribe function in onCleanup
              onCleanup.on(depSignal.on(onDepChange));
            }
          },
          // Use peek() to read dependency values to avoid triggering render tracking.
          // This ensures that when a computed signal reads its dependencies during
          // recomputation, it doesn't inadvertently create render-level dependencies.
          // Internal reactivity tracking still works via onSignalAccess callback above.
          getValue: (signal) => signal.peek(),
        });
      }
      return depsProxy;
    },
    dispose: internalCleanup,
  };

  return context;
}

/**
 * Error thrown when attempting to execute code in an aborted computation.
 *
 * This error is thrown by `context.safe()` when:
 * - The computation has been cancelled (dependency changed during async operation)
 * - The signal has been disposed
 *
 * This error is handled internally by the signal system and typically
 * doesn't need to be caught by user code.
 *
 * @example
 * ```ts
 * const mySignal = signal({ count }, async ({ deps, safe }) => {
 *   await fetch('/api/data');
 *
 *   try {
 *     // This will throw AbortedComputationError if computation was cancelled
 *     return safe(() => expensiveOperation());
 *   } catch (e) {
 *     if (e instanceof AbortedComputationError) {
 *       console.log('Computation was cancelled');
 *     }
 *     throw e;
 *   }
 * });
 * ```
 */
export class AbortedComputationError extends Error {
  constructor() {
    super("Computation aborted");
    this.name = "AbortedComputationError";
  }
}
