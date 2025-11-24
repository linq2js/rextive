import { useMemo, useLayoutEffect, useRef } from "react";
import { ExDisposable } from "../types";
import { tryDispose } from "../disposable";
import {
  useLifecycle,
  LifecycleCallbacks,
  LifecyclePhase,
} from "./useLifecycle";

/**
 * Options for useScope hook (factory mode only)
 */
export type UseScopeOptions<TScope = any> = LifecycleCallbacks<TScope> & {
  /**
   * Watch these values - recreates scope when they change
   * Similar to React useEffect deps array
   *
   * @example
   * ```tsx
   * useScope(() => ({ timer: signal(0) }), {
   *   watch: [userId] // Recreate when userId changes
   * })
   * ```
   */
  watch?: unknown[];
};

/**
 * useScope - Unified hook for lifecycle management and scoped services
 *
 * **Three modes:**
 *
 * 1. **Component lifecycle**: Manage component lifecycle phases
 * 2. **Object lifecycle**: Track an object's lifecycle (recreate when object changes)
 * 3. **Factory mode**: Create scoped services with automatic cleanup
 *
 * @example Mode 1: Component lifecycle
 * ```tsx
 * const getPhase = useScope({
 *   init: () => console.log('Component initializing'),
 *   mount: () => console.log('Component mounted'),
 *   render: () => console.log('Component rendering'),
 *   cleanup: () => console.log('Component cleaning up'),
 *   dispose: () => console.log('Component disposed'),
 * });
 *
 * console.log(getPhase()); // "render" | "mount" | "cleanup" | "disposed"
 * ```
 *
 * @example Mode 2: Object lifecycle
 * ```tsx
 * const user = { id: 1, name: 'John' };
 *
 * const getPhase = useScope({
 *   for: user, // Track this object
 *   init: (user) => console.log('User activated:', user),
 *   mount: (user) => startTracking(user),
 *   cleanup: (user) => pauseTracking(user),
 *   dispose: (user) => analytics.track('user-session-end', user),
 * });
 *
 * // When user reference changes, old user is disposed and new user is initialized
 * ```
 *
 * @example Mode 3: Factory mode - Create scoped services
 * ```tsx
 * const { count, doubled } = useScope(() => {
 *   const count = signal(0);
 *   const doubled = signal({ count }, ({ deps }) => deps.count * 2);
 *
 *   return {
 *     count,
 *     doubled,
 *     dispose: [count, doubled], // Explicit dispose list
 *   };
 * });
 * ```
 *
 * @example Factory mode with watch (recreate on prop change)
 * ```tsx
 * const { userData } = useScope(
 *   () => {
 *     const userData = signal(fetchUser(userId));
 *     return { userData, dispose: [userData] };
 *   },
 *   { watch: [userId] } // Recreate when userId changes
 * );
 * ```
 */

// Overload 1: Component lifecycle (no target object)
export function useScope(
  options: LifecycleCallbacks<void>
): () => LifecyclePhase;

// Overload 2: Object lifecycle (with target object)
export function useScope<TTarget>(
  options: { for: TTarget } & LifecycleCallbacks<TTarget>
): () => LifecyclePhase;

// Overload 3: Factory mode (create scoped services)
export function useScope<TScope>(
  create: () => ExDisposable & TScope,
  options?: UseScopeOptions<TScope>
): Omit<TScope, "dispose">;

// Implementation
export function useScope<TScope>(
  createOrCallbacks: (() => ExDisposable & TScope) | LifecycleCallbacks<any>,
  options?: UseScopeOptions<TScope>
): Omit<TScope, "dispose"> | (() => LifecyclePhase) {
  // Detect which mode based on first argument
  const isLifecycleMode = typeof createOrCallbacks !== "function";

  if (isLifecycleMode) {
    // Mode 1 or 2: Lifecycle mode (component or object)
    // Need to check if it's object lifecycle (has 'for' property) or component lifecycle
    return useLifecycle(createOrCallbacks as LifecycleCallbacks<any>);
  }

  // Mode 3: Factory mode - create scoped services with lifecycle
  const create = createOrCallbacks as () => ExDisposable & TScope;
  const {
    watch,
    init,
    mount,
    render,
    cleanup,
    dispose: disposeCallback,
  } = options || {};

  const scopeRef = useRef<TScope | null>(null);

  // Recreate scope when watch dependencies change
  const scope = useMemo(() => {
    const newScope = create();
    scopeRef.current = newScope;

    // Call init after scope is created (once per scope instance)
    init?.(newScope);

    return newScope;
  }, watch || []);

  // Update scopeRef on every render to ensure callbacks have latest scope
  scopeRef.current = scope;

  // Call render callback on every render
  render?.(scope);

  // Setup mount/cleanup/dispose lifecycle for the scope
  useLayoutEffect(() => {
    // Call mount when scope is mounted
    mount?.(scopeRef.current!);

    return () => {
      // Call cleanup before scope changes or component unmounts
      cleanup?.(scopeRef.current!);

      // Call dispose and tryDispose for cleanup
      disposeCallback?.(scopeRef.current!);
      tryDispose(scopeRef.current!);
    };
  }, [scope]); // Re-run when scope instance changes

  // Return scope without the 'dispose' property
  const { dispose: _dispose, ...scopeWithoutDispose } = scope as TScope & {
    dispose?: any;
  };
  return scopeWithoutDispose as Omit<TScope, "dispose">;
}
