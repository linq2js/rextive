import { is } from "../is";

/**
 * Resolves a factory function from either a plain factory or a Logic.
 *
 * - If input is a concrete Logic, returns its `.create()` method
 * - If input is an AbstractLogic (no `.create()`), throws an error
 * - Otherwise returns the input as-is
 *
 * @param factoryOrLogic - Either a factory function or a Logic
 * @returns A factory function that creates the instance
 * @throws Error if an abstract logic is passed (no implementation provided)
 *
 * @example
 * ```ts
 * // With a logic
 * const factory = resolveLogicFactory(counterLogic);
 * const instance = factory(); // Creates instance via .create()
 *
 * // With a plain factory
 * const factory = resolveLogicFactory(() => ({ count: signal(0) }));
 * const instance = factory(); // Calls the factory directly
 * ```
 */
export function resolveLogicFactory<T>(factoryOrLogic: () => T): () => T {
  if (is(factoryOrLogic, "logic")) {
    const logic = factoryOrLogic;
    if ("create" in logic) {
      return logic.create as () => T;
    } else {
      throw new Error(
        `Cannot create instance from abstract logic "${logic.displayName}" - use logic.provide() to supply an implementation`
      );
    }
  }
  return factoryOrLogic as () => T;
}
