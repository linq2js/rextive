import {
  memo,
  ReactNode,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { signalDispatcher, signalToken } from "./signalDispatcher";
import { emitter } from "./emitter";
import { useRerender } from "./useRerender";
import { withDispatchers } from "./dispatcher";

/**
 * Checks if two Sets are different by comparing their sizes and contents.
 * Two sets are considered different if they have different sizes or contain different items.
 *
 * @param a - First set to compare
 * @param b - Second set to compare
 * @returns True if the sets are different, false if they are the same
 */
function isDiff<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) {
    return true;
  }
  for (const item of a) {
    if (!b.has(item)) {
      return true;
    }
  }
  for (const item of b) {
    if (!a.has(item)) {
      return true;
    }
  }
  return false;
}

/**
 * Reactive component that automatically re-renders when its signal dependencies change.
 *
 * This component:
 * - Executes the expression function and tracks which signals are accessed
 * - Subscribes to all accessed signals
 * - Re-renders automatically when any tracked signal changes
 * - Updates subscriptions when signal dependencies change
 * - Handles errors gracefully by re-throwing them for ErrorBoundary to catch
 *
 * The component is memoized to prevent unnecessary re-renders when props don't change.
 */
export const Reactive = memo(function Reactive(props: { exp: () => unknown }) {
  // Signal dispatcher is stable across renders - created once and reused
  const [dispatcher] = useState(signalDispatcher);
  // Token ref used to trigger effect re-run when signal dependencies change
  // Changing the object reference causes useLayoutEffect to re-run
  const recomputeTokenRef = useRef({});
  // State used to trigger re-renders and track errors
  const rerender = useRerender<{
    error?: unknown;
  }>({ debounce: 0 });

  // Re-throw errors so ErrorBoundary can catch them
  if (rerender.data?.error) {
    throw rerender.data.error;
  }

  /**
   * Subscribes to signal changes and sets up cleanup.
   * This effect:
   * 1. Creates an emitter to manage cleanup functions
   * 2. Subscribes to all currently tracked signals
   * 3. When any signal changes, triggers a re-render via rerender()
   * 4. Cleans up subscriptions when dependencies change or component unmounts
   *
   * Re-runs when:
   * - dispatcher changes (shouldn't happen)
   * - recomputeTokenRef.current changes (when signal dependencies change)
   */
  useLayoutEffect(() => {
    const onCleanup = emitter();
    const recompute = () => {
      rerender({});
    };
    try {
      // Subscribe to all signals that were accessed during expression evaluation
      for (const signal of dispatcher.signals) {
        onCleanup.add(signal.on(recompute));
      }
    } catch (ex) {
      // If subscription fails, clean up and set error state
      // Errors should be handled immediately, not debounced
      onCleanup.emit(undefined);
      rerender.immediate({ error: ex });
      return;
    }

    // Cleanup function: unsubscribe from all signals when effect re-runs or component unmounts
    return () => {
      // Cancel any pending debounced rerender to prevent updates after unmount
      rerender.cancel();
      onCleanup.emit(undefined);
    };
  }, [dispatcher, recomputeTokenRef.current, rerender]);

  /**
   * Computes the expression result and tracks signal dependencies.
   * This runs during render and:
   * 1. Saves the previous set of signals
   * 2. Clears the dispatcher to track new signals
   * 3. Executes the expression (which may access signals)
   * 4. Compares old and new signal sets
   * 5. Updates recomputeTokenRef if signals changed (to trigger effect re-run)
   *
   * The result is memoized based on dispatcher, props.exp, and version
   * to avoid unnecessary recomputations.
   */
  const result = useMemo(() => {
    const prevSignals = new Set(dispatcher.signals);
    dispatcher.clear();

    try {
      return withDispatchers([signalToken(dispatcher)], props.exp);
    } finally {
      const nextSignals = new Set(dispatcher.signals);

      // Update subscriptions if signal dependencies changed
      // Changing the ref object triggers useLayoutEffect to re-run
      if (isDiff(prevSignals, nextSignals)) {
        recomputeTokenRef.current = {};
      }
    }
  }, [dispatcher, props.exp, rerender.data]);

  // Return the computed result, or null if result is null/undefined
  // Functions are not valid React children, so convert them to null
  // This prevents React warnings about invalid children
  if (typeof result === "function") {
    return null;
  }
  // Cast to ReactNode to satisfy TypeScript
  return (result ?? null) as unknown as ReactNode;
});

/**
 * Creates a reactive expression that automatically updates when its signal dependencies change.
 *
 * This is a convenience function that wraps the Reactive component.
 * Use it in JSX to create reactive expressions that re-render when signals change.
 *
 * @param exp - Expression function that may access signals. The result will be rendered.
 * @returns A ReactNode that renders the expression result and updates reactively
 *
 * @example
 * ```tsx
 * const count = signal(0);
 *
 * // Reactive expression that updates when count changes
 * <div>
 *   {rx(() => `Count: ${count()}`)}
 * </div>
 *
 * count.set(5); // Component automatically updates to show "Count: 5"
 * ```
 */
export function rx(exp: () => unknown): ReactNode {
  return <Reactive exp={exp} />;
}
