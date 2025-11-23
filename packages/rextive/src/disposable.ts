import { Disposable, UnionToIntersection } from "./types";

/**
 * Error thrown when one or more services fail to dispose.
 * Contains all errors that occurred during disposal.
 */
export class DisposalAggregateError extends Error {
  constructor(public errors: Error[], message: string) {
    super(message);
    this.name = "DisposalAggregateError";
  }
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
  T extends Record<string, any>[] | Record<string, any>
>(disposables: T, options?: CombineDisposablesOptions): any {
  const { merge = "overwrite", onBefore, onAfter } = options || {};

  // Track disposal state
  let disposed = false;

  // Detect if input is array or object
  const isArray = Array.isArray(disposables);
  const serviceEntries: Array<[string | number, any]> = isArray
    ? disposables.map((service, index) => [index, service])
    : Object.entries(disposables);

  // Create combined service
  const combined: any = {};
  const seenProperties = new Set<string>();

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
  }

  // Create unified dispose method
  combined.dispose = () => {
    if (disposed) {
      console.warn("disposable: Already disposed, ignoring");
      return;
    }

    disposed = true;

    // Call onBefore
    onBefore?.();

    const errors: Error[] = [];

    // Dispose in REVERSE order (LIFO - like cleanup stacks)
    for (let i = serviceEntries.length - 1; i >= 0; i--) {
      const [key, service] = serviceEntries[i];

      if (!service || typeof service !== "object") continue;

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
  };

  return combined;
}

export function tryDispose(disposable: unknown) {
  if (typeof disposable === "object" && disposable && "dispose" in disposable) {
    if (typeof disposable.dispose === "function") {
      disposable.dispose();
    } else if (Array.isArray(disposable.dispose)) {
      for (const item of disposable.dispose) {
        tryDispose(item);
      }
    } else {
      tryDispose(disposable.dispose);
    }
  }
}
