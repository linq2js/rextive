import { dispatcherToken, withDispatchers } from "./dispatcher";
import { emitter, Emitter } from "./emitter";

/**
 * Type alias for a disposable dispatcher, which is essentially an emitter
 * that can be used to trigger cleanup when resources need to be disposed.
 */
export type DisposableDispatcher = Emitter;

/**
 * Dispatcher token for the disposable dispatcher.
 * This token is used to provide a disposable dispatcher context
 * that can be accessed within reactive computations.
 */
export const disposableToken = dispatcherToken<DisposableDispatcher>(
  "disposableDispatcher"
);

/**
 * Creates a disposable computation that returns both the result and a cleanup function.
 *
 * This function executes the provided function within a disposable dispatcher context,
 * allowing any code within the function to register cleanup callbacks by accessing
 * the disposable dispatcher. The returned cleanup function will trigger all registered
 * cleanup callbacks when called.
 *
 * @param fn - The function to execute within the disposable context
 * @returns A tuple containing [result, cleanup] where:
 *   - result: The return value of the executed function
 *   - cleanup: A function that triggers all registered cleanup callbacks
 *
 * @example
 * ```ts
 * const [value, cleanup] = disposable(() => {
 *   // Any cleanup logic registered here will be called when cleanup() is invoked
 *   return someComputation();
 * });
 *
 * // Later, when you want to clean up:
 * cleanup();
 * ```
 */
export function disposable<T>(fn: () => T): [T, VoidFunction] {
  const e = emitter();
  const result = withDispatchers([disposableToken(e)], fn);
  return [result, e.emit];
}
