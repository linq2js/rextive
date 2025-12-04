import { useLayoutEffect, useRef } from "react";

import {
  useLifecycle,
  LifecycleCallbacks,
  LifecyclePhase,
} from "./useLifecycle";
import { useSafeFactory } from "./useSafeFactory";

/**
 * Options for useScope hook (factory mode only)
 */
export type UseScopeOptions<TScope = any> = {
  /**
   * Called when scope is created (before first render commit)
   */
  init?: (scope: TScope) => void;
  /**
   * Called after scope is mounted/ready (after first commit)
   * Alias: `ready`
   */
  mount?: (scope: TScope) => void;
  /**
   * Alias for `mount` - called after scope is mounted/ready
   */
  ready?: (scope: TScope) => void;
  /**
   * Called after render (after DOM updates) - use to update/sync scope state
   * - Simple form: `(scope) => void` - runs after every render
   * - With deps: `[(scope) => void, dep1, dep2]` - runs when deps change
   */
  update?: ((scope: TScope) => void) | [(scope: TScope) => void, ...any[]];
  /**
   * Called during cleanup phase (before dispose)
   */
  cleanup?: (scope: TScope) => void;
  /**
   * Called when scope is being disposed
   */
  dispose?: (scope: TScope) => void;
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
 * ## ⭐ Auto-Dispose Feature
 *
 * **Signals created inside the factory are automatically disposed** when:
 * - The component unmounts
 * - The watch dependencies change (scope recreated)
 * - React StrictMode double-invokes (orphan signals cleaned up)
 *
 * This means you don't need to use `disposable()` wrapper for basic signal cleanup!
 *
 * @example Mode 1: Component lifecycle
 * ```tsx
 * const getPhase = useScope({
 *   init: () => console.log('Component initializing'),
 *   mount: () => console.log('Component mounted'),
 *   render: () => console.log('Component rendering'),
 *   update: () => console.log('After every render'),
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
 * @example Mode 3: Factory mode - Signals auto-dispose on unmount
 * ```tsx
 * // ✅ Signals are auto-disposed - no wrapper needed!
 * const { count, doubled } = useScope(() => {
 *   const count = signal(0);
 *   const doubled = signal({ count }, ({ deps }) => deps.count * 2);
 *   return { count, doubled };
 * });
 * ```
 *
 * @example Factory mode with additional cleanup
 * ```tsx
 * // Simple case - just add dispose() method
 * const { count } = useScope(() => {
 *   const count = signal(0);
 *   const subscription = someService.subscribe();
 *
 *   return {
 *     count,
 *     dispose: () => subscription.unsubscribe(),
 *   };
 * });
 *
 * // Multiple cleanup logic - use disposable() to combine them
 * const { count } = useScope(() => {
 *   const count = signal(0);
 *   const sub1 = service1.subscribe();
 *   const sub2 = service2.subscribe();
 *
 *   return disposable({
 *     count,
 *     dispose: [sub1, sub2, () => clearInterval(timer)],
 *   });
 * });
 * ```
 *
 * @example Factory mode with lifecycle callbacks
 * ```tsx
 * const { size, ref } = useScope(
 *   () => {
 *     const size = signal({ width: 0, height: 0 });
 *     const ref = createRef<HTMLDivElement>();
 *     return { size, ref };
 *   },
 *   {
 *     ready: (scope) => console.log('Scope is ready'),
 *     update: (scope) => {
 *       // Sync DOM measurements after each render
 *       if (scope.ref.current) {
 *         const rect = scope.ref.current.getBoundingClientRect();
 *         scope.size.set({ width: rect.width, height: rect.height });
 *       }
 *     },
 *     // Or with deps - only run when specific values change
 *     // update: [(scope) => scope.refetch(), userId],
 *   }
 * );
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
// TScope is returned as-is. Disposal handles: signals created inside factory + scope's dispose method
export function useScope<TScope extends Record<string, any>>(
  create: () => TScope,
  options?: UseScopeOptions<TScope>
): TScope;

// Overload 4: Factory mode with args (args become watch dependencies)
export function useScope<
  TScope extends Record<string, any>,
  TArgs extends any[]
>(
  create: (...args: TArgs) => TScope,
  args: TArgs,
  options?: Omit<UseScopeOptions<TScope>, "watch">
): TScope;

// Implementation
export function useScope<TScope extends Record<string, any>>(
  createOrCallbacks: (() => TScope) | LifecycleCallbacks<any>,
  argsOrOptions?: any[] | UseScopeOptions<TScope>,
  optionsIfArgs?: Omit<UseScopeOptions<TScope>, "watch">
): TScope | (() => LifecyclePhase) {
  // Detect which mode based on first argument
  const isLifecycleMode = typeof createOrCallbacks !== "function";

  if (isLifecycleMode) {
    // Mode 1 or 2: Lifecycle mode (component or object)
    return useLifecycle(createOrCallbacks as LifecycleCallbacks<any>);
  }

  // Mode 3 or 4: Factory mode
  // Detect if second arg is args array or options object
  const isArgsMode = Array.isArray(argsOrOptions);

  const create = createOrCallbacks as (...args: any[]) => TScope;
  const args = isArgsMode ? argsOrOptions : undefined;
  const options = isArgsMode
    ? optionsIfArgs
    : (argsOrOptions as UseScopeOptions<TScope> | undefined);

  const { init, update } = options || {};
  const watch = (options as UseScopeOptions<TScope>)?.watch;

  // Parse update callback and deps
  const updateCallback = Array.isArray(update) ? update[0] : update;
  const updateDeps = Array.isArray(update) ? update.slice(1) : undefined;

  // Recreate scope when watch dependencies change
  // In args mode, args become the watch dependencies
  const watchDeps = isArgsMode ? args || [] : watch || [];

  // Keep options ref for callbacks (they may change between renders)
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Use useSafeFactory for StrictMode-safe scope creation
  // Orphan disposal and DevTools cleanup is handled internally
  const controller = useSafeFactory(() => {
    const scope = isArgsMode ? create(...(args || [])) : create();

    init?.(scope);
    return scope as TScope;
  }, watchDeps);

  const { result: scope } = controller;

  // Commit on mount, schedule dispose on cleanup
  useLayoutEffect(() => {
    controller.commit();

    // Call mount/ready callback after commit
    const opts = optionsRef.current;
    (opts?.mount || opts?.ready)?.(scope);

    return () => {
      // Call cleanup callback
      optionsRef.current?.cleanup?.(scope);
      // Call user's dispose callback
      optionsRef.current?.dispose?.(scope);
      // Schedule scope disposal (normal disposal - keeps signals in DevTools as "disposed")
      controller.scheduleDispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller]);

  // Call update callback after render (with optional deps)
  useLayoutEffect(() => {
    updateCallback?.(scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, updateDeps);

  return scope;
}
