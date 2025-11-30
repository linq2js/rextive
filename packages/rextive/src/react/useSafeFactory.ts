import { useMemo } from "react";
import { dev } from "../utils/dev";

export interface SafeFactoryController<T> {
  /** The created object */
  result: T;
  /** Mark as committed - prevents auto-disposal */
  commit(): void;
  /**
   * Schedule disposal with caller-provided callback.
   * - Dev mode: defers via microtask (handles StrictMode remount)
   * - Production: executes immediately
   */
  scheduleDispose(callback: () => void): void;
}

/**
 * @internal
 * A hook that safely creates objects with automatic orphan detection.
 * This is an internal utility used by useScope and useRx.
 *
 * This hook handles the React StrictMode double-invoke pattern by:
 * 1. Creating the object via factory
 * 2. Auto-disposing orphaned objects via microtask (only in dev mode)
 * 3. Providing scheduleDispose() for caller-controlled disposal
 *
 * @param factory - Function to create the object
 * @param onOrphanDispose - Called ONLY for orphaned objects (StrictMode double-invoke).
 *                          Use this to completely forget signals from DevTools.
 * @param deps - Dependency array - object is recreated when deps change
 * @returns Controller with result, commit, and scheduleDispose methods
 */
export function useSafeFactory<T>(
  factory: () => T,
  onOrphanDispose: (result: T) => void,
  deps: unknown[]
): SafeFactoryController<T> {
  return useMemo(() => {
    let committed = false;
    let disposed = false;
    const result = factory();

    // Auto-dispose orphaned objects (dev mode only)
    // In StrictMode, useMemo runs twice - the second object gets committed,
    // the first one stays uncommitted and gets disposed by this microtask
    if (dev()) {
      Promise.resolve().then(() => {
        if (!committed && !disposed) {
          disposed = true;
          onOrphanDispose(result);
        }
      });
    }

    return {
      result,
      commit() {
        committed = true;
      },
      scheduleDispose(callback: () => void) {
        if (disposed) return;

        // Reset committed state for StrictMode remount detection
        committed = false;

        const doDispose = () => {
          if (!committed && !disposed) {
            disposed = true;
            callback();
          }
        };

        if (dev()) {
          // Dev mode: defer to allow StrictMode remount to re-commit
          Promise.resolve().then(doDispose);
        } else {
          // Production: dispose immediately
          doDispose();
        }
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
