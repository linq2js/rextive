import { useLayoutEffect, useState } from "react";
import { isDev } from "../utils/dev";

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
  update?: ((target: any) => void) | VoidFunction | [(target: any) => void, ...any[]];
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
    let currentOptions = options;
    let isFirstMount = true;

    // Call init with target if present
    if (hasTarget) {
      (currentOptions.init as any)?.(target);
    } else {
      (currentOptions.init as VoidFunction)?.();
    }

    let phase: LifecyclePhase = "render";
    let pendingDispose: { target: any; shouldRun: boolean } | null = null;

    const dispose = (targetToDispose: any) => {
      if (phase === "disposed") return;
      phase = "disposed";

      if (hasTarget) {
        (currentOptions.dispose as any)?.(targetToDispose);
      } else {
        (currentOptions.dispose as VoidFunction)?.();
      }
    };

    return {
      /**
       * Returns the current lifecycle phase
       * Allows calling code to dynamically check component state
       *
       * @returns Current phase: "render" | "mount" | "cleanup" | "disposed"
       */
      getPhase() {
        return phase;
      },
      onRender(nextOptions: InternalLifecycleOptions, nextTarget: any) {
        currentOptions = nextOptions;
        phase = "render";

        // Call render with target if present
        if (hasTarget) {
          (currentOptions.render as any)?.(nextTarget);
        } else {
          (currentOptions.render as VoidFunction)?.();
        }
      },
      onMount(targetForMount: any) {
        // If there's a pending dispose for a DIFFERENT target, run it now (target changed)
        // If it's the SAME target, cancel it (StrictMode remount)
        if (pendingDispose) {
          if (pendingDispose.target === targetForMount) {
            // StrictMode remount: cancel the dispose
            pendingDispose.shouldRun = false;
          } else {
            // Target changed: run dispose for old target synchronously
            if (pendingDispose.shouldRun) {
              try {
                dispose(pendingDispose.target);
                pendingDispose.shouldRun = false; // Prevent double-dispose
              } catch (error) {
                console.error("Error in dispose callback:", error);
              }
            }
          }
          pendingDispose = null;
        }

        // Call init for new target (except first mount, already called in useState)
        if (!isFirstMount && hasTarget) {
          (currentOptions.init as any)?.(targetForMount);
        }
        isFirstMount = false;

        phase = "mount";

        // Call mount with target if present
        if (hasTarget) {
          (currentOptions.mount as any)?.(targetForMount);
        } else {
          (currentOptions.mount as VoidFunction)?.();
        }

        // Return cleanup function that captures THIS target
        const capturedTarget = targetForMount;
        return () => {
          phase = "cleanup";

          // Call cleanup with captured target
          if (hasTarget) {
            (currentOptions.cleanup as any)?.(capturedTarget);
          } else {
            (currentOptions.cleanup as VoidFunction)?.();
          }

          if (currentOptions.dispose) {
            if (isDev()) {
              /**
               * Defer dispose callback to microtask for StrictMode safety
               * Use a flag to track if dispose should run (can be canceled if remounting same target)
               */
              const disposeTask = { target: capturedTarget, shouldRun: true };
              pendingDispose = disposeTask;

              Promise.resolve().then(() => {
                if (disposeTask.shouldRun) {
                  try {
                    dispose(capturedTarget);
                  } catch (error) {
                    console.error("Error in dispose callback:", error);
                  }
                }
                if (pendingDispose === disposeTask) {
                  pendingDispose = null;
                }
              });
            } else {
              // Production: call dispose synchronously
              dispose(capturedTarget);
            }
          }
        };
      },
    };
  });

  // Update options on every render and call render callback
  ref.onRender(options, target);

  // Setup mount/cleanup lifecycle
  // Re-run when target changes (only in object lifecycle mode)
  useLayoutEffect(
    () => {
      return ref.onMount(target);
    },
    hasTarget ? [target] : []
  ); // Re-mount when target changes, or empty deps for component lifecycle

  // Parse update callback and deps
  const updateCallback = Array.isArray(options.update)
    ? options.update[0]
    : options.update;
  const updateDeps = Array.isArray(options.update)
    ? options.update.slice(1)
    : undefined;

  // Call update callback after render (with optional deps)
  useLayoutEffect(() => {
    if (updateCallback) {
      if (hasTarget) {
        (updateCallback as any)(target);
      } else {
        (updateCallback as VoidFunction)();
      }
    }
  }, updateDeps); // No deps = every render, with deps = when deps change

  /**
   * Return getPhase function for dynamic phase inspection
   *
   * This allows calling code to check component state at any time:
   * - Guard async operations (prevent setState after unmount)
   * - Conditional logic based on lifecycle phase
   * - Debugging and logging
   *
   * @returns Function that returns current phase when called
   */
  return ref.getPhase;
}
