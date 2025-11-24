import { Emitter } from "./utils/emitter";
import {
  Signal,
  SignalMap,
  ComputedSignalContext,
  ResolvedValueMap,
} from "./types";
import { createSignalAccessProxy } from "./utils/createSignalAccessProxy";

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
): ComputedSignalContext<SignalMap> & {
  trackedDeps: Set<Signal<any>>;
  abortController: AbortController;
  dispose: VoidFunction;
} {
  let abortController: AbortController | undefined;
  let trackedDeps: Set<Signal<any>> | undefined;
  let depsProxy: any;
  let propValueCache: Map<string, { value: any; error: any }> | undefined;

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
    abortController?.abort();
    abortController = undefined;
    trackedDeps?.clear();
    propValueCache?.clear();
    trackedDeps = undefined;
    depsProxy = undefined;
  };

  return {
    get abortController() {
      return getAbortController();
    },
    get trackedDeps() {
      return getTrackedDeps();
    },
    get abortSignal() {
      return getAbortController().signal;
    },
    cleanup: onCleanup.on,
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
}
