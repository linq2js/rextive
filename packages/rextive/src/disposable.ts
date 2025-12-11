import { Disposable, ExDisposable, UnionToIntersection } from "./types";
import { once } from "./utils/once";

/**
 * Error thrown when one or more services fail to dispose.
 * Contains all errors that occurred during disposal.
 */
export class DisposalAggregateError extends Error {
  constructor(
    public errors: Error[],
    message: string
  ) {
    super(message);
    this.name = "DisposalAggregateError";
  }
}

/**
 * Error thrown when trying to dispose a protected singleton.
 */
export class SingletonDisposeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SingletonDisposeError";
  }
}

// ============================================================================
// Singleton Dispose Protection
// ============================================================================

/**
 * WeakSet of protected singleton dispose methods.
 * These cannot be disposed via tryDispose() - only via unregisterSingletonDispose().
 */
const protectedSingletonDisposes = new WeakSet<VoidFunction>();

/**
 * Register a dispose method as a protected singleton.
 * Protected disposes will throw SingletonDisposeError when tryDispose() is called.
 *
 * Use this for global logic singletons that should not be disposed by local scopes.
 *
 * @param dispose - The dispose method to protect
 *
 * @example
 * ```ts
 * const singleton = create();
 * registerSingletonDispose(singleton.dispose);
 *
 * tryDispose(singleton); // ❌ Throws SingletonDisposeError
 * ```
 */
export function registerSingletonDispose(dispose: VoidFunction): void {
  protectedSingletonDisposes.add(dispose);
}

/**
 * Unregister a dispose method from singleton protection.
 * After unregistering, the dispose can be called normally.
 *
 * Call this before disposing singletons in logic.clear() for test cleanup.
 *
 * @param dispose - The dispose method to unprotect
 *
 * @example
 * ```ts
 * // In logic.clear():
 * unregisterSingletonDispose(singleton.dispose);
 * singleton.dispose(); // ✅ Now allowed
 * ```
 */
export function unregisterSingletonDispose(dispose: VoidFunction): void {
  protectedSingletonDisposes.delete(dispose);
}

/**
 * Check if a dispose method is registered as a protected singleton.
 *
 * @param dispose - The dispose method to check
 * @returns true if the dispose is protected
 */
export function isSingletonDispose(dispose: VoidFunction): boolean {
  return protectedSingletonDisposes.has(dispose);
}

/**
 * Property merge strategy for combining disposables.
 * - "overwrite": Later services overwrite earlier ones (default)
 * - "error": Throw error if properties conflict
 */
export type PropertyMergeStrategy = "overwrite" | "error";

/**
 * Options for combining disposables.
 */
export type CombineDisposablesOptions = {
  /**
   * Merge strategy for conflicting properties (default: "overwrite")
   * - "overwrite": Later services overwrite earlier ones
   * - "error": Throw error if properties conflict
   */
  merge?: PropertyMergeStrategy;

  /**
   * Called before disposing all services
   */
  onBefore?: VoidFunction;

  /**
   * Called after disposing all services (even if errors occurred)
   */
  onAfter?: VoidFunction;
};

/**
 * Combines multiple disposable services into one.
 *
 * Features:
 * - Merges all service properties (excluding dispose)
 * - Creates unified dispose() that calls all disposals in reverse order (LIFO)
 * - Handles disposal errors gracefully - collects all errors and throws DisposeAggregateError
 * - Supports lifecycle callbacks (onBefore, onAfter)
 * - Two merge strategies: "overwrite" (default) or "error"
 *
 * @param disposables - Array or object of disposable services to combine
 * @param options - Combination options
 * @returns Combined service with unified dispose() method
 *
 * @example Array shape (merges properties)
 * ```ts
 * const logger = { log: () => {}, dispose: () => {} }
 * const db = { query: () => {}, dispose: () => {} }
 *
 * const services = disposable([logger, db])
 * services.log()    // ✅ Works
 * services.query()  // ✅ Works
 * services.dispose() // Calls db.dispose(), then logger.dispose()
 * ```
 *
 * @example Object shape (preserves property names)
 * ```ts
 * const services = disposable({
 *   auth: new AuthService(),
 *   api: new ApiService(),
 * })
 *
 * services.auth.login()  // ✅ Access by name
 * services.api.get('/data')  // ✅ Access by name
 * services.dispose() // Calls api.dispose(), then auth.dispose()
 * ```
 *
 * @example With merge strategy "error"
 * ```ts
 * const s1 = { save: () => 1, dispose: () => {} }
 * const s2 = { save: () => 2, dispose: () => {} }
 *
 * disposable([s1, s2], { merge: "error" })
 * // ❌ Throws: Property conflict: 'save' exists in multiple services
 * ```
 *
 * @example With lifecycle callbacks
 * ```ts
 * const services = disposable([logger, db], {
 *   onBefore: () => console.log('Cleaning up...'),
 *   onAfter: () => console.log('Done!'),
 * })
 * ```
 */

// Overload 1: Array shape - merges all properties
export function disposable<const T extends object[]>(
  disposables: T,
  options?: CombineDisposablesOptions
): Disposable & UnionToIntersection<T[number]>;

// Overload 2: Object shape - preserves property names
export function disposable<const T extends object>(
  disposables: T,
  options?: CombineDisposablesOptions
): Disposable & T;

// Implementation
export function disposable<
  T extends Record<string, any>[] | Record<string, any>,
>(disposables: T, options?: CombineDisposablesOptions): any {
  const { merge = "overwrite", onBefore, onAfter } = options || {};

  // Detect if input is array or object
  const isArray = Array.isArray(disposables);
  const serviceEntries: Array<[string | number, any]> = isArray
    ? disposables.map((service, index) => [index, service])
    : Object.entries(disposables);

  // Create combined service
  const combined: any = {};
  const seenProperties = new Set<string>();
  let respectDispose: ExDisposable["dispose"];

  if (isArray) {
    // Array shape: Merge all properties from all services
    for (const [, service] of serviceEntries) {
      if (!service || typeof service !== "object") continue;

      for (const [key, value] of Object.entries(service)) {
        if (key === "dispose") continue; // Skip dispose, we'll create our own

        // Check for conflicts if merge strategy is "error"
        if (merge === "error" && seenProperties.has(key)) {
          throw new Error(
            `Property conflict: '${key}' exists in multiple services. ` +
              `Use merge strategy "overwrite" or ensure unique property names.`
          );
        }

        seenProperties.add(key);
        combined[key] = value;
      }
    }
  } else {
    // Object shape: Preserve property names
    for (const [key, service] of serviceEntries) {
      if (key === "dispose") continue; // Skip dispose, we'll create our own
      combined[key] = service;
    }
    if (disposables.dispose) {
      respectDispose = disposables.dispose;
    }
  }

  // Create unified dispose method
  combined.dispose = once(() => {
    if (respectDispose) {
      // Handle dispose being a function, array, or object with dispose
      if (typeof respectDispose === "function") {
        respectDispose();
      } else if (Array.isArray(respectDispose)) {
        for (const item of respectDispose) {
          tryDispose(item);
        }
      } else {
        tryDispose(respectDispose);
      }
      return;
    }

    // Call onBefore
    onBefore?.();

    const errors: Error[] = [];

    // Dispose in REVERSE order (LIFO - like cleanup stacks)
    for (let i = serviceEntries.length - 1; i >= 0; i--) {
      const [key, service] = serviceEntries[i];

      if (!service) continue;

      try {
        tryDispose(service);
      } catch (error) {
        if (error instanceof DisposalAggregateError) {
          errors.push(...error.errors);
        } else {
          const message =
            error instanceof Error ? error.message : String(error);
          const identifier = isArray ? `index ${key}` : `key '${String(key)}'`;
          const wrappedError = new Error(
            `Failed to dispose service at ${identifier}: ${message}`
          );
          // Attach original error for debugging
          (wrappedError as any).cause = error;
          errors.push(wrappedError);
        }
      }
    }

    // Call onAfter (even if errors occurred)
    onAfter?.();

    // Throw if any errors occurred
    if (errors.length > 0) {
      throw new DisposalAggregateError(
        errors,
        `Failed to dispose ${errors.length} service(s)`
      );
    }
  });

  return combined;
}

/**
 * When to call the original dispose method.
 * - "before": Call originalDispose before customDispose
 * - "after": Call originalDispose after customDispose
 * - "manual": Don't auto-call, customDispose receives originalDispose to call manually
 */
export type WrapDisposeWhen = "before" | "after" | "manual";

/**
 * Wraps custom dispose logic into an object that may have a dispose method.
 *
 * This utility simplifies the common pattern of overriding dispose methods
 * to add custom cleanup logic while preserving the original dispose behavior.
 *
 * @param target - The object to wrap dispose on
 * @param customDispose - Custom dispose function (or function that returns custom dispose for "manual" mode)
 * @param when - When to call original dispose: "before", "after", or "manual" (default: "after")
 * @returns A function that returns true if the target has been disposed
 *
 * @example
 * ```ts
 * // "after" mode (default) - original dispose called after custom
 * const disposed = wrapDispose(result, () => {
 *   cleanup.emitAndClear();
 *   internal.dispose();
 * });
 * // Execution: customDispose() -> originalDispose()
 * ```
 *
 * @example
 * ```ts
 * // "before" mode - original dispose called before custom
 * const disposed = wrapDispose(result, () => {
 *   // originalDispose already called
 *   doFinalCleanup();
 * }, "before");
 * // Execution: originalDispose() -> customDispose()
 * ```
 *
 * @example
 * ```ts
 * // "manual" mode - you control when to call original
 * const disposed = wrapDispose(result, (originalDispose) => () => {
 *   cleanup.emitAndClear();
 *   internal.dispose();
 *   originalDispose(); // Call manually
 * }, "manual");
 * ```
 */
export function wrapDispose<T extends { dispose?: VoidFunction }>(
  target: T,
  customDispose:
    | ((originalDispose: VoidFunction) => void)
    | readonly (VoidFunction | Disposable | ExDisposable)[],
  when?: WrapDisposeWhen
): () => boolean {
  let disposed = false;

  const originalDispose =
    typeof target.dispose === "function" ? target.dispose.bind(target) : noop;

  const finalDispose = () => {
    if (disposed) return;
    disposed = true;
    if (when === "before") {
      originalDispose();
    }
    if (Array.isArray(customDispose)) {
      for (const item of customDispose) {
        if (typeof item === "function") {
          item();
        } else {
          tryDispose(item);
        }
      }
    } else if (typeof customDispose === "function") {
      customDispose(originalDispose);
    }
    if (when === "after") {
      originalDispose();
    }
  };

  target.dispose = finalDispose;

  return () => disposed;
}

/**
 * A no-operation function.
 */
export const noop: VoidFunction = () => {};

/**
 * Options for tryDispose behavior.
 */
export interface TryDisposeOptions {
  /**
   * If true, silently skips protected singletons instead of throwing.
   * Use this in cleanup code (like useScope unmount) where you want to
   * protect singletons from accidental disposal.
   *
   * Default: false (throws SingletonDisposeError on protected singletons)
   */
  skipSingletons?: boolean;
}

/**
 * Safely attempts to dispose a value if it has a dispose mechanism.
 *
 * Handles multiple dispose patterns:
 * - `{ dispose(): void }` - Calls dispose() method
 * - `{ dispose: Disposable[] }` - Recursively disposes each item
 * - `{ dispose: Disposable }` - Recursively disposes the nested disposable
 *
 * **Singleton Protection**: If a dispose method was registered via
 * `registerSingletonDispose()`:
 * - Default: Throws `SingletonDisposeError`
 * - With `{ skipSingletons: true }`: Silently skips (used by useScope cleanup)
 *
 * Use `unregisterSingletonDispose()` first if you need to dispose it
 * (e.g., in `logic.clear()` for test cleanup).
 *
 * Does nothing if the value is not disposable (no errors thrown).
 *
 * @param disposable - Any value that might be disposable
 * @param options - Optional behavior configuration
 * @returns Array of all objects that were disposed
 *
 * @example
 * ```ts
 * // Method pattern
 * tryDispose({ dispose: () => console.log('cleaned up') });
 *
 * // Array pattern
 * tryDispose({ dispose: [signal1, signal2, signal3] });
 *
 * // Nested pattern
 * tryDispose({ dispose: { dispose: () => cleanup() } });
 *
 * // Safe on non-disposables (no-op)
 * tryDispose(null);
 * tryDispose(42);
 * tryDispose({ name: 'not disposable' });
 *
 * // Protected singleton - throws by default
 * registerSingletonDispose(singleton.dispose);
 * tryDispose(singleton); // ❌ SingletonDisposeError
 *
 * // Protected singleton - skip explicitly (used by useScope)
 * tryDispose(singleton, { skipSingletons: true }); // ✅ Silently skipped
 * ```
 */
export function tryDispose(
  disposable: unknown,
  options?: TryDisposeOptions
): object[] {
  const disposedObjects = new Set<object>();
  const skipSingletons = options?.skipSingletons ?? false;

  const dispose = (d: unknown) => {
    if (
      (typeof d === "object" || typeof d === "function") &&
      d &&
      "dispose" in d
    ) {
      if (typeof d.dispose === "function") {
        // Check if this is a protected singleton
        if (protectedSingletonDisposes.has(d.dispose as VoidFunction)) {
          if (skipSingletons) {
            return; // Silently skip - caller knows what they're doing
          }
          // Default: throw error to catch accidental singleton disposal
          throw new SingletonDisposeError(
            "Cannot dispose a singleton logic instance. " +
              "Singletons are shared globally and should not be disposed by local scopes. " +
              "If you need to reset state, use logic.clear() in tests."
          );
        }
        // Pattern: { dispose(): void }
        d.dispose();
        disposedObjects.add(d);
      } else if (Array.isArray(d.dispose)) {
        // Pattern: { dispose: Disposable[] }
        for (const item of d.dispose) {
          dispose(item);
        }
      } else {
        // Pattern: { dispose: Disposable }
        dispose(d.dispose);
      }
    }
  };
  dispose(disposable);
  return Array.from(disposedObjects);
}
