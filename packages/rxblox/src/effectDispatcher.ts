import noop from "lodash/noop";
import { emitter } from "./emitter";

import { Effect, EffectDispatcher } from "./types";
import { dispatcherToken, getDispatcher } from "./dispatcher";

/**
 * Dispatcher token for effect management.
 *
 * Use this to:
 * - Create entries: `effectToken(dispatcher)`
 * - Retrieve dispatcher: `getDispatcher(effectToken)`
 */
export const effectToken =
  dispatcherToken<EffectDispatcher>("effectDispatcher");

/**
 * Adds an effect to the current effect dispatcher.
 *
 * This is called by `effect()` to register newly created effects.
 * The dispatcher determines whether effects run immediately (default) or
 * are collected for later execution (e.g., in `blox` components).
 *
 * @param effect - The effect to add to the dispatcher
 * @returns A cleanup function that removes the effect from the dispatcher
 */
export function addEffect(effect: Effect): VoidFunction {
  const dispatcher = getDispatcher(effectToken) || globalEffectDispatcher();
  return dispatcher.add(effect);
}

/**
 * Creates the default effect dispatcher that runs effects immediately.
 *
 * This is the dispatcher used by default when effects are created outside
 * of a custom dispatcher context (e.g., outside of `blox` components).
 *
 * **Behavior**:
 * - `add()`: Runs the effect immediately and returns a no-op cleanup function
 * - `run()`: Returns a no-op cleanup function (effects already ran)
 * - `clear()`: Does nothing (no effects to clear)
 *
 * @returns A default effect dispatcher that runs effects immediately
 */
export function globalEffectDispatcher(): EffectDispatcher {
  return {
    /**
     * Adds an effect and runs it immediately.
     *
     * This is the default behavior - effects run as soon as they're created.
     * Returns a no-op cleanup function since the effect has already run.
     *
     * @param effect - The effect to run
     * @returns A no-op cleanup function
     */
    add(effect: Effect): VoidFunction {
      effect.run();
      return noop;
    },
    /**
     * Returns a no-op cleanup function.
     *
     * Since effects run immediately in the default dispatcher,
     * there's nothing to run here.
     *
     * @returns A no-op cleanup function
     */
    run(): VoidFunction {
      return noop;
    },
    /**
     * Does nothing.
     *
     * The default dispatcher doesn't maintain a collection of effects,
     * so there's nothing to clear.
     */
    clear(): void {},
  };
}

/**
 * Creates a new effect dispatcher that collects effects for later execution.
 *
 * Unlike the default dispatcher, this dispatcher:
 * - Collects effects in a Set when `add()` is called (doesn't run them immediately)
 * - Runs all collected effects when `run()` is called
 * - Returns cleanup functions from `run()` that stop all effects
 * - Can clear all collected effects with `clear()`
 *
 * This is used by `blox` components to collect effects during render
 * and run them in `useLayoutEffect`.
 *
 * @returns A new effect dispatcher that collects effects
 *
 * @example
 * ```ts
 * import { withDispatchers, effectToken } from "./dispatcher";
 *
 * const dispatcher = localEffectDispatcher();
 *
 * // Collect effects (don't run them yet)
 * withDispatchers([effectToken(dispatcher)], () => {
 *   effect(() => console.log("effect 1"));
 *   effect(() => console.log("effect 2"));
 * });
 *
 * // Run all collected effects
 * const cleanup = dispatcher.run();
 *
 * // Stop all effects
 * cleanup();
 * ```
 */
export function localEffectDispatcher(): EffectDispatcher {
  /**
   * Set of effects that have been added to this dispatcher.
   * Using a Set ensures each effect is only stored once.
   */
  const effects = new Set<Effect>();

  return {
    /**
     * Adds an effect to the dispatcher's collection.
     *
     * The effect is not run immediately - it's stored for later execution
     * when `run()` is called.
     *
     * @param effect - The effect to add
     * @returns A cleanup function that removes the effect from the collection
     */
    add(effect: Effect): VoidFunction {
      effects.add(effect);
      return () => effects.delete(effect);
    },
    /**
     * Runs all collected effects and returns a cleanup function.
     *
     * This method:
     * 1. Runs each effect in the collection
     * 2. Collects cleanup functions returned by each effect
     * 3. Returns a single cleanup function that calls all individual cleanups
     *
     * @returns A cleanup function that stops all effects
     */
    run(): VoidFunction {
      const onStop = emitter();
      // Run each effect and collect its cleanup function
      for (const effect of effects) {
        onStop.on(effect.run());
      }
      // Return a function that calls all cleanup functions
      return onStop.emit;
    },
    /**
     * Clears all collected effects from the dispatcher.
     *
     * After calling `clear()`, the dispatcher will have no effects to run.
     * Note: This doesn't stop already-running effects - use `run()`'s return
     * value for that.
     */
    clear(): void {
      effects.clear();
    },
  };
}
