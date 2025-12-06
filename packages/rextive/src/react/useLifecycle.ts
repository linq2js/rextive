import { useEffect, useState } from "react";
import { dev } from "../utils/dev";
import { tryDispose } from "../disposable";

/**
 * Lifecycle phase type
 */
export type LifecyclePhase = "render" | "mount" | "cleanup" | "disposed";

/**
 * Lifecycle callbacks for tracked object lifecycle (with target)
 */
export type LifecycleCallbacks<TTarget> = {
  /** Called when this object becomes active */
  init?: (target: TTarget) => void;
  /** Called after this object is initialized */
  mount?: (target: TTarget) => void;
  /** Called on every render with current object */
  render?: (target: TTarget) => void;
  /**
   * Called after render (after DOM updates) - use to update/sync scope state
   * - Simple form: `(target) => void` - runs after every render
   * - With deps: `[(target) => void, dep1, dep2]` - runs when deps change
   */
  update?: ((target: TTarget) => void) | [(target: TTarget) => void, ...any[]];
  /** Called when this object is being replaced or component unmounts */
  cleanup?: (target: TTarget) => void;
  /** Called when this object is truly done (StrictMode-safe) */
  dispose?: (target: TTarget) => void;
};

/**
 * Internal type that combines both callback styles
 */
type InternalLifecycleOptions = {
  for?: any;
  init?: ((target: any) => void) | VoidFunction;
  mount?: ((target: any) => void) | VoidFunction;
  render?: ((target: any) => void) | VoidFunction;
  update?:
    | ((target: any) => void)
    | VoidFunction
    | [(target: any) => void, ...any[]];
  cleanup?: ((target: any) => void) | VoidFunction;
  dispose?: ((target: any) => void) | VoidFunction;
};

/**
 * Hook for managing component lifecycle with fine-grained control
 *
 * **Two modes:**
 * 1. Component lifecycle (no `for`): Callbacks run based on component's lifecycle
 * 2. Object lifecycle (with `for`): Callbacks run based on tracked object's lifecycle
 *
 * @param options - Lifecycle callbacks
 * @returns `getPhase` function - Returns current lifecycle phase dynamically
 *
 * @example Component lifecycle
 * ```tsx
 * const getPhase = useLifecycle({
 *   init: () => console.log('Component initializing'),
 *   mount: () => console.log('Component mounted'),
 *   dispose: () => console.log('Component disposed'),
 * });
 * ```
 *
 * @example Object lifecycle
 * ```tsx
 * const user = { id: 1, name: 'John' };
 *
 * const getPhase = useLifecycle({
 *   for: user, // Track this object
 *   init: (user) => console.log('User activated:', user),
 *   mount: (user) => startTracking(user),
 *   cleanup: (user) => pauseTracking(user),
 *   dispose: (user) => analytics.track('user-session-end', user),
 * });
 *
 * // When user reference changes, old user is disposed and new user is initialized
 * ```
 */

// Overload 1: Component lifecycle (no target object)
export function useLifecycle(
  options: LifecycleCallbacks<void>
): () => LifecyclePhase;

// Overload 2: Object lifecycle (with target object)
export function useLifecycle<TTarget>(
  options: { for: TTarget } & LifecycleCallbacks<TTarget>
): () => LifecyclePhase;

// Implementation
export function useLifecycle(
  options: InternalLifecycleOptions
): () => LifecyclePhase {
  const hasTarget = "for" in options;
  const target = options.for;

  // Create stable ref object using useState (created once, never recreated)
  // Run init callback during initialization (before first render)
  const [ref] = useState(() => {
    let phase: LifecyclePhase = "render";
    let pendingDispose: { target: any; shouldRun: boolean } | null = null;
    let isFirstMount = true;
    let currentOptions = options;

    // Call init with target (runs before first render)
    if (hasTarget) {
      (currentOptions.init as any)?.(target);
    } else {
      (currentOptions.init as VoidFunction)?.();
    }

    const dispose = (targetToDispose: any) => {
      if (phase === "disposed") return;
      phase = "disposed";

      try {
        if (hasTarget) {
          (currentOptions.dispose as any)?.(targetToDispose);
        } else {
          (currentOptions.dispose as VoidFunction)?.();
        }
      } catch (error) {
        console.error("Error in dispose callback:", error);
      }
      tryDispose(targetToDispose);
    };

    return {
      getPhase: () => phase,
      setPhase: (p: LifecyclePhase) => {
        phase = p;
      },
      setOptions: (opts: InternalLifecycleOptions) => {
        currentOptions = opts;
      },
      onMount(mountTarget: any) {
        // Handle pending dispose from previous target
        if (pendingDispose) {
          if (pendingDispose.target === mountTarget) {
            // StrictMode remount: cancel the dispose
            pendingDispose.shouldRun = false;
          } else {
            // Target changed: run dispose for old target synchronously
            if (pendingDispose.shouldRun) {
              dispose(pendingDispose.target);
              pendingDispose.shouldRun = false;
            }
          }
          pendingDispose = null;
        }

        // Call init for new target (except first mount, already called in useState)
        if (!isFirstMount && hasTarget) {
          (currentOptions.init as any)?.(mountTarget);
        }
        isFirstMount = false;

        phase = "mount";

        // Call mount callback
        if (hasTarget) {
          (currentOptions.mount as any)?.(mountTarget);
        } else {
          (currentOptions.mount as VoidFunction)?.();
        }

        // Return cleanup function that captures THIS target
        const capturedTarget = mountTarget;
        return () => {
          phase = "cleanup";

          // Call cleanup callback
          if (hasTarget) {
            (currentOptions.cleanup as any)?.(capturedTarget);
          } else {
            (currentOptions.cleanup as VoidFunction)?.();
          }

          if (currentOptions.dispose) {
            if (dev()) {
              // Dev mode: defer dispose for StrictMode handling
              const disposeTask = { target: capturedTarget, shouldRun: true };
              pendingDispose = disposeTask;

              Promise.resolve().then(() => {
                if (disposeTask.shouldRun) {
                  dispose(capturedTarget);
                }
                if (pendingDispose === disposeTask) {
                  pendingDispose = null;
                }
              });
            } else {
              // Production: dispose immediately
              dispose(capturedTarget);
            }
          }
        };
      },
    };
  });

  // Update options on every render
  ref.setOptions(options);
  ref.setPhase("render");

  // Call render callback
  if (hasTarget) {
    (options.render as any)?.(target);
  } else {
    (options.render as VoidFunction)?.();
  }

  // Parse update callback and deps
  const updateCallback = Array.isArray(options.update)
    ? options.update[0]
    : options.update;
  const updateDeps = Array.isArray(options.update)
    ? options.update.slice(1)
    : undefined;

  // Setup mount/cleanup lifecycle
  // Re-run when target changes (only in object lifecycle mode)
  useEffect(
    () => {
      return ref.onMount(target);
    },
    hasTarget ? [target] : []
  );

  // Call update callback after render (with optional deps)
  useEffect(() => {
    if (updateCallback) {
      if (hasTarget) {
        (updateCallback as any)(target);
      } else {
        (updateCallback as VoidFunction)();
      }
    }
  }, updateDeps);

  return ref.getPhase;
}
