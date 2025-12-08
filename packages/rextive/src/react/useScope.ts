import { useLayoutEffect, useEffect, useRef } from "react";
import { AnyFunc, EqualsFn, EqualsStrategy } from "../types";
import { resolveEquals } from "../utils/resolveEquals";
import { scopeCache } from "./scopeCache";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// ============================================================================
// Types
// ============================================================================

/**
 * Options for useScope hook
 */
export type UseScopeOptions = {
  /**
   * Custom equality function for comparing args.
   * Default: Object.is (strict reference equality)
   *
   * @example
   * ```tsx
   * // Deep compare objects
   * useScope("data", factory, [filters], {
   *   equals: (a, b) => JSON.stringify(a) === JSON.stringify(b)
   * });
   * ```
   */
  equals?: EqualsStrategy | EqualsFn<any>;
};

/**
 * Options can be:
 * - UseScopeOptions object with equals property
 * - EqualsStrategy string ("strict" | "shallow" | "deep")
 * - EqualsFn custom function
 */
type OptionsOrEquals = UseScopeOptions | EqualsStrategy | EqualsFn<any>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse options argument into an equals function.
 */
function parseEquals(options: OptionsOrEquals | undefined): EqualsFn<any> {
  if (options === undefined) {
    return Object.is;
  }

  // String strategy: "strict" | "shallow" | "deep"
  if (typeof options === "string") {
    return resolveEquals(options) ?? Object.is;
  }

  // Custom function
  if (typeof options === "function") {
    return options;
  }

  // Options object with equals property
  if (typeof options === "object" && "equals" in options) {
    return parseEquals(options.equals);
  }

  return Object.is;
}

/**
 * @internal - Exposed for testing
 */
export function __clearCache() {
  scopeCache.clear();
}

// ============================================================================
// useScope Hook
// ============================================================================

/**
 * useScope - Create a cached scope with automatic lifecycle management.
 *
 * Provides two modes for different use cases:
 *
 * ## 🔒 Local Mode (Recommended for most cases)
 *
 * Each component instance gets its **own private scope**.
 * Use when state belongs exclusively to a single component.
 *
 * ```tsx
 * useScope(factory)              // No deps
 * useScope(factory, [deps])      // With deps (passed to factory)
 * useScope(factory, [deps], options)
 * ```
 *
 * ## 🔗 Shared Mode
 *
 * Multiple components **share the same scope** via a key.
 * Use when multiple components need to access the same state.
 *
 * ```tsx
 * useScope(key, factory)              // No deps
 * useScope(key, factory, [deps])      // With deps
 * useScope(key, factory, [deps], options)
 * ```
 *
 * ## Key Features
 *
 * - **Auto-dispose**: Signals are automatically disposed on unmount
 * - **Deps comparison**: Recreates scope when deps change
 * - **Stable functions**: Functions/Dates in deps are auto-stabilized
 * - **StrictMode safe**: Handles React double-invoke correctly
 * - **Logic support**: Works with `logic()` factories
 *
 * ## ⭐ Auto-Dispose
 *
 * Signals created inside the factory are automatically disposed when:
 * - The component unmounts
 * - The deps change (scope recreated)
 * - React StrictMode double-invokes (orphan signals cleaned up)
 *
 * ---
 *
 * @example Local mode - Basic (most common)
 * ```tsx
 * function SearchBar() {
 *   const { input, results } = useScope(() => ({
 *     input: signal(""),
 *     results: signal([]),
 *   }));
 *
 *   return <input value={rx(input)} />;
 * }
 * ```
 *
 * @example Local mode - With deps
 * ```tsx
 * function UserProfile({ userId }: { userId: string }) {
 *   // Recreates scope when userId changes
 *   const { user } = useScope((id) => ({
 *     user: signal(async () => fetchUser(id)),
 *   }), [userId]);
 *
 *   return <div>{rx(user, u => u?.name)}</div>;
 * }
 * ```
 *
 * @example Local mode - With Logic
 * ```tsx
 * function Counter() {
 *   const { count, increment } = useScope(counterLogic);
 *   return <button onClick={increment}>{rx(count)}</button>;
 * }
 * ```
 *
 * @example Shared mode - Multiple components share state
 * ```tsx
 * // Both SearchBar instances share the same scope
 * function Header() {
 *   return (
 *     <>
 *       <SearchBar />  {/* Uses shared scope **}
 *       <MobileSearchBar />  {/* Same scope! **}
 *     </>
 *   );
 * }
 *
 * function SearchBar() {
 *   const { input } = useScope("searchBar", searchBarLogic);
 *   return <input value={rx(input)} />;
 * }
 *
 * function MobileSearchBar() {
 *   const { input } = useScope("searchBar", searchBarLogic);
 *   return <input value={rx(input)} />;  // Same state as SearchBar
 * }
 * ```
 *
 * @example Shared mode - Dynamic keys for multiple instances
 * ```tsx
 * function Tab({ tabId }: { tabId: string }) {
 *   // Each unique tabId gets its own scope
 *   const scope = useScope(`tab:${tabId}`, () => ({
 *     content: signal(""),
 *   }));
 *
 *   return <div>{rx(scope.content)}</div>;
 * }
 * ```
 *
 * @example Deps with custom equality
 * ```tsx
 * // Using equality strategy string
 * useScope((filters) => ({ ... }), [filters], "shallow");
 *
 * // Using custom function
 * useScope((obj) => ({ ... }), [obj], (a, b) => a.id === b.id);
 * ```
 */

// ============================================================================
// Local Mode Overloads (private per-component scope)
// ============================================================================

/**
 * **Local Mode** - Each component instance gets its own private scope.
 *
 * @param factory - Factory function to create the scope
 * @param deps - Optional dependencies passed to factory (scope recreates when deps change)
 * @param options - Optional equality strategy for deps comparison
 *
 * @example
 * ```tsx
 * // Basic - no deps
 * const { count } = useScope(() => ({ count: signal(0) }));
 *
 * // With deps - passed to factory
 * const { user } = useScope((id) => ({
 *   user: signal(async () => fetchUser(id))
 * }), [userId]);
 * ```
 */
export function useScope<TScope, TArgs extends any[]>(
  factory: (...deps: TArgs) => TScope,
  ...extra: [] extends TArgs
    ? [deps?: unknown[]]
    : [
        deps: [...args: TArgs, ...customDeps: unknown[]],
        options?: OptionsOrEquals
      ]
): TScope;

// ============================================================================
// Shared Mode Overloads (keyed, shared across components)
// ============================================================================

/**
 * **Shared Mode** - Multiple components share the same scope via a key.
 *
 * @param key - Unique identifier for the scope (same key = same instance)
 * @param factory - Factory function to create the scope
 * @param deps - Optional dependencies passed to factory (scope recreates when deps change)
 * @param options - Optional equality strategy for deps comparison
 *
 * @example
 * ```tsx
 * // Multiple components share this scope
 * const { input } = useScope("searchBar", searchBarLogic);
 *
 * // Dynamic keys for multiple instances
 * const { content } = useScope(`tab:${tabId}`, tabLogic);
 * ```
 */
export function useScope<TScope, TArgs extends any[]>(
  key: unknown,
  factory: (...deps: TArgs) => TScope,
  ...extra: [] extends TArgs
    ? [deps?: unknown[]]
    : [
        deps: [...args: TArgs, ...customDeps: unknown[]],
        options?: OptionsOrEquals
      ]
): TScope;

// ============================================================================
// Implementation
// ============================================================================

export function useScope(...args: any[]): any {
  let key: any;
  let factory: AnyFunc;
  let deps: unknown[] = [];
  let options: OptionsOrEquals | undefined;
  const localKeyRef = useRef<any>();

  // Detect mode: shared (keyed) vs local
  // Shared mode: useScope(key, factory, ...)
  // Local mode: useScope(factory, ...)
  const isSharedMode = typeof args[1] === "function";

  if (isSharedMode) {
    // Shared mode - use provided key
    key = args[0];
    factory = args[1];
    if (Array.isArray(args[2])) {
      deps = args[2];
      options = args[3];
    } else {
      options = args[2];
    }
  } else {
    // Local mode - auto-generate stable key per component instance
    if (!localKeyRef.current) {
      localKeyRef.current = {};
    }
    key = localKeyRef.current;
    factory = args[0];
    if (Array.isArray(args[1])) {
      deps = args[1];
      options = args[2];
    } else {
      options = args[1];
    }
  }

  // Parse equals function from options
  const equals = parseEquals(options);

  // Get or create entry from cache
  const entry = scopeCache.get(key, factory as any, deps, equals);

  // Lifecycle management via useIsomorphicLayoutEffect
  // - On mount: commit entry (increment refs)
  // - On key/entry change: cleanup runs (uncommit old), setup runs (commit new)
  // - On unmount: cleanup runs (uncommit)
  //
  // Note: No need to manually dispose old entries - uncommit() handles ref counting
  // and schedules disposal via microtask when refs reach 0.
  useIsomorphicLayoutEffect(() => {
    entry.commit();
    return entry.uncommit;
  }, [entry, key]);

  return entry.scope;
}
