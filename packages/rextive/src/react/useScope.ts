import { useLayoutEffect } from "react";
import { EqualsFn } from "../types";
import { EqualsStrategy, resolveEquals } from "../utils/resolveEquals";
import { scopeCache } from "./scopeCache";

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
 * Uses a transient cache to handle React StrictMode double-invoke and
 * share scope instances across renders with the same key.
 *
 * ## Key Features
 *
 * - **Keyed caching**: Same key = same instance (across StrictMode double-renders)
 * - **Args comparison**: Recreates scope when args change
 * - **Auto-dispose**: Signals created inside factory are automatically disposed
 * - **Logic support**: Automatically uses `logic.create()` for Logic factories
 *
 * ## ⭐ Auto-Dispose Feature
 *
 * Signals created inside the factory are automatically disposed when:
 * - The component unmounts
 * - The args change (scope recreated)
 * - React StrictMode double-invokes (orphan signals cleaned up)
 *
 * @example Basic usage
 * ```tsx
 * function SearchBar() {
 *   const scope = useScope("searchBar", () => {
 *     const input = signal("");
 *     const results = signal([]);
 *     return { input, results };
 *   });
 *
 *   return <input value={rx(scope.input)} />;
 * }
 * ```
 *
 * @example With args (recreates when args change)
 * ```tsx
 * function UserProfile({ userId }: { userId: string }) {
 *   const scope = useScope("userProfile", (id) => {
 *     const user = signal(async () => fetchUser(id));
 *     return { user };
 *   }, [userId]);
 *
 *   return <div>{rx(scope.user, u => u?.name)}</div>;
 * }
 * ```
 *
 * @example Multiple instances (user-controlled key)
 * ```tsx
 * function Tab({ tabId }: { tabId: string }) {
 *   // Each tab gets its own scope
 *   const scope = useScope(`tab:${tabId}`, () => {
 *     const content = signal("");
 *     return { content };
 *   });
 *
 *   return <div>{rx(scope.content)}</div>;
 * }
 * ```
 *
 * @example With Logic
 * ```tsx
 * const counterLogic = logic("counterLogic", () => {
 *   const count = signal(0);
 *   return { count, increment: () => count.set(c => c + 1) };
 * });
 *
 * function Counter() {
 *   // Automatically uses counterLogic.create()
 *   const { count, increment } = useScope("counter", counterLogic);
 *   return <button onClick={increment}>{rx(count)}</button>;
 * }
 * ```
 *
 * @example Custom equality for args
 * ```tsx
 * function FilteredList({ filters }: { filters: Filters }) {
 *   const scope = useScope("filteredList", (f) => {
 *     const items = signal([]);
 *     return { items };
 *   }, [filters], {
 *     equals: (a, b) => JSON.stringify(a) === JSON.stringify(b)
 *   });
 * }
 * ```
 *
 * @example Using equality strategy shorthand
 * ```tsx
 * // Using string strategy
 * useScope("data", factory, [obj], "shallow");
 *
 * // Using custom function directly
 * useScope("data", factory, [obj], (a, b) => a.id === b.id);
 * ```
 */

// Overload 2: With args
export function useScope<TScope extends object, TArgs extends any[]>(
  key: unknown,
  factory: (...args: TArgs) => TScope,
  args: NoInfer<TArgs>,
  options?: OptionsOrEquals
): TScope;

// Overload 1: No args
export function useScope<TScope extends object>(
  key: unknown,
  factory: () => TScope,
  options?: OptionsOrEquals
): TScope;

// Implementation
export function useScope<TScope extends object, TArgs extends any[]>(
  key: unknown,
  factory: ((...args: TArgs) => TScope) | (() => TScope),
  argsOrOptions?: TArgs | OptionsOrEquals,
  maybeOptions?: OptionsOrEquals
): TScope {
  // Detect if third argument is args array or options
  const isArgsMode = Array.isArray(argsOrOptions);
  const args = isArgsMode ? (argsOrOptions as TArgs) : ([] as unknown as TArgs);
  const options = isArgsMode
    ? maybeOptions
    : (argsOrOptions as OptionsOrEquals);

  // Parse equals function from options
  const equals = parseEquals(options);

  // Get or create entry from cache
  const entry = scopeCache.get(key, factory as any, args, equals);

  // Lifecycle management via useLayoutEffect
  // - On mount: commit entry (increment refs)
  // - On key change: cleanup runs (uncommit old), setup runs (commit new)
  // - On unmount: cleanup runs (uncommit)
  useLayoutEffect(() => {
    entry.commit();
    return () => entry.uncommit();
  }, [entry, key]);

  return entry.scope as TScope;
}
