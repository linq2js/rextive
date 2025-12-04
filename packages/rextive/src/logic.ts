import { disposable } from "./disposable";
import { AbstractLogic, Instance, Logic, LOGIC_TYPE } from "./types";

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error thrown when a virtual method is called without being overridden.
 */
export class NotImplementedError extends Error {
  constructor(logicName: string, methodName: string) {
    super(
      `"${logicName}.${methodName}" is not implemented - use logic.provide(${logicName}, ...) to provide implementation`
    );
    this.name = "NotImplementedError";
  }
}

/**
 * Error thrown when logic creation fails.
 * Wraps the original error with logic context.
 */
export class LogicCreateError extends Error {
  constructor(logicName: string, public readonly cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to create logic "${logicName}": ${message}`);
    this.name = "LogicCreateError";
  }
}

// ============================================================================
// Global Context State
// ============================================================================

/**
 * WeakMap storing dependency overrides for testing/DI.
 * Key: Logic to override, Value: Factory function returning override value
 */
type Resolvers = WeakMap<
  Logic<any> | AbstractLogic<any>,
  (original: () => any) => any
>;

/**
 * Global resolvers - set via logic.with(), cleared via logic.clear().
 */
let globalResolvers: Resolvers = new WeakMap();

/**
 * Tracked instances - created via logic.create(), disposed via logic.clear().
 */
let trackedInstances: Set<Instance<any>> = new Set();

/**
 * Set of logics currently being initialized.
 * Used to detect circular dependencies.
 */
let initializingLogics: Set<Logic<any>> | undefined;

// ============================================================================
// Main Implementation
// ============================================================================

/**
 * Create a logic unit - a factory for bundles of signals and methods.
 *
 * @param name - Display name for debugging and error messages (required)
 * @param fn - Factory function that creates the logic's content
 * @returns A Logic object with singleton access and create method
 *
 * @example
 * ```ts
 * // Define a logic unit
 * const todoStore = logic("todoStore", () => {
 *   const todos = signal<Todo[]>([]);
 *   const filter = signal<'all' | 'active' | 'done'>('all');
 *
 *   const filtered = signal({ todos, filter }, ({ deps }) =>
 *     deps.filter === 'all'
 *       ? deps.todos
 *       : deps.todos.filter(t => t.done === (deps.filter === 'done'))
 *   );
 *
 *   return {
 *     todos,
 *     filter,
 *     filtered,
 *     addTodo: (text: string) => todos.set(prev => [...prev, { text, done: false }]),
 *   };
 * });
 *
 * // Production: Use singleton or create fresh instances
 * const { addTodo } = todoStore();      // Singleton (persists)
 * const instance = todoStore.create();  // Fresh instance
 *
 * // Testing: Use logic.create() for auto-cleanup
 * afterEach(() => logic.clear());
 * const store = logic.create(todoStore); // Tracked, auto-disposed
 *
 * // For abstract dependencies, use logic.abstract<T>():
 * const authProvider = logic.abstract<{ getToken: () => string }>("authProvider");
 * ```
 */
function logicImpl<T extends object>(name: string, fn: () => T): Logic<T> {
  /** Cached singleton instance (persists for app lifetime) */
  let singleton: Instance<T> | undefined;

  /** Display name for debugging */
  const displayName = name;

  /**
   * Create a new instance of this logic (untracked).
   * In production: use for fresh instances when needed.
   * In tests: prefer logic.create(myLogic) for auto-cleanup.
   */
  const create = (): Instance<T> => {
    // Circular dependency check
    if (initializingLogics?.has(lg)) {
      throw new LogicCreateError(
        displayName,
        new Error(
          `Circular dependency detected: "${displayName}" is already initializing`
        )
      );
    }

    // Save previous context (for nested logic creation)
    const prevInitializing = initializingLogics;

    try {
      // Track this logic as initializing (copy set to allow nesting)
      initializingLogics = new Set(initializingLogics);
      initializingLogics.add(lg);

      // Run the factory function
      const instance = fn();

      // Wrap with disposable for automatic cleanup
      return disposable(instance);
    } catch (error) {
      // Wrap non-LogicCreateError errors
      if (error instanceof LogicCreateError) {
        throw error;
      }
      throw new LogicCreateError(displayName, error);
    } finally {
      // Restore previous context
      initializingLogics = prevInitializing;
    }
  };

  /**
   * Get or create singleton instance.
   */
  const getSingleton = (): Instance<T> => {
    if (!singleton) {
      singleton = create();
    }
    return singleton;
  };

  /** Cached override result (separate from singleton) */
  let overrideInstance: Instance<T> | undefined;

  /**
   * The logic object - callable as function for singleton access.
   */
  const lg: Logic<T> = Object.assign(
    // Main callable: get singleton or resolve override
    (): Instance<T> => {
      // Check global override
      const resolver = globalResolvers.get(lg);
      if (resolver) {
        // Cache override result for singleton semantics
        if (!overrideInstance) {
          const result = resolver(getSingleton);
          const instance =
            typeof result?.dispose === "function" ? result : disposable(result);
          overrideInstance = instance;
          return instance;
        }
        return overrideInstance;
      }

      // No override - clear any cached override and return singleton
      overrideInstance = undefined;
      return getSingleton();
    },
    {
      [LOGIC_TYPE]: true as const,
      displayName,
      create,
    }
  );

  return lg;
}

export const logic = Object.assign(logicImpl, {
  /**
   * Provide an implementation for a logic (override).
   * Applies to ALL logics that depend on the specified logic.
   *
   * @param l - The logic to provide implementation for
   * @param impl - Factory function receiving original and returning implementation
   * @returns logic (for chaining)
   *
   * @example
   * ```ts
   * // Provide implementation for abstract logic
   * logic.provide(authProvider, () => ({
   *   getToken: () => localStorage.getItem('token'),
   * }));
   *
   * // Chain multiple providers
   * logic
   *   .provide(settings, () => ({ apiUrl: 'http://test' }))
   *   .provide(auth, () => ({ token: 'test-token' }));
   *
   * // Partial override with original
   * logic.provide(settings, (original) => ({
   *   ...original(),
   *   apiUrl: 'http://test',
   * }));
   * ```
   */
  provide: <TOther extends object>(
    l: Logic<TOther> | AbstractLogic<TOther>,
    impl: (original: () => TOther) => TOther
  ) => {
    globalResolvers.set(l, impl);
    return logic;
  },

  /**
   * Create a tracked instance of a logic (for testing).
   * Instance will be disposed when logic.clear() is called.
   *
   * @param l - The logic to create an instance of
   * @returns A tracked instance
   *
   * @example
   * ```ts
   * afterEach(() => {
   *   logic.clear(); // Disposes all tracked instances + clears overrides
   * });
   *
   * it('test', () => {
   *   const store = logic.create(userStore); // Tracked!
   *   // ... test ...
   *   // No manual dispose needed!
   * });
   * ```
   */
  create: <T extends object>(l: Logic<T> | AbstractLogic<T>): Instance<T> => {
    // Check for global override
    const resolver = globalResolvers.get(l);
    let instance: Instance<T>;

    if (resolver) {
      // Pass original getter (temporarily bypass override)
      const getOriginal = (): Instance<T> => {
        // Temporarily remove override to get original
        globalResolvers.delete(l);
        try {
          return l();
        } finally {
          // Restore override
          globalResolvers.set(l, resolver);
        }
      };

      const result = resolver(getOriginal);
      instance =
        typeof result?.dispose === "function"
          ? result
          : (disposable(result) as Instance<T>);
    } else if ("create" in l) {
      // Regular logic - create fresh instance
      instance = l.create();
    } else {
      // Abstract logic without override - return proxy (will throw on access)
      instance = l();
    }

    trackedInstances.add(instance);

    // Remove from tracking when disposed manually
    const originalDispose = instance.dispose;
    instance.dispose = () => {
      trackedInstances.delete(instance);
      originalDispose();
    };

    return instance;
  },

  /**
   * Clear all global overrides and dispose all tracked instances.
   * Call in afterEach() for test isolation.
   *
   * @example
   * ```ts
   * afterEach(() => {
   *   logic.clear(); // Clears overrides + disposes tracked instances
   * });
   * ```
   */
  clear: () => {
    // Dispose all tracked instances
    for (const instance of trackedInstances) {
      try {
        instance.dispose();
      } catch {
        // Ignore disposal errors during cleanup
      }
    }
    trackedInstances = new Set();

    // Clear global overrides
    globalResolvers = new WeakMap();
  },

  /**
   * Create an abstract logic that must be overridden before use.
   * Returns a Proxy - accessing any property throws NotImplementedError.
   *
   * Unlike regular `logic()`:
   * - No factory function needed, just define the type
   * - No `create()` method (only singleton access)
   * - Can be passed around safely; error only on property access
   *
   * @param name - Display name for debugging and error messages
   * @returns An AbstractLogic that must be overridden via logic.with()
   *
   * @example
   * ```ts
   * // Define abstract logic with type
   * const authProvider = logic.abstract<{
   *   getToken: () => Promise<string>;
   *   logout: () => void;
   * }>("authProvider");
   *
   * // Can pass around without error
   * const auth = authProvider(); // ✅ OK
   *
   * // Error when property is accessed
   * auth.getToken(); // ❌ NotImplementedError
   *
   * // Consumer provides implementation
   * logic.with(authProvider, () => ({
   *   getToken: async () => localStorage.getItem("token") ?? "",
   *   logout: () => localStorage.removeItem("token"),
   * }));
   *
   * authProvider().getToken(); // ✅ Works
   * ```
   */
  abstract: <T extends object>(name: string): AbstractLogic<T> => {
    /** Cached proxy singleton */
    let proxyInstance: Instance<T> | undefined;

    /**
     * Create a proxy that evaluates override on each property access.
     * This allows changing the override to take effect immediately.
     */
    const createProxy = (): Instance<T> => {
      // Storage for dispose wrapper (set by logic.create())
      let disposeWrapper: (() => void) | undefined;

      return new Proxy({} as Instance<T>, {
        get(_, prop) {
          // Allow dispose() to be called
          if (prop === "dispose") {
            return disposeWrapper ?? (() => {});
          }
          // Allow symbol access for type checks
          if (typeof prop === "symbol") {
            return undefined;
          }

          // Check override on EACH property access (no caching)
          const resolver = globalResolvers.get(lg as unknown as Logic<T>);
          if (resolver) {
            // Get the real implementation and access the property
            const impl = resolver(() => {
              throw new NotImplementedError(name, "original");
            });
            return (impl as any)[prop];
          }

          // No override - throw
          throw new NotImplementedError(name, String(prop));
        },
        set(_, prop, value) {
          // Allow setting dispose (for logic.create() wrapper)
          if (prop === "dispose" && typeof value === "function") {
            disposeWrapper = value;
            return true;
          }

          // Check override for set operations
          const resolver = globalResolvers.get(lg as unknown as Logic<T>);
          if (resolver) {
            const impl = resolver(() => {
              throw new NotImplementedError(name, "original");
            });
            (impl as any)[prop] = value;
            return true;
          }

          throw new NotImplementedError(name, String(prop));
        },
        has(_, prop) {
          // Check override
          const resolver = globalResolvers.get(lg as unknown as Logic<T>);
          if (resolver) {
            const impl = resolver(() => ({}));
            return prop in impl;
          }
          return true; // Pretend all properties exist for type compatibility
        },
      });
    };

    /**
     * Get proxy singleton (creates if not exists).
     */
    const getProxy = (): Instance<T> => {
      if (!proxyInstance) {
        proxyInstance = createProxy();
      }
      return proxyInstance;
    };

    /**
     * The abstract logic object - callable for singleton access.
     * Always returns the same proxy instance.
     */
    const lg = Object.assign((): Instance<T> => getProxy(), {
      [LOGIC_TYPE]: true as const,
      displayName: name,
      // Note: No create() method for abstract logics
    });

    return lg as AbstractLogic<T>;
  },
});
