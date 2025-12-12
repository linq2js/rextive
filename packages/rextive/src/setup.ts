/**
 * @file setup.ts
 * @description Setup utility for collecting and running effects with cleanup.
 *
 * Provides a chainable builder pattern for managing setup/teardown lifecycles.
 * Effects are collected via `.add()` and executed via `.run()`, which returns
 * a cleanup function that disposes all effects.
 *
 * ## Key Features
 *
 * - **Chainable API**: Fluent builder pattern with `.add()` and `.run()`
 * - **Per-effect triggers**: Each effect can have its own trigger (function or Observable)
 * - **Trigger args**: Pass arguments to trigger functions for reusability
 * - **Global triggers**: Gate all effects behind a single trigger
 * - **Auto-cleanup**: Returns a cleanup function that disposes all effects and triggers
 *
 * ## Trigger Types
 *
 * 1. **No trigger**: Effect runs immediately on `.run()`
 * 2. **Function trigger**: `(emit, ...args) => cleanup` - Effect runs when `emit()` is called
 * 3. **Observable trigger**: `{ on(listener): cleanup }` - Effect runs when observable emits
 *
 * ---
 *
 * @example Basic usage - effects run immediately
 * ```ts
 * const stop = setup()
 *   .add(() => {
 *     const id = setInterval(() => tick(), 1000);
 *     return () => clearInterval(id);
 *   })
 *   .add(() => signal.on(handleChange))
 *   .run();
 *
 * // Later: cleanup all effects
 * stop();
 * ```
 *
 * @example Per-effect trigger (function)
 * ```ts
 * // startTimer runs immediately, handleClick waits for click event
 * const stop = setup()
 *   .add(startTimer)
 *   .add(handleClick, (emit) => {
 *     document.addEventListener("click", emit, { once: true });
 *     return () => document.removeEventListener("click", emit);
 *   })
 *   .run();
 * ```
 *
 * @example Per-effect trigger with args
 * ```ts
 * // Reusable delay trigger with configurable timeout
 * const delayTrigger = (emit: () => void, ms: number) => {
 *   const id = setTimeout(emit, ms);
 *   return () => clearTimeout(id);
 * };
 *
 * const stop = setup()
 *   .add(step1, delayTrigger, 100)   // Runs after 100ms
 *   .add(step2, delayTrigger, 200)   // Runs after 200ms
 *   .add(step3, delayTrigger, 300)   // Runs after 300ms
 *   .run();
 * ```
 *
 * @example Per-effect trigger (Observable/Signal)
 * ```ts
 * const refreshSignal = signal<void>();
 * const stop = setup()
 *   .add(startTimer)
 *   .add(refreshData, refreshSignal)  // Runs when refreshSignal emits
 *   .run();
 *
 * // Later: trigger refresh
 * refreshSignal.set();
 * ```
 *
 * @example Global trigger (gates all effects)
 * ```ts
 * // All effects wait for 100ms delay before running
 * const stop = setup()
 *   .add(startTimer)
 *   .add(startAnimation)
 *   .run((emit) => {
 *     const id = setTimeout(emit, 100);
 *     return () => clearTimeout(id);
 *   });
 * ```
 *
 * @example Global trigger with Observable
 * ```ts
 * const startSignal = signal<void>();
 * const stop = setup()
 *   .add(startTimer)
 *   .add(startAnimation)
 *   .run(startSignal);
 *
 * // Later: start everything
 * startSignal.set();
 * ```
 *
 * @example Mixed per-effect and global triggers
 * ```ts
 * const stop = setup()
 *   .add(immediateEffect)                    // Runs when global trigger fires
 *   .add(delayedEffect, delayTrigger, 50)    // Runs 50ms after global trigger
 *   .add(signalEffect, someSignal)           // Runs when signal emits (after global)
 *   .run((emit) => {
 *     const id = setTimeout(emit, 100);      // Global trigger: 100ms delay
 *     return () => clearTimeout(id);
 *   });
 * ```
 *
 * @example Inline in logic (dispose pattern)
 * ```ts
 * function gameLogic() {
 *   const score = signal(0);
 *   const tick = () => score.set((s) => s + 1);
 *
 *   return {
 *     score,
 *     dispose: setup()
 *       .add(() => {
 *         const id = setInterval(tick, 1000);
 *         return () => clearInterval(id);
 *       })
 *       .add(() => score.on(playSound))
 *       .run(),
 *   };
 * }
 *
 * // In component
 * const $game = useScope(gameLogic); // Auto-disposed on unmount
 * ```
 *
 * @example Batch effects with array
 * ```ts
 * const stop = setup()
 *   .add([startTimer, startSubscription, playMusic])  // All run immediately
 *   .run();
 * ```
 */

import { Observable } from "./types";

// ============================================================================
// Types
// ============================================================================

/**
 * A setup function that optionally returns a cleanup function.
 *
 * @returns Optional cleanup function to be called on dispose
 *
 * @example No cleanup needed
 * ```ts
 * const fn: SetupFn = () => {
 *   console.log("Effect started");
 *   // No cleanup needed
 * };
 * ```
 *
 * @example With cleanup
 * ```ts
 * const fn: SetupFn = () => {
 *   const id = setInterval(tick, 1000);
 *   return () => clearInterval(id);  // Cleanup function
 * };
 * ```
 */
export type SetupFn = () => (() => void) | void;

/**
 * A trigger function that controls when an effect runs.
 *
 * The trigger receives an `emit` callback and optional args. Call `emit()` to
 * execute the associated effect. Optionally return a cleanup function.
 *
 * @param emit - Call this to execute the effect
 * @param args - Additional arguments passed from `.add(fn, trigger, ...args)`
 * @returns Optional cleanup function (e.g., for clearTimeout, removeEventListener)
 *
 * @example Simple timeout trigger
 * ```ts
 * const trigger: TriggerFn = (emit) => {
 *   const id = setTimeout(emit, 1000);
 *   return () => clearTimeout(id);
 * };
 * ```
 *
 * @example Trigger with args (reusable)
 * ```ts
 * const delayTrigger: TriggerFn<[number]> = (emit, ms) => {
 *   const id = setTimeout(emit, ms);
 *   return () => clearTimeout(id);
 * };
 *
 * // Usage:
 * setup().add(effect, delayTrigger, 500).run();  // 500ms delay
 * ```
 *
 * @example Event listener trigger
 * ```ts
 * const clickTrigger: TriggerFn = (emit) => {
 *   document.addEventListener("click", emit, { once: true });
 *   return () => document.removeEventListener("click", emit);
 * };
 * ```
 */
export type TriggerFn<TArgs extends unknown[] = []> = (
  emit: () => void,
  ...args: TArgs
) => void | (() => void);

/**
 * A trigger can be either:
 * - A function: `(emit, ...args) => cleanup` - Effect runs when `emit()` is called
 * - An Observable: `{ on(listener): cleanup }` - Effect runs when observable emits
 *
 * @example Function trigger
 * ```ts
 * const trigger: Trigger = (emit) => {
 *   const id = setTimeout(emit, 1000);
 *   return () => clearTimeout(id);
 * };
 * ```
 *
 * @example Observable trigger (signal)
 * ```ts
 * const refreshSignal = signal<void>();
 * const trigger: Trigger = refreshSignal;  // Has .on() method
 * ```
 */
export type Trigger<TArgs extends any[] = []> = TriggerFn<TArgs> | Observable;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if a value is an Observable (has .on() method).
 *
 * Used to differentiate between function triggers and observable triggers.
 *
 * @param value - Value to check
 * @returns true if value has an `on` method (Observable pattern)
 */
function isObservable(value: unknown): value is Observable {
  return (
    typeof value === "object" &&
    value !== null &&
    "on" in value &&
    typeof (value as Observable).on === "function"
  );
}

/**
 * Internal entry storing a setup function with its optional trigger and args.
 *
 * @internal
 */
type SetupEntry = {
  /** The setup function to execute */
  fn: SetupFn;
  /** Optional trigger that controls when fn runs */
  trigger?: Trigger<any>;
  /** Optional args to pass to the trigger function */
  args?: unknown[];
};

// ============================================================================
// Setup Interface
// ============================================================================

/**
 * Setup builder interface for collecting and running effects with cleanup.
 *
 * ## Method Overview
 *
 * | Method | Description |
 * |--------|-------------|
 * | `add(fn)` | Add effect that runs immediately on `.run()` |
 * | `add(fn, trigger, ...args)` | Add effect that runs when trigger emits |
 * | `add([fn1, fn2, ...])` | Add multiple effects (all run immediately) |
 * | `run()` | Execute all effects and return cleanup |
 * | `run(trigger, ...args)` | Gate all effects behind a global trigger |
 */
export interface Setup {
  /**
   * Add a single setup function (runs immediately on `.run()`).
   *
   * The setup function is executed when `.run()` is called. If it returns
   * a cleanup function, that function is called when the returned stop
   * function is invoked.
   *
   * @param fn - Setup function that optionally returns cleanup
   * @returns this (for chaining)
   *
   * @example Basic effect
   * ```ts
   * setup().add(() => {
   *   console.log("Effect started");
   * }).run();
   * ```
   *
   * @example Effect with cleanup
   * ```ts
   * setup().add(() => {
   *   const id = setInterval(tick, 1000);
   *   return () => clearInterval(id);  // Cleanup
   * }).run();
   * ```
   */
  add(fn: SetupFn): Setup;

  /**
   * Add a setup function with a trigger (runs when trigger emits).
   *
   * The effect waits until the trigger fires before executing. Triggers
   * can be either:
   * - **Function trigger**: `(emit, ...args) => cleanup`
   * - **Observable trigger**: `{ on(listener): cleanup }` (e.g., signals)
   *
   * @param fn - Setup function that optionally returns cleanup
   * @param trigger - Trigger function or Observable that controls when fn runs
   * @param args - Additional arguments to pass to the trigger function
   * @returns this (for chaining)
   *
   * @example Function trigger (timeout)
   * ```ts
   * setup().add(startGame, (emit) => {
   *   const id = setTimeout(emit, 1000);  // Fire after 1s
   *   return () => clearTimeout(id);      // Cleanup on stop
   * }).run();
   * ```
   *
   * @example Function trigger with args (reusable)
   * ```ts
   * // Define reusable delay trigger
   * const delayTrigger = (emit: () => void, ms: number) => {
   *   const id = setTimeout(emit, ms);
   *   return () => clearTimeout(id);
   * };
   *
   * setup()
   *   .add(step1, delayTrigger, 100)   // 100ms delay
   *   .add(step2, delayTrigger, 200)   // 200ms delay
   *   .add(step3, delayTrigger, 300)   // 300ms delay
   *   .run();
   * ```
   *
   * @example Function trigger (event listener)
   * ```ts
   * setup().add(handleClick, (emit) => {
   *   document.addEventListener("click", emit, { once: true });
   *   return () => document.removeEventListener("click", emit);
   * }).run();
   * ```
   *
   * @example Observable trigger (signal)
   * ```ts
   * const refreshSignal = signal<void>();
   *
   * setup()
   *   .add(refreshData, refreshSignal)  // Runs when signal emits
   *   .run();
   *
   * // Later: trigger the effect
   * refreshSignal.set();
   * ```
   */
  add<TArgs extends any[]>(
    fn: SetupFn,
    trigger: Trigger<TArgs>,
    ...args: TArgs
  ): Setup;

  /**
   * Add multiple setup functions (all run immediately on `.run()`).
   *
   * Convenience method for adding multiple effects at once. All effects
   * run immediately when `.run()` is called (no trigger support).
   *
   * @param fns - Array of setup functions
   * @returns this (for chaining)
   *
   * @example
   * ```ts
   * setup()
   *   .add([startTimer, startSubscription, playMusic])
   *   .run();
   * ```
   */
  add(fns: SetupFn[]): Setup;

  /**
   * Run all added effects immediately.
   *
   * - Effects without triggers run immediately
   * - Effects with triggers wait for their trigger to emit
   *
   * @returns Cleanup function that disposes all effects and triggers
   *
   * @example
   * ```ts
   * const stop = setup()
   *   .add(startTimer)                    // Runs immediately
   *   .add(handleClick, clickTrigger)     // Waits for trigger
   *   .run();
   *
   * // Later: cleanup everything
   * stop();
   * ```
   */
  run(): () => void;

  /**
   * Run all added effects via a global trigger function.
   *
   * The global trigger gates ALL effects - nothing runs until the trigger
   * calls `emit()`. After the global trigger emits:
   * - Effects without per-effect triggers run immediately
   * - Effects with per-effect triggers wait for their own trigger
   *
   * @param trigger - Function that receives emit callback and optional args
   * @param args - Additional arguments to pass to the trigger function
   * @returns Cleanup function that cancels trigger and disposes effects
   *
   * @example Delay all effects by 1 second
   * ```ts
   * const stop = setup()
   *   .add(startGame)
   *   .add(playMusic)
   *   .run((emit) => {
   *     const id = setTimeout(emit, 1000);
   *     return () => clearTimeout(id);
   *   });
   * ```
   *
   * @example Global trigger with args
   * ```ts
   * const stop = setup()
   *   .add(startGame)
   *   .run((emit, delay: number) => {
   *     const id = setTimeout(emit, delay);
   *     return () => clearTimeout(id);
   *   }, 500);  // 500ms delay
   * ```
   */
  run<TArgs extends unknown[]>(
    trigger: TriggerFn<TArgs>,
    ...args: TArgs
  ): () => void;

  /**
   * Run all added effects via an Observable trigger.
   *
   * The Observable gates ALL effects - nothing runs until it emits.
   *
   * @param trigger - Observable that gates all effects (e.g., signal)
   * @returns Cleanup function that cancels trigger and disposes effects
   *
   * @example
   * ```ts
   * const startSignal = signal<void>();
   *
   * const stop = setup()
   *   .add(startGame)
   *   .add(playMusic)
   *   .run(startSignal);
   *
   * // Later: start everything
   * startSignal.set();
   * ```
   */
  run(trigger: Observable): () => void;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates a setup builder for collecting and running effects with cleanup.
 *
 * The setup builder uses a chainable API to collect effects and their
 * triggers, then executes them when `.run()` is called. Returns a cleanup
 * function that disposes all effects and unsubscribes from all triggers.
 *
 * @returns Setup builder instance
 *
 * @example Basic usage
 * ```ts
 * const stop = setup()
 *   .add(() => {
 *     const id = setInterval(tick, 1000);
 *     return () => clearInterval(id);
 *   })
 *   .run();
 *
 * // Cleanup
 * stop();
 * ```
 *
 * @example With triggers
 * ```ts
 * const stop = setup()
 *   .add(startTimer)                              // Immediate
 *   .add(handleClick, clickTrigger)               // Wait for trigger
 *   .add(handleDelay, delayTrigger, 100)          // Trigger with args
 *   .add(handleRefresh, refreshSignal)            // Observable trigger
 *   .run();
 * ```
 */
export function setup(): Setup {
  // Collected entries - each entry has a setup function and optional trigger
  const entries: SetupEntry[] = [];

  /**
   * Subscribe to a trigger (function or Observable) and return cleanup.
   *
   * For function triggers: calls the trigger with emit callback and args.
   * For observable triggers: subscribes using .on() method.
   *
   * @param trigger - Trigger function or Observable
   * @param emit - Callback to execute when trigger fires
   * @param args - Additional arguments to pass to function triggers
   * @returns Cleanup function or null if no cleanup needed
   */
  function subscribeTrigger(
    trigger: Trigger<any>,
    emit: () => void,
    args: unknown[] = []
  ): (() => void) | null {
    if (isObservable(trigger)) {
      // Observable trigger - use .on() method
      // Note: args are ignored for observables (they don't accept args)
      return trigger.on(emit);
    } else {
      // Function trigger - call with emit callback and spread args
      const result = trigger(emit, ...args);
      return typeof result === "function" ? result : null;
    }
  }

  /**
   * Run a single entry with optional trigger.
   *
   * If entry has a trigger:
   *   1. Subscribe to trigger with emit callback
   *   2. When trigger fires, execute effect (if not cancelled)
   *   3. Return cleanup that unsubscribes trigger and cleans up effect
   *
   * If entry has no trigger:
   *   1. Execute effect immediately
   *   2. Return cleanup that cleans up effect
   *
   * @param entry - The setup entry to run
   * @param cancelled - Function that returns true if setup was cancelled
   * @returns Cleanup function for this entry
   */
  function runEntry(entry: SetupEntry, cancelled: () => boolean): () => void {
    let effectCleanup: (() => void) | null = null;
    let triggerCleanup: (() => void) | null = null;

    if (entry.trigger) {
      // Effect has its own trigger - wait for it to emit
      const emit = () => {
        // Don't run effect if setup was cancelled (stop() called)
        if (cancelled()) return;

        // Execute the setup function
        const result = entry.fn();
        if (typeof result === "function") {
          effectCleanup = result;
        }
      };

      // Subscribe to trigger - it will call emit() when it fires
      triggerCleanup = subscribeTrigger(entry.trigger, emit, entry.args);
    } else {
      // No trigger - run effect immediately
      const result = entry.fn();
      if (typeof result === "function") {
        effectCleanup = result;
      }
    }

    // Return cleanup function for this entry
    return () => {
      triggerCleanup?.(); // Unsubscribe from trigger (if any)
      effectCleanup?.(); // Run effect's cleanup (if any)
    };
  }

  /**
   * Execute all collected entries and return combined cleanup.
   *
   * @param cancelled - Function that returns true if setup was cancelled
   * @returns Combined cleanup function for all entries
   */
  function runAllEntries(cancelled: () => boolean): () => void {
    // Run each entry and collect their cleanup functions
    const cleanups = entries.map((entry) => runEntry(entry, cancelled));

    // Return combined cleanup
    return () => cleanups.forEach((cleanup) => cleanup());
  }

  // ========================================
  // Builder object with chainable methods
  // ========================================

  const builder: Setup = {
    /**
     * Add implementation (handles all overloads).
     *
     * - Single function: add(fn) or add(fn, trigger, ...args)
     * - Array of functions: add([fn1, fn2, ...])
     */
    add(
      fnOrFns: SetupFn | SetupFn[],
      trigger?: Trigger<any>,
      ...args: unknown[]
    ): Setup {
      if (Array.isArray(fnOrFns)) {
        // Array of functions - all run immediately (no trigger support)
        for (const fn of fnOrFns) {
          entries.push({ fn });
        }
      } else {
        // Single function with optional trigger and args
        entries.push({ fn: fnOrFns, trigger, args });
      }
      return builder; // Return builder for chaining
    },

    /**
     * Run implementation (handles all overloads).
     *
     * - No args: run()
     * - Function trigger: run(trigger, ...args)
     * - Observable trigger: run(observable)
     */
    run<TArgs extends unknown[]>(
      globalTrigger?: TriggerFn<TArgs> | Observable,
      ...args: TArgs
    ): () => void {
      // Cancellation flag - set to true when stop() is called
      let cancelled = false;
      const isCancelled = () => cancelled;

      // ----------------------------------------
      // Case 1: No global trigger
      // Run all entries immediately (respecting per-effect triggers)
      // ----------------------------------------
      if (!globalTrigger) {
        const cleanup = runAllEntries(isCancelled);
        return () => {
          cancelled = true;
          cleanup();
        };
      }

      // ----------------------------------------
      // Case 2: Global trigger
      // Gate everything until global trigger emits
      // ----------------------------------------
      let entriesCleanup: (() => void) | null = null;
      let globalTriggerCleanup: (() => void) | null = null;

      // Emit callback that global trigger will call when it fires
      const emit = () => {
        if (cancelled) return; // Don't run if already stopped
        entriesCleanup = runAllEntries(isCancelled);
      };

      // Subscribe to global trigger
      if (isObservable(globalTrigger)) {
        // Observable trigger - subscribe using .on()
        globalTriggerCleanup = globalTrigger.on(emit);
      } else {
        // Function trigger - call with emit and args
        const result = globalTrigger(emit, ...args);
        if (typeof result === "function") {
          globalTriggerCleanup = result;
        }
      }

      // Return stop function
      return () => {
        cancelled = true;
        globalTriggerCleanup?.(); // Cleanup global trigger (e.g., clearTimeout)
        entriesCleanup?.(); // Cleanup entries (if they ran)
      };
    },
  };

  return builder;
}
