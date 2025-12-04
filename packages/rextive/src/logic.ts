import { noop, once } from "lodash/fp";
import { tryDispose } from "./disposable";
import { withHooks } from "./hooks";
import { dev, emitter } from "./react";
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
type Resolvers = WeakMap<Logic<any> | AbstractLogic<any>, () => any>;

/**
 * Global resolvers - set via logic.with(), cleared via logic.clear().
 */
let globalResolvers: Resolvers = new WeakMap();

/**
 * Tracked instances - automatically tracked in dev mode, disposed via logic.clear().
 */
let trackedInstances: Set<Instance<any>> = new Set();

/**
 * Set of logics currently being initialized.
 * Used to detect circular dependencies.
 */
let initializingLogics: Set<Logic<any>> | undefined;

let singletonDev = new WeakMap<Logic<any>, Instance<any>>();

// ============================================================================
// Main Implementation
// ============================================================================

/**
 * Create a logic unit - a factory for bundles of signals and methods.
 *
 * In dev mode, all instances are automatically tracked and disposed when
 * `logic.clear()` is called. This provides test isolation without manual cleanup.
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
 *     getTodos: () => todos(),
 *     getFilter: () => filter(),
 *     getFiltered: () => filtered(),
 *     addTodo: (text: string) => todos.set(prev => [...prev, { text, done: false }]),
 *   };
 * });
 *
 * // Usage
 * const { addTodo } = todoStore();      // Singleton (persists)
 * const instance = todoStore.create();  // Fresh instance
 *
 * // Testing - instances are automatically disposed on logic.clear()
 * afterEach(() => logic.clear());
 *
 * it('test', () => {
 *   const store = todoStore.create(); // Auto-disposed on logic.clear()
 *   store.addTodo('test');
 *   expect(store.getTodos()).toHaveLength(1);
 * });
 * ```
 */
function logicImpl<T extends object>(name: string, fn: () => T): Logic<T> {
  /** Cached singleton instance (persists for app lifetime) */
  let singleton: Instance<T> | undefined;

  /** Display name for debugging */
  const displayName = name;

  /**
   * Create a new instance of this logic.
   * In dev mode, instances are automatically tracked and disposed on logic.clear().
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

    const onCleanup = emitter();

    try {
      // Track this logic as initializing (copy set to allow nesting)
      initializingLogics = new Set(initializingLogics);
      initializingLogics.add(lg);

      // Run the factory function
      const originalInstance = withHooks(
        (prevHooks) => ({
          onSignalCreate(signal, deps, disposalHandled) {
            if (!disposalHandled) {
              disposalHandled = true;
              onCleanup.on(signal.dispose);
            }
            prevHooks.onSignalCreate?.(signal, deps, disposalHandled);
          },
        }),
        fn
      );
      const originalDispose = (originalInstance as any).dispose;

      // Wrap with disposable for automatic cleanup
      const instance: Instance<T> = {
        ...originalInstance,
        dispose: once(() => {
          onCleanup.emitAndClear();
          if (originalDispose) {
            tryDispose({ dispose: originalDispose });
          }
        }),
      };

      dev() && trackedInstances.add(instance);

      return instance;
    } catch (error) {
      onCleanup.emitAndClear();
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

  const getSingletonPro = () => {
    if (!singleton) {
      singleton = create();
    }
    return singleton;
  };

  const getSingletonDev = () => {
    singleton = singletonDev.get(lg);
    if (!singleton) {
      singleton = create();
      singletonDev.set(lg, singleton);
    }
    return singleton;
  };

  /**
   * Get or create singleton instance.
   */
  const getSingleton = dev() ? getSingletonDev : getSingletonPro;

  /**
   * The logic object - callable as function for singleton access.
   */
  const lg: Logic<T> = Object.assign(
    // Main callable: get singleton or resolve override
    (): Instance<T> => {
      // Check global override
      const resolver = globalResolvers.get(lg);
      if (resolver) {
        const result = resolver();

        if (result && !result.dispose) {
          result.dispose = noop;
        }
        return result;
      }

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
   * Provide a mock implementation for a logic (override).
   * Useful for testing - replace logic with controlled test instances.
   *
   * **Important**: Always provide a complete mock instance. Partial overrides
   * don't work correctly because methods have closure references to original signals.
   *
   * @param logic - The logic to provide implementation for
   * @param factory - Factory function returning the mock instance
   * @returns The logic (for chaining)
   *
   * @example
   * ```ts
   * // Setup pattern - return instance for test manipulation
   * const setupAuth = (initial: { user?: User }) => {
   *   const instance = {
   *     user: signal(initial.user ?? null),
   *     isRestoring: signal(false),
   *     getUser: () => instance.user(),
   *     getIsRestoring: () => instance.isRestoring(),
   *     logout: vi.fn(),
   *     openLoginModal: vi.fn(),
   *   };
   *   logic.provide(authLogic, () => instance);
   *   return instance;
   * };
   *
   * it('shows user name when logged in', () => {
   *   const auth = setupAuth({ user: { name: 'Alice' } });
   *   // ... test with initial state ...
   *
   *   // Manipulate state during test
   *   auth.user.set(null);
   *   // ... test logged out state ...
   * });
   *
   * // Simple mock pattern
   * logic.provide(authLogic, () => ({
   *   getUser: vi.fn().mockReturnValue(mockUser),
   *   getIsRestoring: vi.fn().mockReturnValue(false),
   *   logout: vi.fn(),
   *   openLoginModal: vi.fn(),
   * }));
   * ```
   */
  provide: <
    TInstance extends object,
    TLogic extends Logic<TInstance> | AbstractLogic<TInstance>
  >(
    logic: TLogic,
    factory: () => TInstance
  ) => {
    globalResolvers.set(logic, factory);
    return logic;
  },

  /**
   * Clear all global overrides and dispose all tracked instances.
   * In dev mode, all instances created via `myLogic()` or `myLogic.create()`
   * are automatically tracked and disposed when this is called.
   *
   * Call in afterEach() for test isolation.
   *
   * @example
   * ```ts
   * afterEach(() => {
   *   logic.clear(); // Clears overrides + disposes all tracked instances
   * });
   *
   * it('test', () => {
   *   const store = todoStore.create(); // Auto-tracked in dev mode
   *   // ... test ...
   *   // No manual dispose needed - logic.clear() handles it
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
    trackedInstances.clear();

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
      // Storage for dispose wrapper
      let disposeWrapper: (() => void) | undefined;

      const getOverride = () => {
        // Check override on EACH property access (no caching)
        const resolver = globalResolvers.get(lg as unknown as Logic<T>);
        if (resolver) {
          return resolver() as any;
        }
        return undefined;
      };

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
          const override = getOverride();
          if (override) {
            // Get the real implementation and access the property
            return override[prop];
          }

          // No override - throw
          throw new NotImplementedError(name, String(prop));
        },
        set(_, prop, value) {
          // Allow setting dispose
          if (prop === "dispose" && typeof value === "function") {
            disposeWrapper = value;
            return true;
          }

          // Check override for set operations
          const override = getOverride();
          if (override) {
            override[prop] = value;
            return true;
          }

          throw new NotImplementedError(name, String(prop));
        },
        has(_, prop) {
          // Check override
          const override = getOverride();
          if (override) {
            return prop in override;
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
