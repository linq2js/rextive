import { useMemo, useState, useLayoutEffect } from "react";
import { ExDisposable } from "../types";
import { UseScopeOptions } from "./types";
import { shallowEquals } from "../utils/shallowEquals";
import { tryDispose } from "../disposable";

/**
 * useScope - Create component-scoped services with automatic cleanup
 *
 * Creates signals, services, and other disposables that are automatically cleaned up
 * when the component unmounts. Optionally recreate when dependencies change.
 *
 * **Lifecycle:**
 * 1. Creates scope on mount (or when watch deps change)
 * 2. Calls onUpdate callback when scope or update deps change
 * 3. Calls onDispose callback + disposes scope.dispose on unmount
 *
 * **Disposal (Performance Optimized):**
 * - **Only `scope.dispose` is automatically disposed** - other properties are NOT automatically disposed
 * - This design optimizes performance by avoiding iteration over all scope properties
 * - You must explicitly list what to dispose in the `dispose` property
 * - `dispose` can be:
 *   - A single `VoidFunction` - invoked directly
 *   - A single `Disposable` - calls `dispose()` method
 *   - An array `(VoidFunction | Disposable)[]` - disposes each item in reverse order (LIFO)
 * - Non-disposable properties (helpers, data) can safely coexist in the scope
 *
 * **Watch dependencies:**
 * - `watch`: Controls when scope is recreated (like useEffect deps)
 * - `onUpdate` tuple form: Second element controls when onUpdate runs
 *
 * @param create - Factory function that creates scope (should include `dispose` property for cleanup)
 * @param options - Optional configuration
 * @returns The created scope
 *
 * @example Basic usage - explicit dispose list
 * ```tsx
 * const { count, doubled } = useScope(() => {
 *   const count = signal(0);
 *   const doubled = signal({ count }, ({ deps }) => deps.count * 2);
 *
 *   return {
 *     count,
 *     doubled,
 *     dispose: [count, doubled], // ✅ Must explicitly list disposables
 *   };
 * });
 * ```
 *
 * @example Single disposable
 * ```tsx
 * const { connection } = useScope(() => {
 *   const connection = createWebSocket();
 *
 *   return {
 *     connection,
 *     dispose: connection, // ✅ Single Disposable
 *   };
 * });
 * ```
 *
 * @example Single cleanup function
 * ```tsx
 * const { timer } = useScope(() => {
 *   const intervalId = setInterval(() => {}, 1000);
 *
 *   return {
 *     timer: signal(0),
 *     dispose: () => clearInterval(intervalId), // ✅ Single function
 *   };
 * });
 * ```
 *
 * @example With helper functions (not in dispose list)
 * ```tsx
 * const { count, increment, reset } = useScope(() => {
 *   const count = signal(0);
 *
 *   return {
 *     count,
 *     increment: () => count.set(count() + 1), // ✅ Helper - not disposed
 *     reset: () => count.set(0),                // ✅ Helper - not disposed
 *     dispose: [count], // Only dispose count signal
 *   };
 * });
 * ```
 *
 * @example Service composition pattern
 * ```tsx
 * const createService = () => {
 *   const service1 = createService1();
 *   const service2 = createService2();
 *
 *   return {
 *     // Expose services
 *     service1,
 *     service2,
 *
 *     // Custom methods
 *     doSomething() {
 *       service1.method();
 *       service2.method();
 *     },
 *
 *     // Explicit disposal list
 *     dispose: [service1, service2], // ✅ Or use custom dispose function
 *   };
 * };
 *
 * // Global usage - manual disposal
 * const service = createService();
 * // Later: service.dispose.forEach(d => d.dispose());
 *
 * // Component usage - automatic disposal on unmount
 * const service = useScope(createService);
 * ```
 *
 * @example With watch (recreate on prop change)
 * ```tsx
 * const { userData } = useScope(
 *   () => {
 *     const userData = signal(fetchUser(userId));
 *     return {
 *       userData,
 *       dispose: [userData],
 *     };
 *   },
 *   { watch: [userId] } // Recreate when userId changes
 * );
 * ```
 *
 * @example With onUpdate (sync with props)
 * ```tsx
 * const { timer } = useScope(
 *   () => {
 *     const timer = signal(0);
 *     return { timer, dispose: [timer] };
 *   },
 *   {
 *     onUpdate: [(scope) => {
 *       scope.timer.set(propValue); // Sync with latest prop
 *     }, propValue], // Re-run when propValue changes
 *     watch: [] // Don't recreate scope
 *   }
 * );
 * ```
 *
 * @example With onDispose (custom cleanup)
 * ```tsx
 * const { connection } = useScope(
 *   () => {
 *     const connection = createWebSocket();
 *     return {
 *       connection,
 *       dispose: [connection],
 *     };
 *   },
 *   {
 *     onDispose: (scope) => {
 *       console.log('Closing connection');
 *       scope.connection.close();
 *     }
 *   }
 * );
 * ```
 */
export function useScope<TScope>(
  create: () => ExDisposable & TScope,
  options?: UseScopeOptions<TScope>
): Omit<TScope, "dispose"> {
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
