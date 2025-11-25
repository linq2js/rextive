import { useMemo } from "react";
import { ExDisposable, Signal } from "../types";
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
 *   update: () => console.log('After every render'), // Runs after each render
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
 *
 * @example Factory mode with update callback (sync after render)
 * ```tsx
 * const { size, updateSize } = useScope(() => {
 *   const size = signal({ width: 0, height: 0 });
 *   const ref = createRef();
 *
 *   return { size, ref };
 * }, {
 *   // Update runs after every render - measure DOM and sync to signal
 *   update: (scope) => {
 *     if (scope.ref.current) {
 *       const { width, height } = scope.ref.current.getBoundingClientRect();
 *       scope.size.set({ width, height });
 *     }
 *   },
 *   // Or with deps - only run when userId changes
 *   // update: [(scope) => scope.refetch(), userId],
 * });
 * ```
 *
 * @example Factory mode with args (args become watch dependencies)
 * ```tsx
 * // ✅ Type-safe: args match factory params, auto-recreates when args change
 * const { userData } = useScope(
 *   (userId, filter) => {
 *     const userData = signal(fetchUser(userId, filter));
 *     return { userData };
 *   },
 *   [userId, filter] // Args passed to factory & used as watch deps
 * );
 *
 * // Compare to manual watch (less type-safe):
 * const { userData } = useScope(
 *   () => {
 *     const userData = signal(fetchUser(userId, filter));
 *     return { userData };
 *   },
 *   { watch: [userId, filter] } // Easy to forget to update
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
): TScope extends Signal<any> ? TScope : Omit<TScope, "dispose">;

// Overload 4: Factory mode with args (args become watch dependencies)
export function useScope<TScope, TArgs extends any[]>(
  create: (...args: TArgs) => ExDisposable & TScope,
  args: TArgs,
  options?: Omit<UseScopeOptions<TScope>, "watch">
): TScope extends Signal<any> ? TScope : Omit<TScope, "dispose">;

// Implementation
export function useScope<TScope>(
  createOrCallbacks: (() => ExDisposable & TScope) | LifecycleCallbacks<any>,
  argsOrOptions?: any[] | UseScopeOptions<TScope>,
  optionsIfArgs?: Omit<UseScopeOptions<TScope>, "watch">
): Omit<TScope, "dispose"> | (() => LifecyclePhase) {
  // Detect which mode based on first argument
  const isLifecycleMode = typeof createOrCallbacks !== "function";

  if (isLifecycleMode) {
    // Mode 1 or 2: Lifecycle mode (component or object)
    // Need to check if it's object lifecycle (has 'for' property) or component lifecycle
    return useLifecycle(createOrCallbacks as LifecycleCallbacks<any>);
  }

  // Mode 3 or 4: Factory mode
  // Detect if second arg is args array or options object
  const isArgsMode = Array.isArray(argsOrOptions);

  const create = createOrCallbacks as (...args: any[]) => ExDisposable & TScope;
  const args = isArgsMode ? argsOrOptions : undefined;
  const options = isArgsMode
    ? optionsIfArgs
    : (argsOrOptions as UseScopeOptions<TScope> | undefined);

  const {
    watch = undefined,
    init,
    mount,
    render,
    update,
    cleanup,
    dispose: disposeCallback,
  } = (options || {}) as UseScopeOptions<TScope>;

  // Recreate scope when watch dependencies change
  // In args mode, args become the watch dependencies
  const watchDeps = isArgsMode ? args || [] : watch || [];

  const scope = useMemo(() => {
    const newScope = isArgsMode ? create(...(args || [])) : create();

    // Call init after scope is created (once per scope instance)
    init?.(newScope);

    return newScope;
  }, watchDeps);

  // Use useLifecycle to manage scope object lifecycle (StrictMode-safe)
  useLifecycle({
    for: scope, // Track this scope object
    // Note: init already called in useMemo above, so we skip it here
    mount,
    render,
    update,
    cleanup,
    dispose: (s) => {
      // Call user's dispose callback
      disposeCallback?.(s);
      // Dispose scope resources
      tryDispose(s);
    },
  });

  // we return fully scoped object, Typescript will omit the dispose property
  // why? if users create a scope with some methods and its methods are not binded to the scope, Invoking those methods will throw an error
  return scope;
}
