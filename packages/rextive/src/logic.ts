import { noop, once } from "lodash/fp";
import { tryDispose } from "./disposable";
import { withHooks } from "./hooks";
import { dev, emitter } from "./react";
import {
  AbstractLogic,
  AbstractLogicInstance,
  Instance,
  Logic,
  LOGIC_TYPE,
} from "./types";

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
 * @example Basic Usage
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
 * // Singleton access
 * const { addTodo } = todoStore();
 *
 * // Fresh instance
 * const instance = todoStore.create();
 * ```
 *
 * @example Custom Cleanup with dispose()
 * ```ts
 * // Signals inside logic are auto-disposed.
 * // For external resources, return an object with dispose() method.
 *
 * const websocketLogic = logic("websocketLogic", () => {
 *   const messages = signal<Message[]>([]);
 *   const connected = signal(false);
 *
 *   // External resource - needs manual cleanup
 *   const socket = new WebSocket("wss://api.example.com");
 *   socket.onopen = () => connected.set(true);
 *   socket.onclose = () => connected.set(false);
 *   socket.onmessage = (e) => messages.set(prev => [...prev, JSON.parse(e.data)]);
 *
 *   return {
 *     messages,
 *     connected,
 *     send: (msg: string) => socket.send(msg),
 *     // Custom cleanup - called when instance.dispose() is invoked
 *     dispose: () => {
 *       socket.close();
 *       console.log("WebSocket closed");
 *     },
 *   };
 * });
 *
 * // Usage
 * const ws = websocketLogic.create();
 * ws.send("hello");
 *
 * // Later - cleanup
 * ws.dispose(); // Closes WebSocket + disposes signals
 * ```
 *
 * @example Consuming Other Logics (Shared vs Owned)
 * ```ts
 * // Shared logics - use singleton, DON'T dispose (not owned)
 * const authLogic = logic("authLogic", () => { ... });
 * const configLogic = logic("configLogic", () => { ... });
 *
 * // Child logic - created fresh, SHOULD dispose (owned)
 * const tabLogic = logic("tabLogic", () => { ... });
 *
 * const dashboardLogic = logic("dashboardLogic", () => {
 *   // ✅ Shared logics - use singleton (get at factory level, not inside actions!)
 *   const $auth = authLogic();   // Singleton - NOT owned
 *   const $config = configLogic(); // Singleton - NOT owned
 *
 *   // ✅ Owned logics - create fresh instances
 *   const tabs: Instance<typeof tabLogic>[] = [];
 *
 *   const addTab = () => {
 *     const tab = tabLogic.create(); // Fresh instance - OWNED
 *     tabs.push(tab);
 *     return tab;
 *   };
 *
 *   const removeTab = (tab: Instance<typeof tabLogic>) => {
 *     const index = tabs.indexOf(tab);
 *     if (index >= 0) {
 *       tabs.splice(index, 1);
 *       tab.dispose(); // ✅ Dispose owned instance
 *     }
 *   };
 *
 *   return {
 *     // Expose shared logic state (read-only access)
 *     user: $auth.user,
 *     theme: $config.theme,
 *
 *     // Tab management
 *     getTabs: () => tabs,
 *     addTab,
 *     removeTab,
 *
 *     // ✅ Only dispose OWNED logics
 *     dispose: () => {
 *       tabs.forEach(tab => tab.dispose());
 *       tabs.length = 0;
 *       // DON'T dispose $auth or $config - they're shared!
 *     },
 *   };
 * });
 * ```
 *
 * @example Testing
 * ```ts
 * // Instances are automatically disposed on logic.clear()
 * afterEach(() => logic.clear());
 *
 * it('test', () => {
 *   const store = todoStore.create(); // Auto-disposed on logic.clear()
 *   store.addTodo('test');
 *   expect(store.getTodos()).toHaveLength(1);
 * });
 * ```
 */
export function logic<T extends object>(name: string, fn: () => T): Logic<T> {
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

  const getSingletonPro = once(create);

  const getSingletonDev = () => {
    let singleton = singletonDev.get(lg);
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

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace logic {
  /**
   * Provide a mock implementation for a logic (override).
   * Useful for testing - replace logic with controlled test instances.
   *
   * **Important**: Always provide a complete mock instance. Partial overrides
   * don't work correctly because methods have closure references to original signals.
   *
   * @param targetLogic - The logic to provide implementation for
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
  export function provide<
    TInstance extends object,
    TLogic extends Logic<TInstance> | AbstractLogic<TInstance>
  >(targetLogic: TLogic, factory: () => TInstance): TLogic {
    globalResolvers.set(targetLogic, factory);
    return targetLogic;
  }

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
  export function clear(): void {
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
  }

  /**
   * Create an abstract logic that must be overridden before use.
   * Returns a readonly Proxy with cached function stubs.
   *
   * Unlike regular `logic()`:
   * - No factory function needed, just define the type
   * - No `create()` method (only singleton access)
   * - Output only includes function properties (non-functions are excluded)
   * - Output is readonly (set operations throw TypeError)
   * - Function stubs are cached and throw NotImplementedError when invoked
   *
   * @param name - Display name for debugging and error messages
   * @returns An AbstractLogic that must be overridden via logic.provide()
   *
   * @example Basic Usage
   * ```ts
   * // Define abstract logic with type
   * const authProvider = logic.abstract<{
   *   getToken: () => Promise<string>;
   *   logout: () => void;
   *   config: { timeout: number }; // Non-function excluded from output
   * }>("authProvider");
   *
   * // Can pass around without error
   * const auth = authProvider(); // ✅ OK - returns readonly proxy
   *
   * // Error when function is INVOKED (not accessed)
   * auth.getToken(); // ❌ NotImplementedError
   *
   * // Consumer provides implementation
   * logic.provide(authProvider, () => ({
   *   getToken: async () => localStorage.getItem("token") ?? "",
   *   logout: () => localStorage.removeItem("token"),
   * }));
   *
   * authProvider().getToken(); // ✅ Works
   * ```
   *
   * @example Multi-Platform (Web vs React Native)
   * ```ts
   * // shared/storageProvider.ts - Define contract
   * const storageProvider = logic.abstract<{
   *   get: (key: string) => Promise<string | null>;
   *   set: (key: string, value: string) => Promise<void>;
   *   remove: (key: string) => Promise<void>;
   * }>("storageProvider");
   *
   * // web/setup.ts - Web implementation
   * logic.provide(storageProvider, () => ({
   *   get: async (key) => localStorage.getItem(key),
   *   set: async (key, value) => localStorage.setItem(key, value),
   *   remove: async (key) => localStorage.removeItem(key),
   * }));
   *
   * // native/setup.ts - React Native implementation
   * import AsyncStorage from '@react-native-async-storage/async-storage';
   * logic.provide(storageProvider, () => ({
   *   get: (key) => AsyncStorage.getItem(key),
   *   set: (key, value) => AsyncStorage.setItem(key, value),
   *   remove: (key) => AsyncStorage.removeItem(key),
   * }));
   *
   * // shared/authLogic.ts - Platform-agnostic usage
   * const authLogic = logic("authLogic", () => {
   *   const storage = storageProvider(); // Works on both platforms!
   *   return {
   *     getToken: () => storage.get("auth_token"),
   *     saveToken: (token: string) => storage.set("auth_token", token),
   *   };
   * });
   * ```
   *
   * @example Environment-Based (Dev vs Prod)
   * ```ts
   * // Define analytics contract
   * const analyticsProvider = logic.abstract<{
   *   track: (event: string, data?: Record<string, any>) => void;
   *   identify: (userId: string) => void;
   * }>("analyticsProvider");
   *
   * // Production: Real analytics
   * if (process.env.NODE_ENV === "production") {
   *   logic.provide(analyticsProvider, () => ({
   *     track: (event, data) => mixpanel.track(event, data),
   *     identify: (userId) => mixpanel.identify(userId),
   *   }));
   * }
   * // Development: Console logging
   * else {
   *   logic.provide(analyticsProvider, () => ({
   *     track: (event, data) => console.log("[Analytics]", event, data),
   *     identify: (userId) => console.log("[Analytics] identify:", userId),
   *   }));
   * }
   * ```
   *
   * @example Dynamic Runtime Switching
   * ```ts
   * // Define payment processor contract
   * const paymentProcessor = logic.abstract<{
   *   charge: (amount: number) => Promise<{ success: boolean }>;
   *   refund: (transactionId: string) => Promise<void>;
   * }>("paymentProcessor");
   *
   * // Feature flag or A/B test driven switching
   * const stripeImpl = () => ({
   *   charge: async (amount) => stripe.charges.create({ amount }),
   *   refund: async (id) => stripe.refunds.create({ charge: id }),
   * });
   *
   * const paypalImpl = () => ({
   *   charge: async (amount) => paypal.payment.create({ amount }),
   *   refund: async (id) => paypal.payment.refund(id),
   * });
   *
   * // Switch at runtime based on user preference or feature flag
   * function setPaymentProvider(provider: "stripe" | "paypal") {
   *   logic.provide(paymentProcessor, provider === "stripe" ? stripeImpl : paypalImpl);
   * }
   *
   * // Usage - automatically uses current provider
   * const checkout = logic("checkoutLogic", () => ({
   *   processPayment: async (amount: number) => {
   *     const processor = paymentProcessor(); // Gets current implementation
   *     return processor.charge(amount);
   *   },
   * }));
   *
   * // Switch provider dynamically
   * setPaymentProvider("stripe");
   * checkout().processPayment(100); // Uses Stripe
   *
   * setPaymentProvider("paypal");
   * checkout().processPayment(100); // Uses PayPal (no restart needed!)
   * ```
   *
   * @example Testing with Mocks
   * ```ts
   * // In tests - override with mocks
   * beforeEach(() => {
   *   logic.provide(storageProvider, () => ({
   *     get: vi.fn().mockResolvedValue("mock-token"),
   *     set: vi.fn().mockResolvedValue(undefined),
   *     remove: vi.fn().mockResolvedValue(undefined),
   *   }));
   * });
   *
   * afterEach(() => logic.clear()); // Reset all overrides
   * ```
   */
  export function abstract<T extends object>(name: string): AbstractLogic<T> {
    /** Cache for stub functions (created once per property) */
    const stubCache = new Map<string | symbol, (...args: any[]) => any>();

    /**
     * Internal utility: Try to use override, otherwise use fallback or throw.
     * @param context - Error context (e.g., property name)
     * @param fn - Function to call with override if available
     * @param fallback - Optional fallback if no override (if omitted, throws NotImplementedError)
     */
    const withOverride = <R>(
      context: string,
      fn: (override: T) => R,
      fallback?: () => R
    ): R => {
      const resolver = globalResolvers.get(lg as unknown as Logic<T>);
      if (resolver) {
        return fn(resolver() as T);
      }
      if (fallback) {
        return fallback();
      }
      throw new NotImplementedError(name, context);
    };

    /**
     * Create a cached stub function that throws NotImplementedError when invoked.
     * The function either calls the override (if available) or throws.
     */
    const getStub = (prop: string | symbol): ((...args: any[]) => any) => {
      if (!stubCache.has(prop)) {
        const stub = (...args: any[]): any =>
          withOverride(
            String(prop),
            (override) => {
              const method = (override as any)[prop];
              if (typeof method === "function") {
                return method(...args);
              }
              throw new NotImplementedError(name, String(prop));
            }
            // No fallback - throws NotImplementedError
          );
        stubCache.set(prop, stub);
      }
      return stubCache.get(prop)!;
    };

    /**
     * Create a readonly proxy with cached function stubs.
     * - Only function properties are exposed
     * - Stubs throw NotImplementedError when invoked (before override)
     * - Set operations always throw TypeError
     */
    const createProxy = (): AbstractLogicInstance<T> => {
      return new Proxy({} as AbstractLogicInstance<T>, {
        get(_, prop) {
          // Allow symbol access for type checks
          if (typeof prop === "symbol") {
            return undefined;
          }

          return withOverride(
            String(prop),
            (override) => {
              const value = (override as any)[prop];
              // Only return function properties (matches AbstractLogicInstance type)
              return typeof value === "function" ? value : undefined;
            },
            () => getStub(prop) // Fallback: return cached stub
          );
        },

        set(_, prop) {
          // Always throw - abstract logic is readonly
          throw new TypeError(
            `Cannot set property "${String(
              prop
            )}" on abstract logic "${name}". ` +
              `Abstract logics are readonly. Use logic.provide() to provide an implementation.`
          );
        },

        deleteProperty(_, prop) {
          throw new TypeError(
            `Cannot delete property "${String(
              prop
            )}" on abstract logic "${name}".`
          );
        },

        defineProperty(_, prop) {
          throw new TypeError(
            `Cannot define property "${String(
              prop
            )}" on abstract logic "${name}".`
          );
        },

        has(_, prop) {
          return withOverride(
            String(prop),
            (override) => typeof (override as any)[prop] === "function",
            () => typeof prop === "string" // Fallback: pretend functions exist
          );
        },

        ownKeys() {
          return withOverride(
            "ownKeys",
            (override) =>
              Object.keys(override).filter(
                (key) => typeof (override as any)[key] === "function"
              ),
            () => [] // Fallback: empty array
          );
        },

        getOwnPropertyDescriptor(_, prop) {
          return withOverride(
            String(prop),
            (override) => {
              if (typeof (override as any)[prop] === "function") {
                return {
                  configurable: true,
                  enumerable: true,
                  value: (override as any)[prop],
                  writable: false,
                };
              }
              return undefined;
            },
            () =>
              typeof prop === "string"
                ? {
                    configurable: true,
                    enumerable: true,
                    value: getStub(prop),
                    writable: false,
                  }
                : undefined
          );
        },
      });
    };

    /**
     * Get proxy singleton (creates if not exists).
     */
    const getProxy = once(createProxy);

    /**
     * The abstract logic object - callable for singleton access.
     * Always returns the same readonly proxy instance.
     */
    const lg = Object.assign(getProxy, {
      [LOGIC_TYPE]: true as const,
      displayName: name,
      // Note: No create() method for abstract logics
    });

    return lg as AbstractLogic<T>;
  }
}
