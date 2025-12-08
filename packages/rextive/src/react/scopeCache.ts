import { tryDispose } from "../disposable";
import { AnyFunc } from "../types";
import { resolveLogicFactory } from "./resolveLogicFactory";
import { emitter } from "../utils/emitter";
import { emit, withHooks } from "../hooks";
import { dev } from "../utils/dev";
import { stableEquals } from "../utils/stableEquals";
/**
 * A cache entry that manages the lifecycle of a scope instance.
 *
 * Handles:
 * - Reference counting via commit/uncommit
 * - Automatic disposal when refs reach 0
 * - Deferred disposal via microtask (for StrictMode compatibility)
 * - Signal cleanup on dispose
 *
 * ## Lifecycle
 *
 * 1. Entry is created with refs=0
 * 2. `scheduleDisposal()` schedules a microtask to check refs
 * 3. `commit()` is called from useLayoutEffect, incrementing refs
 * 4. Microtask runs - if refs > 0, entry survives
 * 5. On unmount, `uncommit()` decrements refs and schedules disposal if refs=0
 *
 * ## StrictMode Handling
 *
 * In React StrictMode, components render twice but only commit once:
 * - Render 1: creates entry, schedules microtask
 * - Render 2: reuses entry (same key)
 * - Commit: useLayoutEffect calls commit(), refs=1
 * - Microtask: refs=1, entry survives ✅
 *
 * If component never commits (error/suspense):
 * - Render: creates entry, schedules microtask
 * - No commit (error thrown)
 * - Microtask: refs=0, entry disposed ✅
 */
export class ScopeEntry {
  /** Number of components currently using this entry */
  refs = 0;

  /** Whether this entry has been disposed */
  disposed = false;

  /**
   * @param scope - The scope object created by the factory
   * @param args - Arguments used to create this scope (for comparison)
   * @param onDispose - Callback to dispose tracked signals
   */
  constructor(
    public readonly key: unknown,
    public readonly scope: any,
    public readonly args: unknown[],
    public readonly onDispose: VoidFunction
  ) {}

  /**
   * Schedule disposal check via microtask.
   *
   * Microtask timing ensures:
   * - Runs AFTER useLayoutEffect (which is sync during commit)
   * - Allows commit() to be called before disposal check
   */
  scheduleDisposal = () => {
    Promise.resolve().then(this.tryDispose);
  };

  /**
   * Dispose if no active references.
   * Called by microtask after scheduleDisposal().
   */
  tryDispose = () => {
    // there are still refs, so we don't dispose
    if (this.refs) return;
    this.dispose();
  };

  /**
   * Called from useLayoutEffect to mark entry as committed.
   * Increments reference count to prevent disposal.
   */
  commit = () => {
    if (this.disposed) return;
    this.refs++;
  };

  /**
   * Called from useLayoutEffect cleanup when component unmounts
   * or key changes. Decrements refs and schedules disposal if refs=0.
   */
  uncommit = () => {
    if (this.disposed) return;
    this.refs--;
    if (this.refs === 0) {
      this.scheduleDisposal();
    }
  };

  /**
   * Dispose the entry and all tracked signals.
   *
   * In dev mode, uses emit.forgetDisposedSignals to clean up
   * signals from DevTools without leaving "disposed" markers.
   */
  dispose = () => {
    if (this.disposed) return;
    this.disposed = true;

    const doDispose = () => {
      this.onDispose(); // Dispose tracked signals
      tryDispose(this.scope); // Dispose scope's own dispose method
    };

    if (dev()) {
      emit.forgetDisposedSignals(doDispose);
    } else {
      doDispose();
    }
  };
}

/**
 * Global cache for useScope entries.
 *
 * Manages scope instances by key, handling:
 * - Creation with signal auto-tracking
 * - Args comparison for recreation
 * - Logic resolution (detects Logic and calls .create())
 * - Automatic disposal via reference counting
 *
 * ## Usage Pattern
 *
 * ```tsx
 * const cache = new ScopeCache();
 *
 * function useScope(key, factory, args, options) {
 *   const entry = cache.get(key, factory, args, options?.equals ?? Object.is);
 *
 *   useLayoutEffect(() => {
 *     entry.commit();
 *     return () => entry.uncommit();
 *   }, [entry]);
 *
 *   return entry.scope;
 * }
 * ```
 *
 * ## Key-Based Caching
 *
 * - Same key + same args = reuse existing scope
 * - Same key + different args = dispose old, create new
 * - Different key = create new scope (old disposed when uncommitted)
 *
 * ## Signal Auto-Disposal
 *
 * Signals created inside the factory are automatically tracked
 * and disposed when the entry is disposed. This prevents memory
 * leaks without requiring explicit disposal by users.
 */
export class ScopeCache {
  /** Map of key -> scope entry */
  scopes = new Map<unknown, ScopeEntry>();

  /**
   * Get or create a scope entry for the given key.
   *
   * @param key - Unique identifier for this scope
   * @param factory - Factory function (or Logic) to create the scope
   * @param args - Arguments to pass to the factory
   * @param equals - Equality function for comparing args
   * @returns The scope entry (call .commit() in useLayoutEffect)
   *
   * @example
   * ```ts
   * const entry = cache.get("user", createUserScope, [userId], Object.is);
   * // entry.scope contains the created scope
   * // entry.commit() / entry.uncommit() for lifecycle
   * ```
   */
  get = (
    key: unknown,
    factory: AnyFunc,
    args: unknown[],
    equals: (a: unknown, b: unknown) => boolean
  ) => {
    let entry = this.scopes.get(key);

    // Check if existing entry's args differ - need to recreate
    if (entry) {
      // Quick check: different args length means definitely changed
      if (entry.args.length !== args.length) {
        entry.dispose();
        this.scopes.delete(key);
        entry = undefined;
      } else {
        // Compare args and collect stable values
        let changed = false;
        const normalizedArgs: unknown[] = [];

        for (let i = 0; i < args.length; i++) {
          const [isEqual, stableValue] = stableEquals(
            entry.args[i],
            args[i],
            equals
          );
          normalizedArgs.push(stableValue);
          if (!isEqual) {
            changed = true;
          }
        }

        if (!changed) {
          // Args are equal - reuse existing entry
          return entry;
        }

        // Args changed - dispose old and recreate with normalized args
        entry.dispose();
        this.scopes.delete(key);
        entry = undefined;
        args = normalizedArgs; // Use stable values for the new entry
      }
    }

    if (!entry) {
      // Normalize args on first call - wraps functions in stable references
      const normalizedArgs = args.map((arg) => {
        const [, stableValue] = stableEquals(undefined, arg, equals);
        return stableValue;
      });

      // Resolve Logic to factory if needed (detects Logic and calls .create())
      const realFactory = resolveLogicFactory(factory) as AnyFunc;

      // Create emitter to track signals for auto-disposal
      const onDispose = emitter();

      // Create scope with signal tracking
      const scope = withHooks(
        (hooks) => ({
          ...hooks,
          onSignalCreate(signal, deps, disposalHandled) {
            if (!disposalHandled) {
              disposalHandled = true;
              onDispose.on(signal.dispose);
            }
            hooks?.onSignalCreate?.(signal, deps, disposalHandled);
          },
        }),
        () => realFactory(...normalizedArgs)
      );

      // Create entry and schedule disposal check
      // Store normalized args so subsequent stableEquals can update functions
      entry = new ScopeEntry(key, scope, normalizedArgs, () => {
        if (!entry) return;
        if (this.scopes.get(key) === entry) {
          this.scopes.delete(key);
          entry = undefined;
        }
        onDispose.emitAndClear();
      });
      entry.scheduleDisposal();
      this.scopes.set(key, entry);
    }

    return entry;
  };

  /**
   * Clear all cached scopes. Useful for testing.
   * Disposes all entries and clears the cache.
   */
  clear() {
    for (const entry of this.scopes.values()) {
      entry.dispose();
    }
    this.scopes.clear();
  }
}

export const scopeCache = new ScopeCache();
