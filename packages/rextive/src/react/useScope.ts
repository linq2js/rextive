import { useLayoutEffect, useEffect, useRef } from "react";
import { AnyFunc, EqualsFn, EqualsStrategy, Mutable } from "../types";
import { resolveEquals } from "../utils/resolveEquals";
import { scopeCache } from "./scopeCache";
import { signal } from "../signal";
import { withHooks } from "../hooks";
import { emitter } from "../utils/emitter";

const NO_KEY = Symbol("no-key");

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

/**
 * Proxy type that creates empty signals on demand.
 * Each property access creates/returns a Mutable signal.
 */
export type SignalProxy<T extends Record<string, unknown>> = {
  [K in keyof T]: Mutable<T[K], T[K] | undefined>;
};

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
// Proxy Mode Overload (on-demand signal creation)
// ============================================================================

/**
 * **Proxy Mode** - Creates signals on-demand when properties are accessed.
 *
 * This is syntactic sugar for creating multiple empty signals without
 * boilerplate. Signals are created lazily on first property access.
 *
 * @typeParam T - Record type defining the signal types
 * @returns A proxy that creates Mutable signals on property access
 *
 * @example
 * ```tsx
 * // Define signal types via type parameter
 * const proxy = useScope<{
 *   submitState: Promise<SubmitResult>;
 *   searchState: Promise<SearchResult>;
 * }>();
 *
 * // Signals are created on first access
 * proxy.submitState.set(promise);  // Creates empty signal, then sets value
 *
 * // Use with rx() for reactive rendering
 * {rx(() => {
 *   const state = task.from(proxy.submitState());
 *   return state?.loading ? <Spinner /> : <Content />;
 * })}
 * ```
 */
export function useScope<T extends Record<string, unknown>>(): SignalProxy<T>;

/**
 * **Multiple Scopes Mode** - Create multiple scopes in a single call.
 *
 * @param scopes - Array of Scope descriptors or factory functions
 * @returns Tuple of scope values in the same order
 *
 * @example
 * ```tsx
 * const [counter, form] = useScope([
 *   scope(counterLogic),
 *   scope(formLogic, [initialData]),
 * ]);
 * ```
 */
export function useScope<TScopes extends readonly (Scope<any> | AnyFunc)[]>(
  scopes: [...TScopes]
): {
  [K in keyof TScopes]: TScopes[K] extends Scope<infer T>
    ? T
    : TScopes[K] extends AnyFunc
      ? ReturnType<TScopes[K]>
      : never;
};

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
        options?: OptionsOrEquals,
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
        options?: OptionsOrEquals,
      ]
): TScope;

// ============================================================================
// Implementation
// ============================================================================

export function useScope(...args: any[]): any {
  // Stable keys for local mode scopes (one per component instance)
  const localKeysRef = useRef<unknown[]>([]);

  // Get or create a stable key for a given index
  const getLocalKey = (index: number) => {
    if (!localKeysRef.current[index]) {
      localKeysRef.current[index] = {};
    }
    return localKeysRef.current[index];
  };

  let isMultiple = false;
  let isProxyMode = false;
  let scopes: Scope<any>[] = [];

  if (args.length === 1 && Array.isArray(args[0])) {
    // ========================================
    // Multiple Mode: useScope([scope1, scope2, ...])
    // ========================================
    isMultiple = true;
    scopes = args[0].map((item: Scope<any> | AnyFunc, index: number) => {
      if (typeof item === "function") {
        return new Scope(getLocalKey(index), item);
      } else if (item.key === undefined || item.key === NO_KEY) {
        // Local scope - use component-stable key
        return new Scope(
          getLocalKey(index),
          item.factory,
          item.deps,
          item.options
        );
      } else {
        // Shared scope - use provided key
        return item;
      }
    });
  } else if (args.length === 0) {
    // ========================================
    // Proxy Mode: useScope<T>() with no args
    // ========================================
    isProxyMode = true;
    scopes = [new Scope(getLocalKey(0), createSignalProxy)];
  } else if (typeof args[1] === "function") {
    // ========================================
    // Shared Mode: useScope(key, factory, ...)
    // ========================================
    scopes = [new Scope(args[0], args[1], args[2], args[3])];
  } else {
    // ========================================
    // Local Mode: useScope(factory, ...)
    // ========================================
    scopes = [new Scope(getLocalKey(0), args[0], args[1], args[2])];
  }

  // Get entries from cache
  const entries = scopes.map((s) => {
    const equals = parseEquals(s.options);
    return scopeCache.get(s.key, s.factory, s.deps ?? [], equals);
  });

  // Lifecycle management
  useIsomorphicLayoutEffect(() => {
    for (const entry of entries) {
      entry.commit();
    }
    return () => {
      for (const entry of entries) {
        entry.uncommit();
      }
    };
  }, entries);

  if (isMultiple) {
    return entries.map((entry) => entry.scope);
  }

  // For proxy mode, return just the proxy (not { proxy, dispose })
  return isProxyMode ? entries[0].scope.proxy : entries[0].scope;
}

/**
 * Create a proxy that creates empty signals on demand.
 * Returns { proxy, dispose } so dispose is accessible without Proxy interception.
 */
function createSignalProxy(): {
  proxy: any;
  dispose: VoidFunction;
} {
  const signalCache = new Map<string | symbol, Mutable<any, any>>();
  const onCleanup = emitter();

  const proxy = new Proxy(
    {},
    {
      get(_, key: string | symbol) {
        // Return cached signal if exists
        let sig = signalCache.get(key);
        if (sig) return sig;

        // Create new signal with disposalHandled = true to prevent
        // outer scopes (like rx()) from capturing and disposing it
        sig = withHooks(
          (hooks) => ({
            ...hooks,
            onSignalCreate(createdSignal, deps) {
              // Mark as handled - we manage disposal ourselves
              hooks.onSignalCreate?.(createdSignal, deps, true);
            },
          }),
          () => signal<any>()
        );

        // Cache and register for disposal
        signalCache.set(key, sig);
        onCleanup.on(sig.dispose);

        return sig;
      },
    }
  );

  return { proxy, dispose: onCleanup.settle };
}

/**
 * Scope descriptor - captures useScope configuration without executing it.
 * Useful for passing scope configuration to wrapper components.
 */
export class Scope<TScope> {
  constructor(
    public readonly key: unknown | undefined,
    public readonly factory: (...args: any[]) => TScope,
    public readonly deps?: unknown[],
    public readonly options?: OptionsOrEquals | undefined
  ) {}
}

// ============================================================================
// scope() - Create Scope descriptors (mirrors useScope overloads)
// ============================================================================

/**
 * **Local Mode** - Creates a Scope descriptor for local (per-component) scope.
 *
 * @param factory - Factory function to create the scope
 * @param deps - Optional dependencies passed to factory
 * @param options - Optional equality strategy for deps comparison
 */
export function scope<TScope, TArgs extends any[]>(
  factory: (...deps: TArgs) => TScope,
  ...extra: [] extends TArgs
    ? [deps?: unknown[]]
    : [
        deps: [...args: TArgs, ...customDeps: unknown[]],
        options?: OptionsOrEquals,
      ]
): Scope<TScope>;

/**
 * **Shared Mode** - Creates a Scope descriptor for shared (keyed) scope.
 *
 * @param key - Unique identifier for the scope (same key = same instance)
 * @param factory - Factory function to create the scope
 * @param deps - Optional dependencies passed to factory
 * @param options - Optional equality strategy for deps comparison
 */
export function scope<TScope, TArgs extends any[]>(
  key: unknown,
  factory: (...deps: TArgs) => TScope,
  ...extra: [] extends TArgs
    ? [deps?: unknown[]]
    : [
        deps: [...args: TArgs, ...customDeps: unknown[]],
        options?: OptionsOrEquals,
      ]
): Scope<TScope>;

// Implementation
export function scope(...args: any[]): Scope<any> {
  let key: unknown | undefined = NO_KEY;
  let factory: AnyFunc;
  let deps: unknown[] = [];
  let options: OptionsOrEquals | undefined;

  if (typeof args[1] === "function") {
    // Shared mode: scope(key, factory, ...)
    key = args[0];
    factory = args[1];
    if (Array.isArray(args[2])) {
      deps = args[2];
      options = args[3];
    } else {
      options = args[2];
    }
  } else {
    // Local mode: scope(factory, ...)
    key = undefined;
    factory = args[0];
    if (Array.isArray(args[1])) {
      deps = args[1];
      options = args[2];
    } else {
      options = args[1];
    }
  }

  return new Scope(key, factory, deps, options);
}
