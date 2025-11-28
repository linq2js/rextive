/**
 * Mutable Signal Implementation
 *
 * This module provides the core implementation for mutable signals in Rextive.
 * Mutable signals are reactive state containers that can be directly modified
 * using the `set()` method.
 *
 * ## Key Characteristics
 *
 * - **No dependencies**: Unlike computed signals, mutable signals don't depend on other signals
 * - **Direct updates**: Values can be set directly via `set()` method
 * - **Lazy evaluation**: Optional lazy initialization (default: true)
 * - **Hydration support**: Can accept initial values from external sources
 * - **Reactive**: Automatically notifies subscribers when value changes
 *
 * ## Available Methods
 *
 * - `set()` - Update signal value (direct or via updater function)
 * - `get()` / `()` - Read current value
 * - `reset()` - Reset to initial value
 * - `hydrate()` - Set value from external source (skips if already modified)
 * - `refresh()` - Force recomputation (batched)
 * - `stale()` - Mark as stale (recompute on next access)
 * - `on()` - Subscribe to changes
 * - `dispose()` - Clean up resources
 *
 * @module createMutableSignal
 */

import { Emitter, emitter } from "./utils/emitter";
import { guardDisposed } from "./utils/guardDisposed";
import {
  Mutable,
  SignalContext,
  SignalMap,
  SignalOptions,
  HydrateStatus,
  SIGNAL_TYPE,
  UseList,
} from "./types";
import { scheduleNotification } from "./batch";
import { FallbackError } from "./common";
import { resolveEquals } from "./utils/resolveEquals";
import { pipeSignals } from "./utils/pipeSignals";
import { createComputedSignal } from "./createComputedSignal";
import { createSignalContext } from "./createSignalContext";
import { attacher } from "./attacher";
import { getCurrent } from "./contextDispatcher";
import { nextName } from "./utils/nameGenerator";

/**
 * Create a mutable signal instance
 *
 * Internal factory function that creates mutable signals. Mutable signals are
 * reactive state containers that can be directly modified and don't have dependencies
 * on other signals.
 *
 * @param deps - Always empty {} for mutable signals (no dependencies)
 * @param fn - Factory function to compute initial value (receives SignalContext)
 * @param options - Signal configuration options
 * @param initialValue - Optional initial value wrapper { value: T }
 * @param createContext - Context factory function for signal lifecycle management
 * @returns A fully-configured MutableSignal instance
 *
 * @internal This is an internal function used by the public signal() API
 */
export function createMutableSignal(
  deps: SignalMap, // Always empty {} for mutable signals
  fn: (context: SignalContext) => any,
  options: SignalOptions<any> = {},
  initialValue: { value: any } | undefined,
  createContext: (
    deps: SignalMap,
    onCleanup: Emitter,
    onDepChange: VoidFunction,
    onRefresh?: () => void,
    onStale?: () => void
  ) => any
): Mutable<any> {
  // ============================================================================
  // 1. CONFIGURATION & SETUP
  // ============================================================================

  // Extract and destructure signal options
  const {
    equals: equalsOption, // Equality function for change detection
    name, // Debug name for the signal
    fallback, // Fallback value generator on error
    onChange: onChangeCallbacks, // User-provided change callbacks
    onError: onErrorCallbacks, // User-provided error callbacks
    lazy = true, // Lazy evaluation flag (default: true)
    use = [], // Plugins/tags to attach to this signal
  } = options as SignalOptions<any> & { use?: UseList<any, "mutable"> };

  // Resolve equals option to actual comparison function
  // Supports: "strict", "shallow", "deep", custom function, or defaults to Object.is
  const equals = resolveEquals(equalsOption) || Object.is;

  // Generate display name: use provided name or auto-generate for devtools
  const displayName = name ?? nextName("mutable");

  // ============================================================================
  // 2. EVENT EMITTERS
  // ============================================================================

  // Core change notification emitter (no value passed)
  const onChange = emitter<void>();

  // Value-specific change emitter (passes new value to listeners)
  const onChangeValue = emitter<any>();
  if (onChangeCallbacks) {
    onChangeValue.on(onChangeCallbacks);
  }
  // Notify devtools on value change (only subscribe if devtools is enabled)
  if (globalThis.__REXTIVE_DEVTOOLS__) {
    onChangeValue.on((value) => {
      globalThis.__REXTIVE_DEVTOOLS__?.onSignalChange?.(instanceRef!, value);
    });
  }

  // Error emitter (passes error to listeners)
  const onErrorValue = emitter<unknown>();
  if (onErrorCallbacks) {
    onErrorValue.on(onErrorCallbacks);
  }

  // Cleanup emitter (triggered on recomputation)
  const onCleanup = emitter<void>();

  // Disposal emitter (triggered once on final disposal)
  const onDispose = emitter<void>();

  // ============================================================================
  // 3. STATE MANAGEMENT
  // ============================================================================

  /**
   * Current value/error state
   * - undefined = not yet computed (lazy)
   * - { value: T } = computed successfully
   * - { value: T, error: E } = error occurred (may have fallback value)
   */
  let current: { value: any; error?: unknown } | undefined = initialValue;

  /** Disposal flag - once true, signal cannot be recomputed */
  let disposed = false;

  /** Signal context for lifecycle management */
  let context: ReturnType<typeof createContext> | undefined;

  /** Reference to the signal instance being created */
  let instanceRef: Mutable<any> | undefined;

  /**
   * Tracks if signal has been modified via set()
   * Used by hydrate() to determine if external value should be applied
   */
  let hasBeenModified = false;

  /**
   * Refresh batching flag
   * Prevents multiple synchronous refresh() calls from triggering multiple recomputations
   */
  let refreshScheduled = false;

  // ============================================================================
  // 4. LIFECYCLE METHODS
  // ============================================================================

  /** Check if signal has been disposed */
  const isDisposed = () => disposed;

  /**
   * Dispose the signal and clean up all resources
   *
   * This method:
   * 1. Disposes the signal context
   * 2. Emits cleanup events
   * 3. Clears all event listeners
   * 4. Marks signal as disposed (prevents further operations)
   *
   * Once disposed, the signal cannot be used anymore and will throw errors
   * if any mutating methods are called.
   */
  const dispose = () => {
    // Guard against double disposal
    if (disposed) return;

    // Dispose context (cleans up internal resources)
    context?.dispose();

    // Emit cleanup and disposal events
    onCleanup.emitAndClear();
    onDispose.emitAndClear();

    // Double-dispose context as safety measure
    context?.dispose();

    // Mark as disposed
    disposed = true;
    context = undefined;

    // Clear change listeners
    onChange.clear();

    // Notify devtools
    globalThis.__REXTIVE_DEVTOOLS__?.onSignalDispose?.(instanceRef!);
  };

  /**
   * Recompute the signal value
   *
   * This is the core computation function that:
   * 1. Cleans up previous context
   * 2. Creates new context
   * 3. Executes the factory function
   * 4. Handles errors and fallback values
   * 5. Notifies subscribers if value changed
   *
   * Called by:
   * - get() on first access (if lazy)
   * - refresh() to force recomputation
   * - reset() after clearing to initial value
   * - context.refresh() and context.stale() callbacks
   */
  const recompute = () => {
    // Safety check - cannot recompute disposed signal
    if (disposed) {
      throw new Error("Cannot recompute disposed signal");
    }

    // Clean up previous computation
    onCleanup.emitAndClear();
    context?.dispose();

    // Create new context for this computation
    context = createContext(
      deps, // Empty {} for mutable signals
      onCleanup, // Cleanup emitter
      recompute, // Called when deps change (never for mutable)
      () => recompute(), // onRefresh callback
      () => {
        current = undefined; // onStale callback - mark for lazy recompute
      }
    );

    try {
      // Execute factory function to compute value
      const result = fn(context);

      // Check if value actually changed
      const hadError = current?.error; // Had error before = always changed
      const changed = hadError || !equals(current?.value, result);

      // Update current state if changed
      if (changed) {
        current = { value: result };
      }

      // Notify subscribers (batched)
      if (changed) {
        scheduleNotification(() => {
          onChangeValue.emit(result);
          onChange.emit();
        });
      }
    } catch (error) {
      // Emit error event for error handlers
      onErrorValue.emit(error);

      // Try fallback if provided
      if (fallback) {
        try {
          const fallbackValue = fallback(error);
          const changed =
            current?.error || !equals(current?.value, fallbackValue);

          if (changed) {
            current = { value: fallbackValue };
            scheduleNotification(() => {
              onChangeValue.emit(fallbackValue);
              onChange.emit();
            });
          }
        } catch (fallbackError) {
          // Fallback itself failed - store both errors
          current = {
            error: new FallbackError(error, fallbackError, displayName),
            value: undefined,
          };
          // Don't throw - just store error state
        }
      } else {
        // No fallback - store error
        current = { error, value: undefined };
        // Don't throw - just store error state
      }
    } finally {
      // Mark computation as complete
      // Allows context.refresh() and context.stale() to be called safely
      context._endComputing();
    }
  };

  /**
   * Get current signal value
   *
   * - Lazily computes on first access (if lazy: true)
   * - Throws if signal has error state
   * - Can be called even after disposal (returns last value)
   *
   * This method is both:
   * - A standalone function: signal.get()
   * - The call signature of the signal: signal()
   */
  const get = () => {
    getCurrent().trackSignal(instance);
    // Lazy evaluation: compute on first access
    // Allow reading last value even after disposal (but don't recompute)
    if (!current && !disposed) {
      recompute();
    }

    // Throw error if signal has error state
    if (current?.error) {
      throw current.error;
    }

    // Return current value (non-null assertion safe due to recompute above)
    return current!.value;
  };

  // ============================================================================
  // 5. MUTABLE SIGNAL METHODS
  // ============================================================================

  /**
   * Reset signal to its initial value
   *
   * This method:
   * 1. Clears the modified flag
   * 2. Restores initial value
   * 3. Recomputes (re-runs factory function)
   * 4. Notifies subscribers if value changed
   *
   * Guarded: throws if signal is disposed
   */
  const reset = guardDisposed(
    isDisposed,
    "Cannot reset disposed signal",
    () => {
      const prevValue = current?.value;
      current = initialValue; // Restore initial value wrapper
      hasBeenModified = false; // Clear modified flag (allows hydrate again)

      // Recompute to get new value from factory function
      recompute();

      // Notify only if value actually changed or there's an error
      if (!current || current.error || !equals(prevValue, current.value)) {
        scheduleNotification(() => onChange.emit());
      }
    }
  );

  /**
   * Set signal value
   *
   * Accepts either:
   * - Direct value: set(newValue)
   * - Updater function: set(prev => newValue)
   *
   * Features:
   * - Equality check (no notification if value unchanged)
   * - Batched notifications
   * - Marks signal as modified (affects hydrate)
   *
   * Guarded: throws if signal is disposed
   */
  const set = guardDisposed(
    isDisposed,
    "Cannot set value on disposed signal",
    (value: any) => {
      // Handle updater function vs direct value
      const next = typeof value === "function" ? value(get()) : value;

      // Skip if value unchanged (optimization)
      if (equals(current?.value, next)) return;

      // Mark as modified (prevents future hydration)
      hasBeenModified = true;

      // Update current state
      current = { value: next };

      // Notify subscribers (batched)
      scheduleNotification(() => {
        onChangeValue.emit(next);
        onChange.emit();
      });
    }
  );

  /**
   * Subscribe to signal changes
   *
   * - Returns unsubscribe function
   * - If signal has dependencies and no current value, triggers computation
   *
   * @param listener - Callback invoked on every change (receives no arguments)
   * @returns Unsubscribe function
   */
  const on = (listener: VoidFunction) => {
    // Eager computation for signals with dependencies (mutable signals have empty deps)
    if (!current && Object.keys(deps).length > 0) {
      get();
    }
    return onChange.on(listener);
  };

  /**
   * Hydrate signal with external value
   *
   * Used for persistence/SSR: sets initial value from external source.
   *
   * Behavior:
   * - Skips if signal has been modified via set() (user changes take precedence)
   * - Applies value and clears modified flag (so future hydrate can work)
   * - Returns "success" or "skipped" status
   *
   * @param value - Value to hydrate with
   * @returns "success" if applied, "skipped" if already modified
   */
  const hydrate = (value: any): HydrateStatus => {
    if (hasBeenModified) {
      // Already modified (via set), skip hydration
      // User changes take precedence over external values
      return "skipped";
    }
    // Not modified yet, apply hydration
    set(value);
    // Reset flag - hydration doesn't count as user modification
    // This allows future hydrate() calls to work if needed
    hasBeenModified = false;
    return "success";
  };

  // ============================================================================
  // 6. TRANSFORMATION & COMPOSITION
  // ============================================================================

  /**
   * Pipe signal through operators
   *
   * Enables composing transformations like:
   * signal.pipe(filter(...), select(...), scan(...))
   *
   * @param operators - Array of operator functions
   * @returns New signal with transformations applied
   */
  const pipe = function (...operators: Array<(source: any) => any>): any {
    return pipeSignals(instance, operators);
  };

  /**
   * Transform signal value with chained selectors.
   *
   * Creates a computed signal that derives from this signal.
   * Supports 1-10 selectors chained together (left-to-right).
   *
   * @param selectors - Functions to transform value (chained left-to-right)
   * @param options - Optional equality strategy or signal options
   * @returns New computed signal with transformed value
   *
   * @example Single selector
   * const count = signal(0);
   * const doubled = count.to(x => x * 2);
   *
   * @example Multiple selectors
   * const greeting = user.to(
   *   u => u.name,
   *   name => name.toUpperCase(),
   *   name => `Hello, ${name}!`
   * );
   *
   * @example With options
   * const user = count.to(x => ({ value: x }), "shallow");
   */
  const to = function (
    first: (value: any, context: SignalContext) => any,
    ...rest: any[]
  ): any {
    // Check if last argument is options (not a function)
    const lastArg = rest[rest.length - 1];
    const hasOptions =
      rest.length > 0 && lastArg !== undefined && typeof lastArg !== "function";
    const opts = hasOptions ? resolveToOptions(lastArg) : {};
    const selectors = hasOptions ? rest.slice(0, -1) : rest;

    if (selectors.length === 0) {
      // Single selector - pass context
      return createComputedSignal(
        { source: instance } as any,
        (ctx: any) => first(ctx.deps.source, ctx),
        opts,
        createSignalContext,
        undefined
      );
    }

    // Multiple selectors - chain them left-to-right, all receive context
    return createComputedSignal(
      { source: instance } as any,
      (ctx: any) => {
        let result = first(ctx.deps.source, ctx);
        for (const selector of selectors) {
          result = selector(result, ctx);
        }
        return result;
      },
      opts,
      createSignalContext,
      undefined
    );
  };

  /** Convert ToOptions to SignalOptions */
  function resolveToOptions(options: any): any {
    if (typeof options === "string") {
      return { equals: options };
    }
    return options || {};
  }

  // ============================================================================
  // 7. REFRESH & STALE MANAGEMENT
  // ============================================================================

  /**
   * Force immediate recomputation
   *
   * Features:
   * - Batches multiple synchronous refresh() calls
   * - Uses queueMicrotask for efficient batching
   * - Useful for forcing updates without changing dependencies
   *
   * Guarded: throws if signal is disposed
   */
  const refresh = guardDisposed(
    isDisposed,
    "Cannot refresh disposed signal",
    () => {
      // Batch multiple refresh calls into a single recomputation
      if (refreshScheduled) return; // Already scheduled

      refreshScheduled = true;
      // Use queueMicrotask to batch multiple synchronous refresh() calls
      queueMicrotask(() => {
        if (!refreshScheduled) return; // Already processed
        refreshScheduled = false;
        recompute();
      });
    }
  );

  /**
   * Mark signal as stale (lazy recomputation)
   *
   * Clears current value, forcing recomputation on next access.
   * Unlike refresh(), this is lazy - doesn't compute immediately.
   *
   * Use cases:
   * - Cache invalidation
   * - Marking data as potentially outdated
   * - Deferring expensive recomputations
   *
   * Guarded: throws if signal is disposed
   */
  const stale = guardDisposed(
    isDisposed,
    "Cannot mark disposed signal as stale",
    () => {
      // Mark signal as stale - will recompute on next access
      current = undefined;
    }
  );

  // ============================================================================
  // 8. REACTIVE RELATIONSHIPS (when)
  // ============================================================================

  // ============================================================================
  // 9. SIGNAL INSTANCE CREATION
  // ============================================================================

  /**
   * Create the signal instance
   *
   * The signal is a callable function (get) with additional methods attached.
   * This allows both signal() and signal.get() syntax.
   */
  const instance = Object.assign(get, {
    // Type marker for runtime type checking
    [SIGNAL_TYPE]: true,

    // Debug name for development/debugging
    displayName,

    // Core methods
    get, // Read value
    on, // Subscribe to changes
    dispose, // Clean up resources
    disposed: isDisposed, // Check if disposed

    // Mutable-specific methods
    set, // Update value
    reset, // Reset to initial value

    // Serialization
    toJSON: get, // JSON.stringify support

    // Persistence
    hydrate, // Set value from external source

    // Transformation
    pipe, // Compose operators
    to, // Transform (shorthand)

    // Lifecycle
    refresh, // Force recomputation
    stale, // Mark for lazy recomputation
  });

  // Store reference for use in methods above
  instanceRef = instance as unknown as Mutable<any>;

  // ============================================================================
  // 10. INITIALIZATION
  // ============================================================================

  // Attach plugins and tags
  // This must happen after instance is created so plugins can access it
  attacher(instanceRef, onDispose).attach(use);

  // Notify devtools of signal creation
  globalThis.__REXTIVE_DEVTOOLS__?.onSignalCreate?.(instanceRef);

  // Eager evaluation if not lazy
  if (!lazy) {
    instance.get();
  }

  return instance as unknown as Mutable<any>;
}
