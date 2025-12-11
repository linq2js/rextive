/**
 * @file setup.ts
 * @description Setup utility for collecting and running effects with cleanup.
 *
 * Provides a chainable builder pattern for managing setup/teardown lifecycles.
 * Effects are collected via `.add()` and executed via `.run()`, which returns
 * a cleanup function that disposes all effects.
 *
 * @example Basic usage
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
 * @example Delayed/triggered run
 * ```ts
 * // Run after 100ms delay
 * const stop = setup()
 *   .add(startTimer)
 *   .run((emit) => {
 *     const id = setTimeout(emit, 100);
 *     return () => clearTimeout(id);
 *   });
 *
 * // Run on next animation frame
 * const stop = setup()
 *   .add(startAnimation)
 *   .run((emit) => requestAnimationFrame(emit));
 *
 * // Run on click (once)
 * const stop = setup()
 *   .add(handleClick)
 *   .run((emit) => {
 *     document.addEventListener("click", emit, { once: true });
 *     return () => document.removeEventListener("click", emit);
 *   });
 * ```
 *
 * @example Inline in logic
 * ```ts
 * function gameLogic() {
 *   return {
 *     dispose: setup()
 *       .add(startTimer)
 *       .add([startSubscription, playMusic])
 *       .run(),
 *   };
 * }
 * ```
 */

/**
 * A setup function that optionally returns a cleanup function.
 */
export type SetupFn = () => (() => void) | void;

/**
 * A trigger function that controls when effects run.
 * Can optionally return a cleanup function (e.g., for clearTimeout, removeEventListener).
 *
 * @param emit - Call this to execute the effects
 * @param args - Additional arguments passed from `.run(trigger, ...args)`
 */
export type TriggerFn<TArgs extends unknown[]> = (
  emit: () => void,
  ...args: TArgs
) => void | (() => void);

/**
 * Setup builder interface.
 */
export interface Setup {
  /**
   * Add a single setup function.
   *
   * @param fn - Setup function that optionally returns cleanup
   * @returns this (for chaining)
   *
   * @example
   * ```ts
   * setup().add(() => {
   *   const id = setInterval(tick, 1000);
   *   return () => clearInterval(id);
   * })
   * ```
   */
  add(fn: SetupFn): Setup;

  /**
   * Add multiple setup functions.
   *
   * @param fns - Array of setup functions
   * @returns this (for chaining)
   *
   * @example
   * ```ts
   * setup().add([startTimer, startSubscription, playMusic])
   * ```
   */
  add(fns: SetupFn[]): Setup;

  /**
   * Run all added effects immediately.
   *
   * @returns Cleanup function that disposes all effects
   *
   * @example
   * ```ts
   * const stop = setup().add(startTimer).run();
   * // Later:
   * stop();
   * ```
   */
  run(): () => void;

  /**
   * Run all added effects via a trigger function.
   *
   * The trigger controls when effects execute by calling `emit`.
   * Trigger can return a cleanup function for its own resources.
   *
   * @param trigger - Function that receives emit callback
   * @returns Cleanup function that cancels trigger and disposes effects
   *
   * @example setTimeout
   * ```ts
   * const stop = setup()
   *   .add(startGame)
   *   .run((emit) => {
   *     const id = setTimeout(emit, 1000);
   *     return () => clearTimeout(id);
   *   });
   * ```
   *
   * @example Event listener
   * ```ts
   * const stop = setup()
   *   .add(handleClick)
   *   .run((emit) => {
   *     document.addEventListener("click", emit, { once: true });
   *     return () => document.removeEventListener("click", emit);
   *   });
   * ```
   */
  run<TArgs extends unknown[]>(
    trigger: TriggerFn<TArgs>,
    ...args: TArgs
  ): () => void;
}

/**
 * Creates a setup builder for collecting and running effects with cleanup.
 *
 * @returns Setup builder instance
 *
 * @example
 * ```ts
 * // Immediate run
 * const stop = setup()
 *   .add(() => {
 *     const id = setInterval(tick, 1000);
 *     return () => clearInterval(id);
 *   })
 *   .add(() => signal.on(handleChange))
 *   .run();
 *
 * // Delayed run
 * const stop = setup()
 *   .add(startGame)
 *   .run((emit) => {
 *     const id = setTimeout(emit, 500);
 *     return () => clearTimeout(id);
 *   });
 *
 * // Cleanup
 * stop();
 * ```
 */
export function setup(): Setup {
  const fns: SetupFn[] = [];

  /**
   * Execute all collected effects and return combined cleanup.
   */
  function runEffects(): () => void {
    const cleanups = fns
      .map((fn) => fn())
      .filter((c): c is () => void => typeof c === "function");

    return () => cleanups.forEach((c) => c());
  }

  const builder: Setup = {
    // Overloaded add implementation
    add(fnOrFns: SetupFn | SetupFn[]): Setup {
      if (Array.isArray(fnOrFns)) {
        fns.push(...fnOrFns);
      } else {
        fns.push(fnOrFns);
      }
      return builder;
    },

    // Overloaded run implementation
    run<TArgs extends unknown[]>(
      trigger?: TriggerFn<TArgs>,
      ...args: TArgs
    ): () => void {
      // Immediate run (no trigger)
      if (!trigger) {
        return runEffects();
      }

      // Triggered run
      let effectsCleanup: (() => void) | null = null;
      let triggerCleanup: (() => void) | null = null;
      let cancelled = false;

      // Emit callback that trigger will call
      const emit = () => {
        if (cancelled) return;
        effectsCleanup = runEffects();
      };

      // Call trigger, which may return cleanup
      const result = trigger(emit, ...args);
      if (typeof result === "function") {
        triggerCleanup = result;
      }

      // Return stop function
      return () => {
        cancelled = true;
        triggerCleanup?.(); // Cleanup trigger (e.g., clearTimeout)
        effectsCleanup?.(); // Cleanup effects (if they ran)
      };
    },
  };

  return builder;
}

