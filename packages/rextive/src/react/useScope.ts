import { useMemo, useState, useLayoutEffect } from "react";
import { ExDisposable } from "../types";
import { UseScopeOptions } from "./types";
import { shallowEquals } from "../utils/shallowEquals";
import { tryDispose } from "../disposable";
import {
  useLifecycle,
  ComponentLifecycleCallbacks,
  ObjectLifecycleCallbacks,
  LifecyclePhase,
} from "./useLifecycle";

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
  callbacks: ComponentLifecycleCallbacks
): () => LifecyclePhase;

// Overload 2: Object lifecycle (with target object)
export function useScope<TTarget>(
  callbacks: ObjectLifecycleCallbacks<TTarget>
): () => LifecyclePhase;

// Overload 3: Factory mode (create scoped services)
export function useScope<TScope>(
  create: () => ExDisposable & TScope,
  options?: UseScopeOptions<TScope>
): Omit<TScope, "dispose">;

// Implementation
export function useScope<TScope>(
  createOrCallbacks:
    | (() => ExDisposable & TScope)
    | ComponentLifecycleCallbacks
    | ObjectLifecycleCallbacks<any>,
  options?: UseScopeOptions<TScope>
): Omit<TScope, "dispose"> | (() => LifecyclePhase) {
  // Detect which mode based on first argument
  const isLifecycleMode = typeof createOrCallbacks !== "function";

  if (isLifecycleMode) {
    // Mode 1 or 2: Lifecycle mode (component or object)
    // Need to check if it's object lifecycle (has 'for' property) or component lifecycle
    if ("for" in createOrCallbacks) {
      // Object lifecycle mode
      return useLifecycle(createOrCallbacks as ObjectLifecycleCallbacks<any>);
    } else {
      // Component lifecycle mode
      return useLifecycle(createOrCallbacks as ComponentLifecycleCallbacks);
    }
  }

  // Mode 3: Factory mode - create scoped services
  const create = createOrCallbacks as () => ExDisposable & TScope;
  const { watch, onUpdate, onDispose } = options || {};

  // Persistent ref object that survives re-renders
  // Stores options in a stable reference to avoid dependency array issues
  // This pattern allows us to update options without recreating the ref
  const [ref] = useState(() => {
    return {
      watch, // Dependencies that trigger scope recreation
      onUpdate: undefined as ((scope: TScope) => void) | undefined, // Update callback
      onUpdateDeps: [] as unknown[], // Dependencies for onUpdate callback
      onDispose: undefined as ((scope: TScope) => void) | undefined, // Dispose callback
    };
  });

  const onUpdateDeps = Array.isArray(onUpdate) ? onUpdate.slice(1) : [];
  // Update ref with latest options on each render
  // This allows options to change without recreating the ref
  Object.assign(ref, {
    watch,
    // Handle onUpdate in two forms:
    // 1. Function: onUpdate = (scope) => { ... }
    // 2. Tuple: onUpdate = [(scope) => { ... }, dep1, dep2, ...]
    onUpdate: typeof onUpdate === "function" ? onUpdate : onUpdate?.[0],
    // Extract watch dependencies from tuple form (everything after first element)
    // Maintain reference stability: reuse same array if shallowly equal
    // This ensures React's dependency comparison (Object.is) works correctly
    // Same reference = no re-render, different reference = re-render
    onUpdateDeps: shallowEquals(ref.onUpdateDeps, onUpdateDeps)
      ? ref.onUpdateDeps // Reuse same array reference if values are equal
      : onUpdateDeps, // Use new array if values differ
    onDispose,
  });

  // Recreate scope when watch dependencies change
  // Similar to useEffect dependency array - scope is recreated when deps change
  // Empty array (or undefined) means scope is created once and never recreated
  const scope = useMemo(create, ref.watch || []);

  // Cleanup effect: dispose all disposables when scope changes or component unmounts
  // Runs synchronously after render (useLayoutEffect) to ensure cleanup happens before next render
  useLayoutEffect(() => {
    return () => {
      // Call custom dispose callback first (if provided)
      // This allows user to do custom cleanup before automatic disposal
      ref.onDispose?.(scope);

      tryDispose(scope);
    };
  }, [scope]); // Re-run cleanup when scope reference changes

  // Update effect: call onUpdate callback when scope or update dependencies change
  // Using useLayoutEffect (not useMemo) because this is a side effect, not memoization
  // Runs synchronously after render to ensure updates happen before paint
  useLayoutEffect(() => {
    ref.onUpdate?.(scope);
    // if onUpdateDeps is empty, use an empty object to trigger re-render
  }, [!ref.onUpdateDeps?.length ? {} : ref.onUpdateDeps, scope]);

  return scope;
}
