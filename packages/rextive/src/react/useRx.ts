import { useEffect, useState } from "react";
import { withHooks } from "../hooks";
import { AnySignal } from "../types";
import { emitter } from "../utils/emitter";
import { useScope } from "./useScope";

/**
 * Hook for reactive rendering with automatic signal tracking.
 *
 * `useRx` runs a function within a reactive context, automatically tracking
 * any signals that are accessed during execution. When those signals change,
 * the component re-renders.
 *
 * ## How it works
 *
 * 1. During render, the provided function `fn` runs within a dispatcher context
 * 2. Any signals accessed via `signal()` or `signal.get()` are automatically tracked
 * 3. After render, subscriptions are set up for all tracked signals
 * 4. When any tracked signal changes, the component re-renders
 * 5. On each render, tracking resets and signals are re-tracked
 *
 * ## Key characteristics
 *
 * - **Lazy tracking**: Only subscribes to signals actually accessed during render
 * - **Automatic cleanup**: Subscriptions are cleaned up on unmount
 * - **Re-tracks on each render**: Supports conditional signal access
 * - **Handles tasks**: Async signals trigger re-render when they resolve
 * - **⭐ Auto-dispose**: Signals created inside `fn` are automatically disposed on unmount
 *
 * @param fn - Function that accesses signals and returns a value
 * @returns The return value of `fn`
 *
 * @example Basic usage
 * ```tsx
 * const count = signal(0);
 *
 * function Counter() {
 *   const value = useRx(() => count());
 *   return <div>{value}</div>;
 * }
 * ```
 *
 * @example Multiple signals
 * ```tsx
 * const firstName = signal("John");
 * const lastName = signal("Doe");
 *
 * function FullName() {
 *   const full = useRx(() => `${firstName()} ${lastName()}`);
 *   return <span>{full}</span>;
 * }
 * ```
 *
 * @example Conditional signal access
 * ```tsx
 * const showDetails = signal(false);
 * const details = signal({ bio: "...", stats: {...} });
 *
 * function Profile() {
 *   const content = useRx(() => {
 *     if (!showDetails()) return "Click to show details";
 *     return details().bio; // Only subscribes to details when showDetails is true
 *   });
 *   return <div>{content}</div>;
 * }
 * ```
 */
export function useRx<T>(fn: () => T): T {
  // Rerender trigger - use useState for forcing re-renders
  const [, setRerenderState] = useState({});
  const scope = useScope(fn, () => {
    const singals = new Set<AnySignal<any>>();
    return {
      singals,
      dispose() {
        singals.clear();
      },
      compute() {
        return withHooks(
          {
            onSignalAccess(signal) {
              singals.add(signal);
            },
          },
          fn
        );
      },
    };
  });

  useEffect(() => {
    if (scope.singals.size === 0) return;

    const onCleanup = emitter();
    for (const signal of scope.singals) {
      onCleanup.on(
        signal.on(() => {
          setRerenderState({
            signalId: signal.uid,
            signalName: signal.displayName,
          });
        })
      );
    }
    return () => {
      onCleanup.emitAndClear();
    };
  });

  return scope.compute();
}
