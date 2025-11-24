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
 *
 * @param deps - Map of signal dependencies
 * @param onCleanup - Emitter for cleanup callbacks
 * @param onDepChange - Callback when any dependency changes
 * @returns Context object with dependency tracking and cleanup
 */
export function createSignalContext(
  deps: SignalMap,
  onCleanup: Emitter,
  onDepChange: VoidFunction
): InternalComputedSignalContext {
  let abortController: AbortController | undefined;
  let trackedDeps: Set<Signal<any>> | undefined;
  let depsProxy: any;
  let propValueCache: Map<string, { value: any; error: any }> | undefined;
  let aborted = false;

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
   * Execute a function only if the computation is still active.
   *
   * Prevents wasted work after a computation has been cancelled by:
   * - Throwing AbortedComputationError for sync functions if already aborted
   * - Returning a never-resolving promise for async functions if aborted during execution
   *
   * @param fn - The function to execute
   * @param args - Arguments to pass to the function
   * @returns The result of the function
   * @throws {AbortedComputationError} If the computation was aborted before execution
   *
   * @example Prevent expensive operations after fetch
   * ```ts
   * const data = signal({ userId }, async ({ deps, run, abortSignal }) => {
   *   const response = await fetch(`/api/users/${deps.userId}`, { signal: abortSignal });
   *   const json = await response.json();
   *
   *   // Only runs if not aborted - no manual checks needed
   *   const processed = run(() => expensiveProcessing(json));
   *   const formatted = run(formatData, processed, "options");
   *
   *   return formatted;
   * });
   * ```
   *
   * @example Use in loops
   * ```ts
   * const results = signal({ items }, ({ deps, run }) => {
   *   return deps.items.map(item => run(processItem, item));
   * });
   * ```
   */
  const run = function <T>(fn: (...args: any[]) => T, ...args: any[]): T {
    // If computation was already aborted, throw immediately
    // This prevents execution of sync functions
    if (aborted) {
      throw new AbortedComputationError();
    }

    // Execute the function
    const result = fn(...args);

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
    return run(() => logic(context, ...args));
  };

  const context: InternalComputedSignalContext = {
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
    cleanup: onCleanup.on,
    use: use as any,
    run: run as any,
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
 * This error is thrown by `context.run()` when:
 * - The computation has been cancelled (dependency changed during async operation)
 * - The signal has been disposed
 *
 * This error is handled internally by the signal system and typically
 * doesn't need to be caught by user code.
 *
 * @example
 * ```ts
 * const mySignal = signal({ count }, async ({ deps, run }) => {
 *   await fetch('/api/data');
 *
 *   try {
 *     // This will throw AbortedComputationError if computation was cancelled
 *     return run(() => expensiveOperation());
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
