import { useLayoutEffect, useState, useRef } from "react";
import { Hooks, withHooks } from "../hooks";
import { AnySignal, Task } from "../types";
import { emitter } from "../utils/emitter";
import { useSafeFactory } from "./useSafeFactory";

/**
 * Internal controller for tracking signals accessed within useRx.
 *
 * Implements Hooks interface to integrate with the signal system's
 * automatic tracking mechanism. When signals are read via get(), they
 * call getHooks().onSignalAccess() which adds them to this controller.
 *
 * **Important**: Methods are defined as arrow function class properties
 * (not prototype methods) to ensure they work correctly when spread by
 * `withHooks`. Prototype methods are NOT copied during object spread.
 */
class RxController implements Pick<Hooks, "onSignalAccess" | "onTaskAccess"> {
  /** Set of signals accessed during the current render */
  signals = new Set<AnySignal<any>>();

  /** Rerender function to trigger component updates */
  rerender: VoidFunction;

  constructor(rerender: VoidFunction) {
    this.rerender = rerender;
  }

  /**
   * Track a signal for subscription.
   * Called automatically by signals when read via get() during withHooks context.
   */
  onSignalAccess = (signal: AnySignal<any>) => {
    this.signals.add(signal);
  };

  /**
   * Track a task and trigger rerender when it resolves/rejects.
   * Used for async signals to re-render when the promise settles.
   */
  onTaskAccess = (task: Task<any>) => {
    if (task.status === "loading") {
      task.promise.then(
        () => this.rerender(),
        () => this.rerender()
      );
    }
  };
}

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
  const rerenderRef = useRef(() => setRerenderState({}));
  rerenderRef.current = () => setRerenderState({});

  // Use useSafeFactory for StrictMode-safe controller creation
  const factory = useSafeFactory(
    () => new RxController(rerenderRef.current),
    () => {
      // No cleanup needed for orphaned RxController
    },
    [] // Empty deps - controller persists for component lifetime
  );

  const controller = factory.result;

  // Update rerender function reference (in case it changed)
  controller.rerender = rerenderRef.current;

  // Clear tracked signals at start of each render
  // This ensures we only subscribe to signals accessed in THIS render
  controller.signals.clear();

  // Set up subscriptions AFTER render completes
  // useLayoutEffect runs synchronously after DOM mutations but before paint
  useLayoutEffect(() => {
    factory.commit();

    // Create cleanup emitter to collect unsubscribe functions
    const onCleanup = emitter();

    // Subscribe to each tracked signal
    // signal.on(rerender) returns an unsubscribe function
    // onCleanup.on() stores it for cleanup
    for (const signal of controller.signals) {
      onCleanup.on(signal.on(controller.rerender));
    }

    // Cleanup: unsubscribe from all signals when component unmounts
    // or when the effect re-runs (on each render)
    return () => {
      onCleanup.emitAndClear();
      factory.scheduleDispose();
    };
  });

  // Run fn within hooks context
  // Any signal.get() calls will trigger controller.onSignalAccess()
  return withHooks(controller, fn);
}
